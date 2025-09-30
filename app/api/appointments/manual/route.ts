import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';
import { nanoid } from 'nanoid';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'owner') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const {
      service_id,
      customer_email,
      customer_name,
      customer_phone,
      start_time,
      duration,
      status = 'confirmed',
    } = await request.json();

    // Validate required fields
    if (!service_id || !customer_email || !start_time || !duration) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const startDate = new Date(start_time);
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + duration);

    // Check for conflicts
    const conflicts = await sql`
      SELECT id FROM appointments
      WHERE business_id = ${payload.business_id}
      AND deleted_at IS NULL
      AND status != 'canceled'
      AND slot_start < ${endDate.toISOString()}
      AND slot_end > ${startDate.toISOString()}
    `;

    // TODO: Check against maxSimultaneousBookings from tenant config
    if (conflicts.length >= 1) {
      return NextResponse.json(
        { message: 'Time slot is already booked' },
        { status: 400 }
      );
    }

    // Create or get customer if email provided
    let customerId: string | null = null;
    if (customer_email) {
      const existingCustomer = await sql`
        SELECT id FROM users
        WHERE email = ${customer_email}
        AND role = 'customer'
        AND deleted_at IS NULL
      `;

      if (existingCustomer.length > 0) {
        customerId = existingCustomer[0].id;
      } else {
        const newCustomer = await sql`
          INSERT INTO users (email, name, phone, role, email_verified, created_at)
          VALUES (${customer_email}, ${customer_name || 'Guest'}, ${customer_phone}, 'customer', true, NOW())
          RETURNING id
        `;
        customerId = newCustomer[0].id;
      }
    }

    // Create appointment with idempotency key
    const idempotencyKey = nanoid();
    const appointment = await sql`
      INSERT INTO appointments (
        business_id, customer_id, guest_email, guest_phone,
        service_id, slot_start, slot_end, status, idempotency_key, created_at, updated_at
      )
      VALUES (
        ${payload.business_id},
        ${customerId},
        ${!customerId ? customer_email : null},
        ${!customerId ? customer_phone : null},
        ${service_id},
        ${startDate.toISOString()},
        ${endDate.toISOString()},
        ${status},
        ${idempotencyKey},
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    const appointmentId = appointment[0].id;

    return NextResponse.json({ appointmentId, success: true }, { status: 201 });
  } catch (error) {
    console.error('Manual appointment creation error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}