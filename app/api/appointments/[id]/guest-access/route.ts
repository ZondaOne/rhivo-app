import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { hashToken } from '@/lib/auth/tokens';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { z } from 'zod';

const sql = neon(process.env.DATABASE_URL!);

const guestAccessSchema = z.object({
  token: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: appointmentId } = params;
    const body = await request.json();
    const validated = guestAccessSchema.parse(body);

    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const identifier = `${ip}:${appointmentId}`;

    const isRateLimited = await checkRateLimit(identifier, 'guest_token_validation');
    if (isRateLimited) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    const tokenHash = hashToken(validated.token);

    const [appointment] = await sql`
      SELECT
        a.id,
        a.slot_start,
        a.slot_end,
        a.status,
        a.guest_token_expires_at,
        a.guest_email,
        a.guest_phone,
        s.name AS service_name,
        s.duration_minutes,
        s.price_cents,
        b.name AS business_name,
        u.email AS customer_email,
        u.name AS customer_name,
        u.phone AS customer_phone
      FROM appointments a
      LEFT JOIN services s ON s.id = a.service_id
      LEFT JOIN businesses b ON b.id = a.business_id
      LEFT JOIN users u ON u.id = a.customer_id
      WHERE a.id = ${appointmentId}
        AND a.guest_token_hash = ${tokenHash}
        AND a.deleted_at IS NULL
    `;

    if (!appointment) {
      return NextResponse.json({ error: 'Invalid or expired access token' }, { status: 403 });
    }

    if (appointment.guest_token_expires_at && new Date(appointment.guest_token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Access token expired' }, { status: 403 });
    }

    return NextResponse.json({
      appointment: {
        id: appointment.id,
        start: appointment.slot_start,
        end: appointment.slot_end,
        status: appointment.status,
        service: {
          name: appointment.service_name,
          duration: appointment.duration_minutes,
          price: appointment.price_cents,
        },
        business: {
          name: appointment.business_name,
        },
        customer: {
          email: appointment.customer_email ?? appointment.guest_email,
          name: appointment.customer_name ?? 'Guest',
          phone: appointment.customer_phone ?? appointment.guest_phone,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Guest access error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: appointmentId } = params;
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const identifier = `${ip}:${appointmentId}`;

    const isRateLimited = await checkRateLimit(identifier, 'guest_token_validation');
    if (isRateLimited) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    const tokenHash = hashToken(token);

    const [appointment] = await sql`
      SELECT
        a.id,
        a.slot_start,
        a.slot_end,
        a.status,
        a.guest_token_expires_at,
        a.guest_email,
        a.guest_phone,
        s.name AS service_name,
        s.duration_minutes,
        s.price_cents,
        b.name AS business_name,
        u.email AS customer_email,
        u.name AS customer_name,
        u.phone AS customer_phone
      FROM appointments a
      LEFT JOIN services s ON s.id = a.service_id
      LEFT JOIN businesses b ON b.id = a.business_id
      LEFT JOIN users u ON u.id = a.customer_id
      WHERE a.id = ${appointmentId}
        AND a.guest_token_hash = ${tokenHash}
        AND a.deleted_at IS NULL
    `;

    if (!appointment) {
      return NextResponse.json({ error: 'Invalid or expired access token' }, { status: 403 });
    }

    if (appointment.guest_token_expires_at && new Date(appointment.guest_token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Access token expired' }, { status: 403 });
    }

    return NextResponse.json({
      appointment: {
        id: appointment.id,
        start: appointment.slot_start,
        end: appointment.slot_end,
        status: appointment.status,
        service: {
          name: appointment.service_name,
          duration: appointment.duration_minutes,
          price: appointment.price_cents,
        },
        business: {
          name: appointment.business_name,
        },
        customer: {
          email: appointment.customer_email ?? appointment.guest_email,
          name: appointment.customer_name ?? 'Guest',
          phone: appointment.customer_phone ?? appointment.guest_phone,
        },
      },
    });
  } catch (error) {
    console.error('Guest access GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: appointmentId } = params;
    const body = await request.json();
    const validated = guestAccessSchema.parse(body);

    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const identifier = `${ip}:${appointmentId}`;

    const isRateLimited = await checkRateLimit(identifier, 'guest_token_validation');
    if (isRateLimited) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    const tokenHash = hashToken(validated.token);

    const [appointment] = await sql`
      SELECT id, status, guest_token_expires_at
      FROM appointments
      WHERE id = ${appointmentId}
        AND guest_token_hash = ${tokenHash}
        AND deleted_at IS NULL
    `;

    if (!appointment) {
      return NextResponse.json({ error: 'Invalid access token or appointment not found' }, { status: 404 });
    }

    if (appointment.guest_token_expires_at && new Date(appointment.guest_token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Access token has expired' }, { status: 401 });
    }

    if (appointment.status !== 'confirmed') {
      return NextResponse.json({ error: 'Only confirmed appointments can be cancelled' }, { status: 409 });
    }

    await sql`
      UPDATE appointments
      SET
        status = 'canceled',
        deleted_at = NOW(),
        guest_token_hash = NULL,
        guest_token_expires_at = NULL,
        updated_at = NOW()
      WHERE id = ${appointmentId}
    `;

    return NextResponse.json({
      message: 'Appointment canceled successfully',
      appointmentId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Guest cancel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}