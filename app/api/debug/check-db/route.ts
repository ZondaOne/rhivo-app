import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/db/client';

/**
 * GET /api/debug/check-db
 *
 * Check database connection and list businesses/users
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const table = searchParams.get('table') || 'businesses';

    const db = getDbClient();

    if (table === 'businesses') {
      const businesses = await db`
        SELECT id, subdomain, name, status, deleted_at, created_at
        FROM businesses
        ORDER BY created_at DESC
        LIMIT 10
      `;

      return NextResponse.json({
        success: true,
        table: 'businesses',
        count: businesses.length,
        data: businesses,
      });
    } else if (table === 'users') {
      const users = await db`
        SELECT id, email, name, role, business_id, email_verified, deleted_at, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 10
      `;

      return NextResponse.json({
        success: true,
        table: 'users',
        count: users.length,
        data: users,
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid table parameter. Use "businesses" or "users"',
    }, { status: 400 });

  } catch (error) {
    console.error('Database check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
      },
      { status: 500 }
    );
  }
}
