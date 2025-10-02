import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDbClient } from '@/db/client';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'owner') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDbClient();
    const businessId = request.nextUrl.searchParams.get('businessId') || payload.business_id;

    const rows = await sql`
      SELECT id, business_id, service_id, slot_start, slot_end, idempotency_key, expires_at, created_at
      FROM reservations
      WHERE business_id = ${businessId}
        AND expires_at > NOW()
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ reservations: rows });
  } catch (error) {
    console.error('List reservations error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
