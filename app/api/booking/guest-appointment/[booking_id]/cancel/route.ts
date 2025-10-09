import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/db/client';
import { z } from 'zod';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const cancelSchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest, { params }: { params: { booking_id: string } }) {
  try {
    const bookingId = params.booking_id;
    const body = await request.json();
    const data = cancelSchema.parse(body);
    const token = data.token;

    const db = getDbClient();

    const result = await db`
      SELECT id, status, guest_token_hash, guest_token_expires_at, business_id, service_id, slot_start, slot_end, guest_email
      FROM appointments
      WHERE booking_id = ${bookingId} AND deleted_at IS NULL
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

    if (appointment.status !== 'confirmed') {
        return NextResponse.json({ success: false, error: `Appointment status is ${appointment.status}, cannot cancel.` }, { status: 400 });
    }

    // Mark appointment as canceled and invalidate token
    await db`
      UPDATE appointments
      SET status = 'canceled', updated_at = NOW(), guest_token_hash = NULL, guest_token_expires_at = NULL
      WHERE id = ${appointment.id}
    `;

    // Add audit log entry for guest cancellation
    await db`
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
        'canceled',
        ${JSON.stringify({ status: 'confirmed', guest_email: appointment.guest_email })},
        ${JSON.stringify({ status: 'canceled', canceled_by: 'guest', guest_email: appointment.guest_email })},
        NOW()
      )
    `;

    // TODO: Send notification to business owner about guest cancellation
    // TODO: Send confirmation email to guest

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Invalid request data', details: error.issues },
          { status: 400 }
        );
      }
  
      console.error('Cancel guest appointment error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to cancel appointment' },
        { status: 500 }
      );
  }
}
