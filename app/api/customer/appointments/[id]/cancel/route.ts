import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verifyAccessToken } from '@/lib/auth/tokens';
import { getDbClient } from '@/db/client';
import { OwnerNotificationService } from '@/lib/notifications/owner-notification-service';
import { NotificationService } from '@/lib/notifications/notification-service';
import { v4 as uuidv4 } from 'uuid';

const sql = neon(process.env.DATABASE_URL!);

/**
 * POST /api/customer/appointments/[id]/cancel
 *
 * Cancel a confirmed appointment. Creates an audit log entry.
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

    // Fetch appointment with business and customer details
    const [appointment] = await sql`
      SELECT
        a.id,
        a.customer_id,
        a.business_id,
        a.status,
        a.slot_start,
        a.slot_end,
        a.booking_id,
        u.name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone
      FROM appointments a
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
        { error: 'You do not have permission to cancel this appointment' },
        { status: 403 }
      );
    }

    // Check if appointment can be canceled
    if (appointment.status !== 'confirmed') {
      return NextResponse.json(
        { error: `Cannot cancel appointment with status: ${appointment.status}` },
        { status: 400 }
      );
    }

    // TODO: Check cancellation policy deadline here
    // For now, allow all cancellations

    // Update appointment status
    await sql`
      UPDATE appointments
      SET
        status = 'canceled',
        updated_at = NOW()
      WHERE id = ${appointmentId}
    `;

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
        'canceled',
        ${JSON.stringify({ status: 'confirmed', customer_id: customerId })},
        ${JSON.stringify({ status: 'canceled', canceled_by: 'customer', customer_id: customerId })},
        NOW()
      )
    `;

    // Send notification to business owner
    try {
      const db = getDbClient();
      const ownerNotificationService = new OwnerNotificationService(db);
      await ownerNotificationService.notifyOwnerOfCancellation(
        appointment.business_id,
        appointmentId,
        appointment.booking_id,
        appointment.customer_name,
        appointment.slot_start
      );
    } catch (error) {
      console.error('Failed to send owner notification:', error);
      // Don't fail the request if notification fails
    }

    // Queue email confirmation to customer
    try {
      const db = getDbClient();
      const notificationService = new NotificationService(db);
      if (appointment.customer_email) {
        await notificationService.queueCancellationNotification(
          appointmentId,
          appointment.customer_email,
          appointment.customer_phone
        );
      }
    } catch (error) {
      console.error('Failed to queue customer notification:', error);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment canceled successfully',
    });
  } catch (error) {
    console.error('Customer appointment cancellation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
