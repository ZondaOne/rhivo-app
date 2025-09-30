import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDbClient } from '@/db/client';
import { validateReschedule } from '@/lib/calendar-utils';
import { Appointment } from '@/db/types';

const sql = getDbClient();

export async function POST(request: NextRequest) {
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

    const { appointmentId, newStartTime } = await request.json();

    if (!appointmentId || !newStartTime) {
      return NextResponse.json(
        { message: 'Appointment ID and new start time are required' },
        { status: 400 }
      );
    }

    const newStart = new Date(newStartTime);

    // Get the appointment
    const appointment = await sql`
      SELECT * FROM appointments
      WHERE id = ${appointmentId}
      AND business_id = ${payload.business_id}
      AND deleted_at IS NULL
    `;

    if (appointment.length === 0) {
      return NextResponse.json({ message: 'Appointment not found' }, { status: 404 });
    }

    const apt = appointment[0];
    const duration = Math.floor(
      (new Date(apt.slot_end).getTime() - new Date(apt.slot_start).getTime()) / (1000 * 60)
    );

    // Get existing appointments to check for conflicts
    const existingAppointments = await sql`
      SELECT * FROM appointments
      WHERE business_id = ${payload.business_id}
      AND deleted_at IS NULL
      AND status != 'canceled'
    `;

    // Validate reschedule
    const validation = validateReschedule(
      apt as Appointment,
      newStart,
      duration,
      existingAppointments as Appointment[],
      1 // TODO: Get from tenant config
    );

    if (!validation.valid) {
      return NextResponse.json({ message: validation.reason }, { status: 400 });
    }

    const newEnd = new Date(newStart);
    newEnd.setMinutes(newEnd.getMinutes() + duration);

    // Update appointment (will trigger audit log via database trigger)
    await sql`
      UPDATE appointments
      SET slot_start = ${newStart.toISOString()},
          slot_end = ${newEnd.toISOString()},
          updated_at = NOW()
      WHERE id = ${appointmentId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reschedule error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}