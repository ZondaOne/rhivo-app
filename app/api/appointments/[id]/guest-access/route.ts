import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { hashToken } from '@/lib/auth/tokens';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { z } from 'zod';

const sql = neon(process.env.DATABASE_URL!);

const guestAccessSchema = z.object({
  token: z.string().min(1),
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Validate guest token and return appointment details
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: appointmentId } = await params;
    const body = await request.json();
    const validatedData = guestAccessSchema.parse(body);

    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const identifier = `${ip}:${appointmentId}`;

    // Check rate limit
    const isRateLimited = await checkRateLimit(identifier, 'guest_token_validation');
    if (isRateLimited) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const tokenHash = hashToken(validatedData.token);

    // Find appointment with matching token
    const [appointment] = await sql`
      SELECT
        a.id,
        a.appointment_start,
        a.appointment_end,
        a.status,
        a.guest_token_expires_at,
        s.name as service_name,
        s.duration_minutes,
        s.price_cents,
        b.name as business_name,
        u.email as customer_email,
        u.name as customer_name
      FROM appointments a
      JOIN services s ON s.id = a.service_id
      JOIN businesses b ON b.id = a.business_id
      JOIN users u ON u.id = a.customer_id
      WHERE a.id = ${appointmentId}
        AND a.guest_token_hash = ${tokenHash}
        AND a.deleted_at IS NULL
    `;

    if (!appointment) {
      return NextResponse.json(
        { error: 'Invalid or expired access token' },
        { status: 403 }
      );
    }

    // Check if token expired
    if (appointment.guest_token_expires_at && new Date(appointment.guest_token_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Access token expired' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      appointment: {
        id: appointment.id,
        start: appointment.appointment_start,
        end: appointment.appointment_end,
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
          email: appointment.customer_email,
          name: appointment.customer_name,
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Cancel appointment using guest token
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: appointmentId } = await params;
    const body = await request.json();
    const validatedData = guestAccessSchema.parse(body);

    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const identifier = `${ip}:${appointmentId}`;

    // Check rate limit
    const isRateLimited = await checkRateLimit(identifier, 'guest_token_validation');
    if (isRateLimited) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const tokenHash = hashToken(validatedData.token);

    // Find and cancel appointment
    const [appointment] = await sql`
      SELECT
        id,
        status,
        guest_token_expires_at,
        business_id
      FROM appointments
      WHERE id = ${appointmentId}
        AND guest_token_hash = ${tokenHash}
        AND deleted_at IS NULL
        AND status = 'confirmed'
    `;

    if (!appointment) {
      return NextResponse.json(
        { error: 'Invalid access token or appointment not found' },
        { status: 404 }
      );
    }

    // Check if token expired
    if (appointment.guest_token_expires_at && new Date(appointment.guest_token_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Access token has expired' },
        { status: 401 }
      );
    }

    // Cancel appointment
    await sql`
      UPDATE appointments
      SET
        status = 'canceled',
        guest_token_hash = NULL
      WHERE id = ${appointmentId}
    `;

    // Create audit log
    await sql`
      INSERT INTO audit_logs (
        appointment_id,
        action,
        actor_id,
        actor_type
      ) VALUES (
        ${appointmentId},
        'canceled',
        NULL,
        'guest'
      )
    `;

    const result = appointment;

    return NextResponse.json({
      message: 'Appointment canceled successfully',
      appointmentId: result.id,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INVALID_TOKEN') {
        return NextResponse.json(
          { error: 'Invalid access token or appointment not found' },
          { status: 403 }
        );
      }
      if (error.message === 'TOKEN_EXPIRED') {
        return NextResponse.json(
          { error: 'Access token expired' },
          { status: 403 }
        );
      }
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Guest cancel error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}