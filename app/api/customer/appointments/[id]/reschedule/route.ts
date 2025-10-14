import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verifyAccessToken } from '@/lib/auth/tokens';
import { loadConfigBySubdomain } from '@/lib/config/config-loader';
import { generateTimeSlots } from '@/lib/booking/slot-generator';
import { getDbClient } from '@/db/client';
import { OwnerNotificationService } from '@/lib/notifications/owner-notification-service';
import { NotificationService } from '@/lib/notifications/notification-service';
import { CustomerNotificationService } from '@/lib/email/customer-notification-service';
import { v4 as uuidv4 } from 'uuid';

const sql = neon(process.env.DATABASE_URL!);

/**
 * POST /api/customer/appointments/[id]/reschedule
 *
 * Reschedule a confirmed appointment to a new time slot.
 *
 * Unified flow for both authenticated customers (JWT) and guests (future: guest token).
 *
 * Request body:
 * {
 *   "newSlotStart": "2025-10-16T10:00:00Z",
 *   "newSlotEnd": "2025-10-16T11:00:00Z"
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id;

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify JWT
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Verify user is a customer
    if (payload.role !== 'customer') {
      return NextResponse.json(
        { error: 'This endpoint is for customers only' },
        { status: 403 }
      );
    }

    const customerId = payload.sub;

    // Parse request body
    const body = await request.json();
    const { newSlotStart, newSlotEnd } = body;

    if (!newSlotStart || !newSlotEnd) {
      return NextResponse.json(
        { error: 'Missing required fields: newSlotStart, newSlotEnd' },
        { status: 400 }
      );
    }

    // Validate date formats
    const newStart = new Date(newSlotStart);
    const newEnd = new Date(newSlotEnd);

    if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format for newSlotStart or newSlotEnd' },
        { status: 400 }
      );
    }

    if (newEnd <= newStart) {
      return NextResponse.json(
        { error: 'newSlotEnd must be after newSlotStart' },
        { status: 400 }
      );
    }

    // Fetch current appointment with business, service, and customer details
    const [appointment] = await sql`
      SELECT
        a.id,
        a.customer_id,
        a.status,
        a.slot_start,
        a.slot_end,
        a.booking_id,
        a.updated_at,
        a.business_id,
        a.service_id,
        b.subdomain,
        b.timezone as business_timezone,
        s.duration_minutes,
        s.external_id as service_external_id,
        s.name as service_name,
        s.price_cents,
        u.name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone
      FROM appointments a
      JOIN businesses b ON a.business_id = b.id
      JOIN services s ON a.service_id = s.id
      LEFT JOIN users u ON a.customer_id = u.id
      WHERE a.id = ${appointmentId}
        AND a.deleted_at IS NULL
    `;

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Verify customer owns this appointment
    if (appointment.customer_id !== customerId) {
      return NextResponse.json(
        { error: 'You do not have permission to reschedule this appointment' },
        { status: 403 }
      );
    }

    // Validate appointment status
    if (appointment.status !== 'confirmed') {
      return NextResponse.json(
        { error: `Cannot reschedule appointment with status: ${appointment.status}` },
        { status: 400 }
      );
    }

    // Validate new time is in the future
    const now = new Date();
    if (newStart <= now) {
      return NextResponse.json(
        { error: 'Cannot reschedule to a time in the past' },
        { status: 400 }
      );
    }

    // Validate service duration matches
    const durationMinutes = Math.round((newEnd.getTime() - newStart.getTime()) / (1000 * 60));
    if (durationMinutes !== appointment.duration_minutes) {
      return NextResponse.json(
        { error: `Duration mismatch. Expected ${appointment.duration_minutes} minutes, got ${durationMinutes} minutes` },
        { status: 400 }
      );
    }

    // Load tenant config
    const configResult = await loadConfigBySubdomain(appointment.subdomain);
    if (!configResult.success || !configResult.config) {
      return NextResponse.json(
        { error: 'Business configuration not found' },
        { status: 404 }
      );
    }

    const config = configResult.config;

    // Find the service in config
    let serviceConfig = null;
    for (const category of config.categories) {
      const found = category.services.find(s => s.id === appointment.service_external_id);
      if (found) {
        serviceConfig = found;
        break;
      }
    }

    if (!serviceConfig) {
      return NextResponse.json(
        { error: 'Service configuration not found' },
        { status: 404 }
      );
    }

    // Check slot availability for the new time
    // We need to check if the new slot is available using the same logic as initial booking
    const existingAppointments = await sql`
      SELECT slot_start, slot_end
      FROM appointments
      WHERE business_id = ${appointment.business_id}
        AND slot_start >= ${new Date(newStart.getTime() - 24 * 60 * 60 * 1000).toISOString()}
        AND slot_start <= ${new Date(newStart.getTime() + 24 * 60 * 60 * 1000).toISOString()}
        AND status IN ('confirmed', 'completed')
        AND id != ${appointmentId}
        AND deleted_at IS NULL
    `;

    const activeReservations = await sql`
      SELECT slot_start, slot_end, expires_at
      FROM reservations
      WHERE business_id = ${appointment.business_id}
        AND slot_start >= ${new Date(newStart.getTime() - 24 * 60 * 60 * 1000).toISOString()}
        AND slot_start <= ${new Date(newStart.getTime() + 24 * 60 * 60 * 1000).toISOString()}
        AND expires_at > ${now.toISOString()}
    `;

    // Generate slots for the target day to validate availability
    const slots = generateTimeSlots({
      config,
      service: serviceConfig,
      startDate: new Date(newStart.toISOString().split('T')[0] + 'T00:00:00'),
      endDate: new Date(newStart.toISOString().split('T')[0] + 'T23:59:59'),
      existingAppointments: existingAppointments.map(a => ({
        slot_start: a.slot_start,
        slot_end: a.slot_end,
      })),
      existingReservations: activeReservations.map(r => ({
        slot_start: r.slot_start,
        slot_end: r.slot_end,
        expires_at: r.expires_at,
      })),
    });

    // Find the requested slot
    const requestedSlot = slots.find(
      s => new Date(s.start).getTime() === newStart.getTime()
    );

    if (!requestedSlot) {
      return NextResponse.json(
        { error: 'Requested time slot is not available (outside business hours or beyond booking window)' },
        { status: 400 }
      );
    }

    if (!requestedSlot.available) {
      return NextResponse.json(
        { error: requestedSlot.reason || 'Requested time slot is fully booked' },
        { status: 400 }
      );
    }

    // TODO: Check cancellation/reschedule policy deadline
    // For now, allow all reschedules

    // Perform atomic update
    // 1. Update appointment with new times
    // 2. Create audit log entry
    // Note: We check status instead of updated_at to avoid timestamp precision issues
    // Status check ensures appointment hasn't been canceled/modified to invalid state

    const updateResult = await sql`
      UPDATE appointments
      SET
        slot_start = ${newSlotStart},
        slot_end = ${newSlotEnd},
        updated_at = NOW()
      WHERE id = ${appointmentId}
        AND status = 'confirmed'
        AND deleted_at IS NULL
      RETURNING id
    `;

    if (updateResult.length === 0) {
      return NextResponse.json(
        { error: 'Appointment is no longer available for rescheduling. It may have been canceled or modified.' },
        { status: 409 }
      );
    }

    // Create audit log entry
    await sql`
      INSERT INTO audit_logs (
        id,
        appointment_id,
        actor_id,
        action,
        old_state,
        new_state,
        timestamp
      ) VALUES (
        ${uuidv4()},
        ${appointmentId},
        ${customerId},
        'modified',
        ${JSON.stringify({
          slot_start: appointment.slot_start,
          slot_end: appointment.slot_end,
          modified_by: 'customer',
          reason: 'rescheduled',
        })},
        ${JSON.stringify({
          slot_start: newSlotStart,
          slot_end: newSlotEnd,
          modified_by: 'customer',
          reason: 'rescheduled',
        })},
        NOW()
      )
    `;

    // Send notification to business owner
    try {
      const db = getDbClient();
      const ownerNotificationService = new OwnerNotificationService(db);
      await ownerNotificationService.notifyOwnerOfReschedule(
        appointment.business_id,
        appointmentId,
        appointment.booking_id,
        appointment.customer_name,
        appointment.slot_start,
        newSlotStart
      );
    } catch (error) {
      console.error('Failed to send owner notification:', error);
      // Don't fail the request if notification fails
    }

    // Queue in-app notification (for notification_logs table - step 7t)
    try {
      const db = getDbClient();
      const notificationService = new NotificationService(db);
      if (appointment.customer_email) {
        await notificationService.queueRescheduleNotification(
          appointmentId,
          appointment.customer_email,
          appointment.customer_phone
        );
      }
    } catch (error) {
      console.error('Failed to queue in-app notification:', error);
      // Don't fail the request if notification queueing fails
    }

    // Send reschedule confirmation email to customer (step 7u - immediate delivery)
    const customerNotificationService = new CustomerNotificationService(getDbClient());
    if (appointment.customer_email) {
      customerNotificationService
        .sendRescheduleConfirmation(
          {
            id: appointmentId,
            businessId: appointment.business_id,
            serviceId: appointment.service_id,
            customerId: appointment.customer_id,
            slotStart: new Date(newSlotStart),
            slotEnd: new Date(newSlotEnd),
            status: 'confirmed',
            bookingId: appointment.booking_id,
          },
          new Date(appointment.slot_start),
          new Date(appointment.slot_end)
        )
        .catch((error) => {
          console.error('Failed to send reschedule confirmation email:', error);
          // Don't block reschedule on email failure
        });
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      appointment: {
        id: appointmentId,
        bookingId: appointment.booking_id,
        newSlotStart,
        newSlotEnd,
      },
    });
  } catch (error) {
    console.error('Customer appointment reschedule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
