import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDbClient } from '@/db/client';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'owner') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const db = getDbClient();

    const result = await db.query(
      `SELECT
        nl.id,
        nl.appointment_id,
        nl.type,
        nl.recipient,
        nl.status,
        nl.subject,
        nl.message,
        nl.sent_at,
        nl.error_message,
        nl.retry_count,
        nl.created_at
       FROM notification_log nl
       INNER JOIN appointments a ON nl.appointment_id = a.id
       WHERE a.business_id = $1
       ORDER BY nl.created_at DESC
       LIMIT 100`,
      [payload.business_id]
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}