import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDbClient } from '@/db/client';
import { AppointmentManager } from '@/lib/booking';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const createManualAppointmentSchema = z.object({
  service_id: z.string().uuid({ message: 'Invalid service_id' }),
  start_time: z.string().datetime({ message: 'start_time must be ISO datetime' }),
  duration: z.number().int().positive().max(480).optional(),
  status: z
    .enum(['confirmed', 'completed', 'cancelled', 'canceled', 'no_show'])
    .optional()
    .default('confirmed'),
  customer_email: z.string().email({ message: 'customer_email must be valid' }).optional(),
  customer_name: z.string().min(1).max(120).optional(),
  customer_phone: z.string().min(3).max(40).optional(),
  notes: z.string().max(500).optional(),
  idempotency_key: z.string().min(8).max(128).optional(),
});

const STATUS_UI_TO_DB: Record<string, 'confirmed' | 'canceled' | 'completed' | 'no_show'> = {
  confirmed: 'confirmed',
  completed: 'completed',
  cancelled: 'canceled',
  canceled: 'canceled',
  no_show: 'no_show',
};

export async function POST(request: NextRequest) {
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

  if (payload.role !== 'owner' || !payload.business_id) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  let body: z.infer<typeof createManualAppointmentSchema>;

  try {
    const json = await request.json();
    body = createManualAppointmentSchema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation failed', errors: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  const sql = getDbClient();

  try {
    const [service] = await sql`
      SELECT id, business_id, duration_minutes
      FROM services
      WHERE id = ${body.service_id}
        AND business_id = ${payload.business_id}
        AND deleted_at IS NULL
    `;

    if (!service) {
      return NextResponse.json({ message: 'Service not found' }, { status: 404 });
    }

    const durationMinutes = body.duration ?? Number(service.duration_minutes);
    const slotStart = new Date(body.start_time);
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);

    if (Number.isNaN(slotStart.getTime()) || Number.isNaN(slotEnd.getTime())) {
      return NextResponse.json({ message: 'Invalid start_time or duration' }, { status: 400 });
    }

    if (slotStart < new Date()) {
      return NextResponse.json({ message: 'Cannot create appointments in the past' }, { status: 400 });
    }

    if (!body.customer_email) {
      return NextResponse.json(
        { message: 'customer_email is required for manual appointment creation' },
        { status: 400 }
      );
    }

    const [existingCustomer] = await sql`
      SELECT id FROM users
      WHERE email = ${body.customer_email}
        AND role = 'customer'
        AND deleted_at IS NULL
        AND (business_id = ${payload.business_id} OR business_id IS NULL)
      LIMIT 1
    `;

    let customerId = existingCustomer?.id ?? null;

    if (!customerId) {
      const [newCustomer] = await sql`
        INSERT INTO users (
          email,
          name,
          phone,
          role,
          business_id,
          email_verified,
          created_at
        ) VALUES (
          ${body.customer_email},
          ${body.customer_name ?? 'Guest'},
          ${body.customer_phone ?? null},
          'customer',
          ${payload.business_id},
          true,
          NOW()
        )
        RETURNING id
      `;

      customerId = newCustomer.id as string;
    }

    const appointmentManager = new AppointmentManager(sql);
    const idempotencyKey = body.idempotency_key ?? nanoid();

    const appointment = await appointmentManager.createManualAppointment({
      businessId: payload.business_id,
      serviceId: body.service_id,
      slotStart,
      slotEnd,
      customerId,
      guestEmail: undefined,
      guestPhone: undefined,
      idempotencyKey,
      actorId: payload.sub,
    });

    const desiredStatus = STATUS_UI_TO_DB[body.status] ?? 'confirmed';

    if (desiredStatus !== 'confirmed') {
      await sql`
        UPDATE appointments
        SET status = ${desiredStatus}, updated_at = NOW()
        WHERE id = ${appointment.id}
      `;

      await sql`
        UPDATE audit_logs
        SET actor_id = ${payload.sub}
        WHERE id = (
          SELECT id
          FROM audit_logs
          WHERE appointment_id = ${appointment.id}
            AND actor_id IS NULL
          ORDER BY timestamp DESC
          LIMIT 1
        )
      `;
    }

    return NextResponse.json({ appointmentId: appointment.id, success: true }, { status: 201 });
  } catch (error) {
    console.error('Manual appointment creation error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}