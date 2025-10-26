import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDbClient } from '@/db/client';
import { requireBusinessOwnership } from '@/lib/auth/verify-ownership';

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

    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointmentId');
    const businessId = searchParams.get('businessId') || payload.business_id;
    const limit = parseInt(searchParams.get('limit') || '50');

    const sql = getDbClient();

    // CRITICAL: Verify user owns this business before querying data
    const unauthorizedResponse = await requireBusinessOwnership(sql, payload.sub, businessId);
    if (unauthorizedResponse) return unauthorizedResponse;

    // Query audit logs with business_id
    let result;
    if (appointmentId) {
      result = await sql`
        SELECT
          al.id,
          al.appointment_id,
          al.action,
          al.actor_id,
          al.old_state,
          al.new_state,
          al.timestamp,
          u.name as actor_name
        FROM audit_logs al
        LEFT JOIN users u ON al.actor_id = u.id
        WHERE al.business_id = ${businessId}
        AND al.appointment_id = ${appointmentId}
        ORDER BY al.timestamp DESC
        LIMIT ${limit}
      `;
    } else {
      result = await sql`
        SELECT
          al.id,
          al.appointment_id,
          al.action,
          al.actor_id,
          al.old_state,
          al.new_state,
          al.timestamp,
          u.name as actor_name
        FROM audit_logs al
        LEFT JOIN users u ON al.actor_id = u.id
        WHERE al.business_id = ${businessId}
        ORDER BY al.timestamp DESC
        LIMIT ${limit}
      `;
    }

    return NextResponse.json({ logs: result });
  } catch (error) {
    console.error('Audit logs fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}