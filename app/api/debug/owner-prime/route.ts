import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verifyToken } from '@/lib/auth';

const sql = neon(process.env.DATABASE_URL!);

/**
 * Dev-only endpoint: ensure the authenticated owner business has
 * at least one category, one service, and basic weekday availability.
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let payload: ReturnType<typeof verifyToken>;
    try {
      payload = verifyToken(token);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (payload.role !== 'owner' || !payload.business_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const businessId = payload.business_id;

    // Ensure one category
    let category = (await sql`SELECT id, name FROM categories WHERE business_id = ${businessId} ORDER BY sort_order LIMIT 1`)[0];
    if (!category) {
      category = (
        await sql`
          INSERT INTO categories (business_id, name, sort_order)
          VALUES (${businessId}, 'Default Services', 0)
          RETURNING id, name
        `
      )[0];
    }

    // Ensure one service
    let service = (
      await sql`SELECT id, name, duration_minutes FROM services WHERE business_id = ${businessId} AND deleted_at IS NULL ORDER BY sort_order LIMIT 1`
    )[0];
    if (!service) {
      service = (
        await sql`
          INSERT INTO services (
            business_id, category_id, name, duration_minutes, price_cents, color, max_simultaneous_bookings, sort_order
          ) VALUES (
            ${businessId}, ${category.id}, 'Standard Service', 30, 5000, '#0ea5e9', 2, 0
          )
          RETURNING id, name, duration_minutes
        `
      )[0];
    }

    // Ensure basic weekday availability
    const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM availability WHERE business_id = ${businessId}` as any;
    if (!count || Number(count) === 0) {
      const days = [1, 2, 3, 4, 5];
      for (const d of days) {
        await sql`
          INSERT INTO availability (business_id, day_of_week, start_time, end_time)
          VALUES (${businessId}, ${d}, '09:00', '17:00')
        `;
      }
    }

    return NextResponse.json({
      message: 'Owner business primed with default resources',
      category,
      service,
    });
  } catch (error) {
    console.error('owner-prime error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
