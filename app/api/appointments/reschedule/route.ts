import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDbClient } from '@/db/client';
import { AppointmentManager } from '@/lib/booking';
import { NotificationService } from '@/lib/notifications/notification-service';
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
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
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

    const appointmentRows = await sql`
      SELECT id, business_id, service_id, slot_start, slot_end, version
      FROM appointments
      WHERE id = ${body.appointmentId}
        AND business_id = ${payload.business_id}
        AND deleted_at IS NULL
    `;

    if (appointmentRows.length === 0) {
      return NextResponse.json({ message: 'Appointment not found' }, { status: 404 });
    }

    const current = appointmentRows[0];
    const currentVersion = Number(current.version ?? 1);

    // Determine duration: if service is changing, get new service's duration; otherwise use existing duration
    let durationMinutes: number;
    let serviceIdToUse = current.service_id;

    if (body.serviceId && body.serviceId !== current.service_id) {
      // Service is changing - get new service's duration
      const newServiceRows = await sql`
        SELECT duration_minutes
        FROM services
        WHERE id = ${body.serviceId}
          AND business_id = ${payload.business_id}
          AND deleted_at IS NULL
      `;

      if (newServiceRows.length === 0) {
        return NextResponse.json({ message: 'Service not found' }, { status: 404 });
      }

      durationMinutes = newServiceRows[0].duration_minutes;
      serviceIdToUse = body.serviceId;
    } else {
      // Service not changing - use existing duration
      durationMinutes = Math.floor(
        (new Date(current.slot_end).getTime() - new Date(current.slot_start).getTime()) / (1000 * 60)
      );
    }

    const newStart = new Date(body.newStartTime);
    if (Number.isNaN(newStart.getTime())) {
      return NextResponse.json({ message: 'Invalid newStartTime' }, { status: 400 });
    }

    if (newStart < new Date()) {
      return NextResponse.json({ message: 'Cannot reschedule into the past' }, { status: 400 });
    }

    const newEnd = new Date(newStart.getTime() + durationMinutes * 60 * 1000);

    const appointmentManager = new AppointmentManager(sql);
    const notificationService = new NotificationService(sql);

    let appointmentWithDetails;

    try {
      const updated = await appointmentManager.updateAppointment({
        appointmentId: body.appointmentId,
        slotStart: newStart,
        slotEnd: newEnd,
        serviceId: body.serviceId && body.serviceId !== current.service_id ? serviceIdToUse : undefined,
        actorId: payload.sub,
        expectedVersion: currentVersion,
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
          await notificationService.queueRescheduleNotification(
            body.appointmentId,
            email,
            phone || undefined
          );
        }
      }
    } catch (error: any) {
      if (error?.code === 'CONFLICT') {
        return NextResponse.json(
          { message: 'Appointment has been modified, please refresh and try again' },
          { status: 409 }
        );
      }

      if (error instanceof Error && error.message.includes('No available capacity')) {
        return NextResponse.json(
          { message: 'Selected time slot is fully booked' },
          { status: 409 }
        );
      }

      console.error('Reschedule error:', error);
      return NextResponse.json(
        { message: 'Failed to reschedule appointment' },
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