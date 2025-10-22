import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDbClient } from '@/db/client';

/**
 * POST /api/owner/notifications/mark-all-read
 * Mark all notifications as read for the authenticated user
 */
export async function POST(request: NextRequest) {
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

    // Mark all unread notifications as read for this user
    const result = await sql`
      UPDATE notifications
      SET read = TRUE
      WHERE user_id = ${payload.sub}
        AND read = FALSE
      RETURNING id
    `;

    return NextResponse.json({
      success: true,
      message: `Marked ${result.length} notification(s) as read`,
      count: result.length,
    });
  } catch (error) {
    console.error('Mark all read error:', error);
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}
