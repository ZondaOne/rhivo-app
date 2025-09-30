import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDbClient } from '@/db/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15
    const { id } = await params;
    
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'owner') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const notificationId = id;
    const db = getDbClient();

    // Get notification
    const notification = await db.query(
      `SELECT nl.* FROM notification_log nl
       INNER JOIN appointments a ON nl.appointment_id = a.id
       WHERE nl.id = $1 AND a.business_id = $2`,
      [notificationId, payload.business_id]
    );

    if (notification.length === 0) {
      return NextResponse.json({ message: 'Notification not found' }, { status: 404 });
    }

    const notif = notification[0];

    // Check if already sent or pending
    if (notif.status === 'sent') {
      return NextResponse.json(
        { message: 'Notification already sent' },
        { status: 400 }
      );
    }

    // Update status to retrying
    await db.query(
      `UPDATE notification_log
       SET status = 'retrying',
           retry_count = retry_count + 1,
           error_message = NULL
       WHERE id = $1`,
      [notificationId]
    );

    // TODO: Integrate with email/SMS provider
    // For now, mark as sent
    await db.query(
      `UPDATE notification_log SET status = 'sent', sent_at = NOW() WHERE id = $1`,
      [notificationId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Retry notification error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}