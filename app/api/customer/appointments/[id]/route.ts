import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verifyAccessToken } from '@/lib/auth/tokens';

const sql = neon(process.env.DATABASE_URL!);

/**
 * GET /api/customer/appointments/[id]
 *
 * Get detailed information about a specific appointment.
 */
export async function GET(
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

    // Fetch appointment with business and service details
    const [appointment] = await sql`
      SELECT
        a.id,
        a.customer_id,
        a.booking_id,
        a.slot_start,
        a.slot_end,
        a.status,
        a.created_at,
        b.id as business_id,
        b.name as business_name,
        b.subdomain,
        b.timezone as business_timezone,
        s.id as service_id,
        s.name as service_name,
        s.duration_minutes,
        s.price_cents,
        s.color as service_color,
        c.name as category_name
      FROM appointments a
      JOIN businesses b ON a.business_id = b.id
      JOIN services s ON a.service_id = s.id
      JOIN categories c ON s.category_id = c.id
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
        { error: 'You do not have permission to view this appointment' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        bookingId: appointment.booking_id,
        startTime: appointment.slot_start,
        endTime: appointment.slot_end,
        status: appointment.status,
        createdAt: appointment.created_at,
        business: {
          id: appointment.business_id,
          name: appointment.business_name,
          subdomain: appointment.subdomain,
          timezone: appointment.business_timezone,
        },
        service: {
          id: appointment.service_id,
          name: appointment.service_name,
          categoryName: appointment.category_name,
          duration: appointment.duration_minutes,
          price: appointment.price_cents,
          color: appointment.service_color,
        },
      },
    });
  } catch (error) {
    console.error('Customer appointment details fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
