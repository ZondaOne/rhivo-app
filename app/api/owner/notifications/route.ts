import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDbClient } from '@/db/client';

/**
 * GET /api/owner/notifications
 * Fetch notifications for the authenticated business owner
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDbClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unread') === 'true';

    // Fetch notifications for this user
    const notifications = await sql`
      SELECT
        n.id,
        n.business_id,
        n.user_id,
        n.type,
        n.title,
        n.message,
        n.appointment_id,
        n.read,
        n.created_at,
        b.name as business_name,
        b.subdomain as business_subdomain
      FROM notifications n
      INNER JOIN businesses b ON n.business_id = b.id
      WHERE n.user_id = ${payload.userId}
        ${unreadOnly ? sql`AND n.read = FALSE` : sql``}
      ORDER BY n.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Get unread count
    const [countResult] = await sql`
      SELECT COUNT(*) as unread_count
      FROM notifications
      WHERE user_id = ${payload.userId}
        AND read = FALSE
    `;

    return NextResponse.json({
      notifications,
      unreadCount: parseInt(countResult.unread_count),
      total: notifications.length,
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
