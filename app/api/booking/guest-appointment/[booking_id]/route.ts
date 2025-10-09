import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/db/client';
import { createHash } from 'crypto';

export async function GET(request: NextRequest, { params }: { params: { booking_id: string } }) {
  try {
    const { booking_id } = await params;
    const bookingId = booking_id;
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Missing token' }, { status: 401 });
    }

    const db = getDbClient();

    const result = await db`
      SELECT
        a.id, a.booking_id, s.name as service_name, a.slot_start, a.slot_end,
        COALESCE(a.guest_name, a.guest_email) as customer_name,
        a.guest_email, a.status, a.guest_token_hash, a.guest_token_expires_at
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.booking_id = ${bookingId} AND a.deleted_at IS NULL
      LIMIT 1
    `;

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
    }

    const appointment = result[0];

    // Hash the provided token and compare with stored hash
    const tokenHash = createHash('sha256').update(token).digest('hex');

    if (appointment.guest_token_hash !== tokenHash || !appointment.guest_token_expires_at || new Date(appointment.guest_token_expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
    }

    // DO NOT invalidate token on GET - only on cancel/reschedule actions
    // Token remains valid for 15 minutes to allow viewing appointment details

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        bookingId: appointment.booking_id,
        serviceName: appointment.service_name,
        startTime: appointment.slot_start,
        endTime: appointment.slot_end,
        customerName: appointment.customer_name,
        guestEmail: appointment.guest_email,
        status: appointment.status,
      },
    });

  } catch (error: unknown) {
    console.error('Get guest appointment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve appointment' },
      { status: 500 }
    );
  }
}
