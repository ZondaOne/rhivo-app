import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDbClient } from '@/db/client';
import { z } from 'zod';

const querySchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  status: z.enum(['confirmed', 'completed', 'cancelled', 'canceled', 'no_show']).optional(),
  serviceId: z.string().uuid({ message: 'serviceId must be a valid UUID' }).optional(),
  businessId: z.string().uuid({ message: 'businessId must be a valid UUID' }).optional(),
});

const STATUS_UI_TO_DB: Record<string, 'confirmed' | 'canceled' | 'completed' | 'no_show'> = {
  confirmed: 'confirmed',
  completed: 'completed',
  cancelled: 'canceled',
  canceled: 'canceled',
  no_show: 'no_show',
};

const STATUS_DB_TO_UI: Record<string, 'confirmed' | 'completed' | 'cancelled' | 'no_show'> = {
  confirmed: 'confirmed',
  completed: 'completed',
  canceled: 'cancelled',
  no_show: 'no_show',
};

export async function GET(request: NextRequest) {
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

  const sql = getDbClient();

  try {
    const rawParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const validated = querySchema.parse(rawParams);

    // Use businessId from query param if provided, otherwise use from token
    // For multi-business owners, we need to verify they own the requested business
    const targetBusinessId = validated.businessId || payload.business_id;

    // TODO: Add verification that user owns the target business using user_owns_business(user_id, business_id)
    // For now, we'll use the businessId if provided

    const dbStatus = validated.status ? STATUS_UI_TO_DB[validated.status] ?? 'confirmed' : null;

    const rows = await sql`
      SELECT
        a.id,
        a.service_id,
        s.name AS service_name,
        a.slot_start,
        a.slot_end,
        a.status,
        a.version,
        a.created_at,
        a.updated_at,
        u.name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone,
        a.guest_name,
        a.guest_email,
        a.guest_phone
      FROM appointments a
      LEFT JOIN services s ON s.id = a.service_id
      LEFT JOIN users u ON u.id = a.customer_id
      WHERE a.business_id = ${targetBusinessId}
        AND a.deleted_at IS NULL
        ${validated.start ? sql`AND a.slot_end > ${new Date(validated.start).toISOString()}` : sql``}
        ${validated.end ? sql`AND a.slot_start < ${new Date(validated.end).toISOString()}` : sql``}
        ${dbStatus ? sql`AND a.status = ${dbStatus}` : sql``}
        ${validated.serviceId ? sql`AND a.service_id = ${validated.serviceId}` : sql``}
      ORDER BY a.slot_start ASC
    `;

    const appointments = rows.map((row) => {
      const slotStart = new Date(row.slot_start as string);
      const slotEnd = new Date(row.slot_end as string);
      const durationMinutes = Math.max(5, Math.round((slotEnd.getTime() - slotStart.getTime()) / (1000 * 60)));

      return {
        id: row.id,
        service_id: row.service_id,
        service_name: row.service_name,
        start_time: slotStart.toISOString(),
        end_time: slotEnd.toISOString(),
        duration: durationMinutes,
        status: STATUS_DB_TO_UI[row.status as string] ?? row.status,
        customer_name: row.customer_name || row.guest_name || 'Guest',
        customer_email: row.customer_email ?? row.guest_email ?? null,
        customer_phone: row.customer_phone ?? row.guest_phone ?? null,
        guest_email: row.guest_email ?? null,
        guest_phone: row.guest_phone ?? null,
        version: row.version ?? 1,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    return NextResponse.json(appointments);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation failed', errors: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    console.error('List appointments error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
