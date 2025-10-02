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

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'owner') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDbClient();

    const notifications = await sql`
      SELECT
        nl.id,
        nl.appointment_id,
        nl.channel,
        nl.template_name,
        nl.recipient_email,
        nl.recipient_phone,
        nl.status,
        nl.attempts,
        nl.last_attempt_at,
        nl.error_message,
        nl.created_at,
        a.slot_start,
        a.slot_end
      FROM notification_logs nl
      INNER JOIN appointments a ON nl.appointment_id = a.id
      WHERE a.business_id = ${payload.business_id}
      ORDER BY nl.created_at DESC
      LIMIT 100
    `;

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}