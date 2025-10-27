import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDbClient } from '@/db/client';
import { requireBusinessOwnership } from '@/lib/auth/verify-ownership';

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
    // Support businessId query parameter for multi-business owners
    const businessId = request.nextUrl.searchParams.get('businessId') || payload.business_id;

    // CRITICAL: Verify user owns this business before querying data
    const unauthorizedResponse = await requireBusinessOwnership(sql, payload.sub, businessId);
    if (unauthorizedResponse) return unauthorizedResponse;

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
      WHERE s.business_id = ${businessId}
        AND s.deleted_at IS NULL
      ORDER BY c.sort_order, s.sort_order, s.name
    `;

    return NextResponse.json(services, {
      headers: {
        // Services don't change frequently - cache for 5 minutes
        // Authenticated endpoint, so use private cache with revalidation
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('List services error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
