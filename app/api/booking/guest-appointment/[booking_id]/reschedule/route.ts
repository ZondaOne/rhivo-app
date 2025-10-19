import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { createHash } from 'crypto';
import { loadConfigBySubdomain } from '@/lib/config/config-loader';
import { generateTimeSlots } from '@/lib/booking/slot-generator';
import { validateBookingTime, snapToGrain } from '@/lib/booking/validation';
import { getDbClient } from '@/db/client';
import { OwnerNotificationService } from '@/lib/notifications/owner-notification-service';
import { CustomerNotificationService } from '@/lib/email/customer-notification-service';
import { v4 as uuidv4 } from 'uuid';

const sql = neon(process.env.DATABASE_URL!);

/**
 * POST /api/booking/guest-appointment/[booking_id]/reschedule
 *
 * Reschedule a confirmed appointment using guest token authentication.
 * Mirrors the customer reschedule flow but uses guest_token_hash for auth.
 *
 * Request body:
 * {
 *   "token": "abc123...",
 *   "newSlotStart": "2025-10-16T10:00:00Z",
 *   "newSlotEnd": "2025-10-16T11:00:00Z"
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ booking_id: string }> }
) {
  try {
    const { booking_id } = await params;
    const bookingId = booking_id.toUpperCase();

    // Parse request body
    const body = await request.json();
    const { token, newSlotStart, newSlotEnd } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Missing guest access token' },
        { status: 401 }
      );
    }

    if (!newSlotStart || !newSlotEnd) {
      return NextResponse.json(
        { error: 'Missing required fields: newSlotStart, newSlotEnd' },
        { status: 400 }
      );
    }

    // Validate date formats and snap to 5-minute grain
    let newStart = new Date(newSlotStart);
    let newEnd = new Date(newSlotEnd);

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

    // Snap times to 5-minute grain for consistency
    newStart = snapToGrain(newStart);
    newEnd = snapToGrain(newEnd);

    // Hash the token for comparison
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Fetch appointment with guest token verification and buffer times
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
        a.guest_email,
        a.guest_phone,
        a.guest_token_hash,
        a.guest_token_expires_at,
        b.subdomain,
        b.timezone as business_timezone,
        s.duration_minutes,
        s.external_id as service_external_id,
        s.name as service_name,
        s.price_cents,
        s.buffer_before_minutes,
        s.buffer_after_minutes
      FROM appointments a
      JOIN businesses b ON a.business_id = b.id
      JOIN services s ON a.service_id = s.id
      WHERE a.booking_id = ${bookingId}
        AND a.deleted_at IS NULL
    `;

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Verify this is a guest booking (not customer booking)
    if (appointment.customer_id) {
      return NextResponse.json(
        { error: 'This endpoint is for guest bookings only. Please log in to reschedule.' },
        { status: 403 }
      );
    }

    // Verify guest token
    if (!appointment.guest_token_hash || appointment.guest_token_hash !== tokenHash) {
      return NextResponse.json(
        { error: 'Invalid access token' },
        { status: 401 }
      );
    }

    // Check token expiration (15 minutes)
    const tokenExpiresAt = new Date(appointment.guest_token_expires_at);
    const now = new Date();

    if (now > tokenExpiresAt) {
      return NextResponse.json(
        { error: 'Access token has expired. Please request a new access link.' },
        { status: 401 }
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

    // CRITICAL: Validate against off-time intervals (breaks, closed days, holidays)
    // This ensures guests cannot reschedule during breaks or closed hours
    const bufferBefore = appointment.buffer_before_minutes || 0;
    const bufferAfter = appointment.buffer_after_minutes || 0;

    const validation = validateBookingTime({
      config,
      slotStart: newStart,
      slotEnd: newEnd,
      bufferBefore,
      bufferAfter,
      skipAdvanceLimitCheck: false, // Guests must respect advance booking limits
      skipPastTimeCheck: false,
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.error,
          code: validation.code,
        },
        { status: 400 }
      );
    }

    // Check slot availability for the new time
    const existingAppointments = await sql`
      SELECT slot_start, slot_end
      FROM appointments
      WHERE business_id = ${appointment.business_id}
        AND slot_start >= ${new Date(newStart.getTime() - 24 * 60 * 60 * 1000).toISOString()}
        AND slot_start <= ${new Date(newStart.getTime() + 24 * 60 * 60 * 1000).toISOString()}
        AND status IN ('confirmed', 'completed')
        AND id != ${appointment.id}
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

    // Perform atomic update
    const updateResult = await sql`
      UPDATE appointments
      SET
        slot_start = ${newSlotStart},
        slot_end = ${newSlotEnd},
        updated_at = NOW()
      WHERE id = ${appointment.id}
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

    // Create audit log entry (actor_id is NULL for guest actions)
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
        ${appointment.id},
        NULL,
        'modified',
        ${JSON.stringify({
          slot_start: appointment.slot_start,
          slot_end: appointment.slot_end,
          modified_by: 'guest',
          reason: 'rescheduled',
        })},
        ${JSON.stringify({
          slot_start: newSlotStart,
          slot_end: newSlotEnd,
          modified_by: 'guest',
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
        appointment.id,
        appointment.booking_id,
        'Guest', // Guest bookings don't have customer name
        appointment.slot_start,
        newSlotStart
      );
    } catch (error) {
      console.error('Failed to send owner notification:', error);
      // Don't fail the request if notification fails
    }

    // Send reschedule confirmation email to guest
    const customerNotificationService = new CustomerNotificationService(getDbClient());
    if (appointment.guest_email) {
      customerNotificationService
        .sendRescheduleConfirmation(
          {
            id: appointment.id,
            businessId: appointment.business_id,
            serviceId: appointment.service_id,
            customerId: null,
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

    // Invalidate the guest token after successful reschedule (security best practice)
    await sql`
      UPDATE appointments
      SET
        guest_token_hash = NULL,
        guest_token_expires_at = NULL
      WHERE id = ${appointment.id}
    `;

    return NextResponse.json({
      success: true,
      message: 'Appointment rescheduled successfully. A confirmation email has been sent.',
      appointment: {
        id: appointment.id,
        bookingId: appointment.booking_id,
        newSlotStart,
        newSlotEnd,
      },
      // Note: Token is now invalid, user must request new access link for further changes
      tokenInvalidated: true,
    });
  } catch (error) {
    console.error('Guest appointment reschedule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
