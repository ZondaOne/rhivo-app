import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDbClient } from '@/db/client';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum(['confirmed', 'completed', 'cancelled', 'canceled', 'no_show']).optional(),
});

const STATUS_UI_TO_DB: Record<string, 'confirmed' | 'completed' | 'canceled' | 'no_show'> = {
  confirmed: 'confirmed',
  completed: 'completed',
  cancelled: 'canceled',
  canceled: 'canceled',
  no_show: 'no_show',
};

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let payload: ReturnType<typeof verifyToken>;

  try {
    payload = verifyToken(token);
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!payload.business_id || payload.role !== 'owner') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const sql = getDbClient();

  try {
    const body = await request.json();
    const parsed = updateSchema.parse(body);

    if (!parsed.status) {
      return NextResponse.json(
        { message: 'No updates requested' },
        { status: 400 }
      );
    }

    const dbStatus = STATUS_UI_TO_DB[parsed.status];

    const isCancelling = dbStatus === 'canceled';

    const appointmentRows = isCancelling
      ? await sql`
          UPDATE appointments
          SET
            status = ${dbStatus},
            deleted_at = NOW(),
            updated_at = NOW()
          WHERE id = ${params.id}
            AND business_id = ${payload.business_id}
            AND deleted_at IS NULL
          RETURNING id
        `
      : await sql`
          UPDATE appointments
          SET
            status = ${dbStatus},
            deleted_at = NULL,
            updated_at = NOW()
          WHERE id = ${params.id}
            AND business_id = ${payload.business_id}
          RETURNING id
        `;

    const appointment = appointmentRows[0];

    if (!appointment) {
      return NextResponse.json({ message: 'Appointment not found' }, { status: 404 });
    }

    await sql`
      UPDATE audit_logs
      SET actor_id = ${payload.sub}
      WHERE id = (
        SELECT id
        FROM audit_logs
        WHERE appointment_id = ${params.id}
          AND actor_id IS NULL
        ORDER BY timestamp DESC
        LIMIT 1
      )
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation failed', errors: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    console.error('Update appointment error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
