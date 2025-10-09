import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verifyAccessToken } from '@/lib/auth/tokens';

const sql = neon(process.env.DATABASE_URL!);

/**
 * POST /api/customer/link-bookings
 *
 * Link existing guest bookings to the authenticated customer account.
 * This is useful when a customer creates an account after making guest bookings.
 */
export async function POST(request: NextRequest) {
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

    // Get customer's email and phone
    const [customer] = await sql`
      SELECT email, phone
      FROM users
      WHERE id = ${customerId}
        AND deleted_at IS NULL
    `;

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Link guest bookings by email
    let linkedByEmail = 0;
    if (customer.email) {
      const result = await sql`
        UPDATE appointments
        SET customer_id = ${customerId}
        WHERE LOWER(guest_email) = LOWER(${customer.email})
          AND customer_id IS NULL
          AND deleted_at IS NULL
      `;
      linkedByEmail = result.count || 0;
    }

    // Link guest bookings by phone
    let linkedByPhone = 0;
    if (customer.phone) {
      const result = await sql`
        UPDATE appointments
        SET customer_id = ${customerId}
        WHERE LOWER(guest_phone) = LOWER(${customer.phone})
          AND customer_id IS NULL
          AND deleted_at IS NULL
      `;
      linkedByPhone = result.count || 0;
    }

    const totalLinked = linkedByEmail + linkedByPhone;

    return NextResponse.json({
      success: true,
      message: `Successfully linked ${totalLinked} guest booking(s) to your account`,
      linkedBookings: totalLinked,
      breakdown: {
        byEmail: linkedByEmail,
        byPhone: linkedByPhone,
      },
    });
  } catch (error) {
    console.error('Link bookings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
