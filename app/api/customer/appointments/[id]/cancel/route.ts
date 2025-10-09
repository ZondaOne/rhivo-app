import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verifyAccessToken } from '@/lib/auth/tokens';
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

    // Fetch appointment
    const [appointment] = await sql`
      SELECT
        id,
        customer_id,
        status,
        slot_start,
        slot_end,
        booking_id
      FROM appointments
      WHERE id = ${appointmentId}
        AND deleted_at IS NULL
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

    // TODO: Send notification to business owner (implement in step 7s)
    // TODO: Send confirmation email to customer

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
