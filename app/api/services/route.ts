import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDbClient } from '@/db/client';

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
    const services = await sql`
      SELECT
        s.id,
        s.name,
        s.duration_minutes,
        s.price_cents,
        s.color,
        s.max_simultaneous_bookings,
        s.sort_order,
        c.name AS category_name
      FROM services s
      LEFT JOIN categories c ON c.id = s.category_id
      WHERE s.business_id = ${payload.business_id}
        AND s.deleted_at IS NULL
      ORDER BY c.sort_order, s.sort_order, s.name
    `;

    return NextResponse.json(services);
  } catch (error) {
    console.error('List services error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
