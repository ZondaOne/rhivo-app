import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDbClient } from '@/db/client';
import { AppointmentManager } from '@/lib/booking';
import { NotificationService } from '@/lib/notifications/notification-service';
import { CustomerNotificationService } from '@/lib/email/customer-notification-service';
import { loadConfigBySubdomain } from '@/lib/config/config-loader';
import { validateBookingTime, snapToGrain } from '@/lib/booking/validation';
import { z } from 'zod';

const sql = getDbClient();

const rescheduleSchema = z.object({
  appointmentId: z.string().uuid({ message: 'Invalid appointmentId' }),
  newStartTime: z.string().datetime({ message: 'newStartTime must be ISO datetime' }),
  serviceId: z.string().uuid().optional(),
  notifyCustomer: z.boolean().optional(),
  reason: z.string().max(250).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let payload: ReturnType<typeof verifyToken>;
    try {
      payload = verifyToken(token);
    } catch {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!payload || payload.role !== 'owner') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let body: z.infer<typeof rescheduleSchema>;

    try {
      body = rescheduleSchema.parse(await request.json());
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { message: 'Validation failed', errors: error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }

    // First fetch the appointment to get its business_id
    const appointmentRows = await sql`
      SELECT
        a.id,
        a.business_id,
        a.service_id,
        a.slot_start,
        a.slot_end,
        a.version,
        b.subdomain,
        s.external_id as service_external_id
      FROM appointments a
      JOIN businesses b ON a.business_id = b.id
      LEFT JOIN services s ON a.service_id = s.id
      WHERE a.id = ${body.appointmentId}
        AND a.deleted_at IS NULL
    `;

    if (appointmentRows.length === 0) {
      return NextResponse.json({ message: 'Appointment not found' }, { status: 404 });
    }

    const current = appointmentRows[0];

    // Verify user owns this business (multi-business support)
    const ownershipCheck = await sql`
      SELECT user_owns_business(${payload.sub}, ${current.business_id}) as owns_business
    `;

    if (!ownershipCheck[0]?.owns_business) {
      return NextResponse.json({ message: 'Appointment not found' }, { status: 404 });
    }

    const currentVersion = Number(current.version ?? 1);

    // Load tenant config to get maxSimultaneousBookings (YAML is single source of truth)
    const configResult = await loadConfigBySubdomain(current.subdomain);
    if (!configResult.success || !configResult.config) {
      return NextResponse.json(
        { message: 'Business configuration not found' },
        { status: 500 }
      );
    }

    const config = configResult.config;

    // Helper function to get maxSimultaneousBookings from config
    const getMaxSimultaneousBookings = (serviceExternalId: string | null): number => {
      if (!serviceExternalId) {
        return config.bookingLimits.maxSimultaneousBookings;
      }

      // Find service in config by external_id
      for (const category of config.categories) {
        const service = category.services.find(s => s.id === serviceExternalId);
        if (service) {
          // Use per-service capacity if defined, otherwise fall back to business-level
          return service.maxSimultaneousBookings ?? config.bookingLimits.maxSimultaneousBookings;
        }
      }

      // Fallback to business-level if service not found in config
      return config.bookingLimits.maxSimultaneousBookings;
    };

    // Determine duration: if service is changing, get new service's duration; otherwise use existing duration
    let durationMinutes: number;
    let serviceIdToUse = current.service_id;
    let serviceExternalIdToUse = current.service_external_id;
    let bufferBefore = 0;
    let bufferAfter = 0;

    if (body.serviceId && body.serviceId !== current.service_id) {
      // Service is changing - get new service's duration, external_id, and buffers
      const newServiceRows = await sql`
        SELECT duration_minutes, external_id, buffer_before_minutes, buffer_after_minutes
        FROM services
        WHERE id = ${body.serviceId}
          AND business_id = ${current.business_id}
          AND deleted_at IS NULL
      `;

      if (newServiceRows.length === 0) {
        return NextResponse.json({ message: 'Service not found' }, { status: 404 });
      }

      durationMinutes = newServiceRows[0].duration_minutes;
      serviceIdToUse = body.serviceId;
      serviceExternalIdToUse = newServiceRows[0].external_id;
      bufferBefore = newServiceRows[0].buffer_before_minutes || 0;
      bufferAfter = newServiceRows[0].buffer_after_minutes || 0;
    } else {
      // Service not changing - use existing duration and get buffers
      durationMinutes = Math.floor(
        (new Date(current.slot_end).getTime() - new Date(current.slot_start).getTime()) / (1000 * 60)
      );

      // Get current service buffers
      const currentServiceRows = await sql`
        SELECT buffer_before_minutes, buffer_after_minutes
        FROM services
        WHERE id = ${current.service_id}
          AND deleted_at IS NULL
        LIMIT 1
      `;

      if (currentServiceRows.length > 0) {
        bufferBefore = currentServiceRows[0].buffer_before_minutes || 0;
        bufferAfter = currentServiceRows[0].buffer_after_minutes || 0;
      }
    }

    let newStart = new Date(body.newStartTime);
    if (Number.isNaN(newStart.getTime())) {
      return NextResponse.json({ message: 'Invalid newStartTime' }, { status: 400 });
    }

    // Snap times to 5-minute grain for consistency
    newStart = snapToGrain(newStart);
    const newEnd = new Date(newStart.getTime() + durationMinutes * 60 * 1000);

    const appointmentManager = new AppointmentManager(sql);
    const notificationService = new NotificationService(sql);
    const customerNotificationService = new CustomerNotificationService(sql);

    // Store old slot times for email notification
    const oldSlotStart = new Date(current.slot_start);
    const oldSlotEnd = new Date(current.slot_end);

    // Determine which service's capacity to use (new service if changing, otherwise current)
    const targetServiceExternalId = body.serviceId && body.serviceId !== current.service_id
      ? serviceExternalIdToUse
      : current.service_external_id;

    // Get maxSimultaneousBookings from YAML config (single source of truth)
    const maxSimultaneousBookings = getMaxSimultaneousBookings(targetServiceExternalId);

    // CRITICAL: Validate against off-time intervals (breaks, closed days, holidays)
    // This enforces the same rules as customer booking and manual appointment creation
    const validation = validateBookingTime({
      config,
      slotStart: newStart,
      slotEnd: newEnd,
      bufferBefore,
      bufferAfter,
      skipAdvanceLimitCheck: true, // Owners can reschedule to any future date
      skipPastTimeCheck: false, // 5-minute grace period is in validateBookingTime
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          message: validation.error,
          code: validation.code,
        },
        { status: 400 }
      );
    }

    let appointmentWithDetails;

    try {
      await appointmentManager.updateAppointment({
        appointmentId: body.appointmentId,
        slotStart: newStart,
        slotEnd: newEnd,
        serviceId: body.serviceId && body.serviceId !== current.service_id ? serviceIdToUse : undefined,
        actorId: payload.sub,
        expectedVersion: currentVersion,
        maxSimultaneousBookings, // Pass YAML config value
      });

      // Queue notification to customer
      // Get customer email/phone from appointment (join with users table for registered customers)
      appointmentWithDetails = await sql`
        SELECT
          a.id,
          a.service_id,
          s.name AS service_name,
          a.slot_start,
          a.slot_end,
          a.status,
          a.version,
          a.created_at,
          a.updated_at,
          a.guest_email,
          a.guest_phone,
          u.name AS customer_name,
          u.email AS customer_email,
          u.phone AS customer_phone
        FROM appointments a
        LEFT JOIN services s ON s.id = a.service_id
        LEFT JOIN users u ON a.customer_id = u.id
        WHERE a.id = ${body.appointmentId}
          AND a.deleted_at IS NULL
      `;

      if (appointmentWithDetails.length > 0) {
        const apt = appointmentWithDetails[0];
        const email = apt.customer_email || apt.guest_email;
        const phone = apt.customer_phone || apt.guest_phone;

        if (email && body.notifyCustomer !== false) {
          // Send in-app notification
          await notificationService.queueRescheduleNotification(
            body.appointmentId,
            email,
            phone || undefined
          );

          // Send email notification (non-blocking)
          console.log('📧 Triggering reschedule confirmation email:', {
            appointmentId: body.appointmentId,
            email,
          });

          customerNotificationService
            .sendRescheduleConfirmation(
              {
                id: body.appointmentId,
                businessId: current.business_id,
                serviceId: apt.service_id,
                customerId: undefined, // Will be fetched from DB in the service
                guestEmail: apt.guest_email || undefined,
                guestPhone: apt.guest_phone || undefined,
                guestName: apt.customer_name || undefined,
                slotStart: new Date(apt.slot_start),
                slotEnd: new Date(apt.slot_end),
                status: apt.status,
              },
              oldSlotStart,
              oldSlotEnd
            )
            .then(() => {
              console.log('✅ Reschedule confirmation email sent successfully');
            })
            .catch((error) => {
              console.error('❌ Failed to send reschedule confirmation email:', error);
              // Don't block reschedule on email failure
            });
        }
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'CONFLICT') {
        return NextResponse.json(
          {
            message: 'Appointment has been modified, please refresh and try again',
            code: 'CONFLICT'
          },
          { status: 409 }
        );
      }

      if (error instanceof Error && error.message.includes('No available capacity')) {
        return NextResponse.json(
          {
            message: `This time slot is fully booked (maximum ${maxSimultaneousBookings} bookings reached). Please choose another time.`,
            code: 'MAX_SIMULTANEOUS_BOOKINGS_REACHED'
          },
          { status: 409 }
        );
      }

      if (error instanceof Error && error.message.includes('outside business hours')) {
        return NextResponse.json(
          {
            message: 'This time is outside of business hours. Please choose a time during operating hours.',
            code: 'OUTSIDE_BUSINESS_HOURS'
          },
          { status: 400 }
        );
      }

      console.error('Reschedule error:', error);
      return NextResponse.json(
        {
          message: 'Failed to reschedule appointment. Please try again.',
          code: 'RESCHEDULE_FAILED'
        },
        { status: 500 }
      );
    }

    // Return the updated appointment in the same format as GET /api/appointments
    if (appointmentWithDetails && appointmentWithDetails.length > 0) {
      const row = appointmentWithDetails[0];
      const slotStart = new Date(row.slot_start);
      const slotEnd = new Date(row.slot_end);
      const durationMinutes = Math.max(5, Math.round((slotEnd.getTime() - slotStart.getTime()) / (1000 * 60)));

      const STATUS_DB_TO_UI: Record<string, string> = {
        confirmed: 'confirmed',
        completed: 'completed',
        canceled: 'cancelled',
        no_show: 'no_show',
      };

      return NextResponse.json({
        success: true,
        appointment: {
          id: row.id,
          service_id: row.service_id,
          service_name: row.service_name,
          start_time: slotStart.toISOString(),
          end_time: slotEnd.toISOString(),
          duration: durationMinutes,
          status: STATUS_DB_TO_UI[row.status] ?? row.status,
          customer_name: row.customer_name ?? row.guest_email ?? 'Guest',
          customer_email: row.customer_email ?? row.guest_email ?? null,
          customer_phone: row.customer_phone ?? row.guest_phone ?? null,
          guest_email: row.guest_email ?? null,
          guest_phone: row.guest_phone ?? null,
          version: row.version ?? 1,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reschedule error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}