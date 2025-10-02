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

    // Get all appointments for debugging
    const appointments = await sql`
      SELECT
        id,
        business_id,
        service_id,
        customer_id,
        guest_email,
        guest_phone,
        slot_start,
        slot_end,
        status,
        created_at,
        deleted_at
      FROM appointments
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 50
    `;

    // Get owner's business_id for comparison
    const ownerBusinessId = payload.business_id;

    return NextResponse.json({
      ownerBusinessId,
      appointmentCount: appointments.length,
      appointments: appointments.map((a: any) => ({
        ...a,
        isOwnersAppointment: a.business_id === ownerBusinessId
      }))
    });
  } catch (error) {
    console.error('Debug all appointments error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
