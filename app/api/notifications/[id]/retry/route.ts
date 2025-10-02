import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDbClient } from '@/db/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'owner') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const notificationId = id;
    const sql = getDbClient();

    // Get notification
    const notifications = await sql`
      SELECT nl.*
      FROM notification_logs nl
      INNER JOIN appointments a ON nl.appointment_id = a.id
      WHERE nl.id = ${notificationId}
        AND a.business_id = ${payload.business_id}
    `;

    if (notifications.length === 0) {
      return NextResponse.json({ message: 'Notification not found' }, { status: 404 });
    }

    const notif = notifications[0];

    // Check if already sent or pending
    if (notif.status === 'sent') {
      return NextResponse.json(
        { message: 'Notification already sent' },
        { status: 400 }
      );
    }

    // Update status to retrying
    await sql`
      UPDATE notification_logs
      SET status = 'retrying',
          attempts = attempts + 1,
          last_attempt_at = NOW(),
          error_message = NULL
      WHERE id = ${notificationId}
    `;

    // TODO: Integrate with email/SMS provider
    // For now, mark as sent
    await sql`
      UPDATE notification_logs
      SET status = 'sent'
      WHERE id = ${notificationId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Retry notification error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}