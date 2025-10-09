import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verifyAccessToken } from '@/lib/auth/tokens';

const sql = neon(process.env.DATABASE_URL!);

/**
 * GET /api/customer/appointments
 *
 * Fetch all appointments for the authenticated customer.
 * Supports filtering by status and upcoming/past appointments.
 */
export async function GET(request: NextRequest) {
  try {
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const statusFilter = searchParams.get('status'); // 'confirmed', 'canceled', 'completed', 'no_show'
    const upcomingOnly = searchParams.get('upcoming') === 'true';

    // Build query
    let query;
    const now = new Date().toISOString();

    if (statusFilter && upcomingOnly) {
      query = sql`
        SELECT
          a.id,
          a.booking_id,
          a.slot_start,
          a.slot_end,
          a.status,
          a.created_at,
          b.name as business_name,
          b.subdomain,
          s.name as service_name,
          s.duration_minutes,
          s.price_cents,
          s.color as service_color,
          c.name as category_name
        FROM appointments a
        JOIN businesses b ON a.business_id = b.id
        JOIN services s ON a.service_id = s.id
        JOIN categories c ON s.category_id = c.id
        WHERE a.customer_id = ${customerId}
          AND a.status = ${statusFilter}
          AND a.slot_start > ${now}
          AND a.deleted_at IS NULL
        ORDER BY a.slot_start ASC
      `;
    } else if (statusFilter) {
      query = sql`
        SELECT
          a.id,
          a.booking_id,
          a.slot_start,
          a.slot_end,
          a.status,
          a.created_at,
          b.name as business_name,
          b.subdomain,
          s.name as service_name,
          s.duration_minutes,
          s.price_cents,
          s.color as service_color,
          c.name as category_name
        FROM appointments a
        JOIN businesses b ON a.business_id = b.id
        JOIN services s ON a.service_id = s.id
        JOIN categories c ON s.category_id = c.id
        WHERE a.customer_id = ${customerId}
          AND a.status = ${statusFilter}
          AND a.deleted_at IS NULL
        ORDER BY a.slot_start DESC
      `;
    } else if (upcomingOnly) {
      query = sql`
        SELECT
          a.id,
          a.booking_id,
          a.slot_start,
          a.slot_end,
          a.status,
          a.created_at,
          b.name as business_name,
          b.subdomain,
          s.name as service_name,
          s.duration_minutes,
          s.price_cents,
          s.color as service_color,
          c.name as category_name
        FROM appointments a
        JOIN businesses b ON a.business_id = b.id
        JOIN services s ON a.service_id = s.id
        JOIN categories c ON s.category_id = c.id
        WHERE a.customer_id = ${customerId}
          AND a.slot_start > ${now}
          AND a.deleted_at IS NULL
        ORDER BY a.slot_start ASC
      `;
    } else {
      query = sql`
        SELECT
          a.id,
          a.booking_id,
          a.slot_start,
          a.slot_end,
          a.status,
          a.created_at,
          b.name as business_name,
          b.subdomain,
          s.name as service_name,
          s.duration_minutes,
          s.price_cents,
          s.color as service_color,
          c.name as category_name
        FROM appointments a
        JOIN businesses b ON a.business_id = b.id
        JOIN services s ON a.service_id = s.id
        JOIN categories c ON s.category_id = c.id
        WHERE a.customer_id = ${customerId}
          AND a.deleted_at IS NULL
        ORDER BY a.slot_start DESC
      `;
    }

    const appointments = await query;

    return NextResponse.json({
      success: true,
      appointments: appointments.map(apt => ({
        id: apt.id,
        bookingId: apt.booking_id,
        businessName: apt.business_name,
        subdomain: apt.subdomain,
        serviceName: apt.service_name,
        categoryName: apt.category_name,
        startTime: apt.slot_start,
        endTime: apt.slot_end,
        duration: apt.duration_minutes,
        price: apt.price_cents,
        status: apt.status,
        serviceColor: apt.service_color,
        createdAt: apt.created_at,
      })),
      total: appointments.length,
    });
  } catch (error) {
    console.error('Customer appointments fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
