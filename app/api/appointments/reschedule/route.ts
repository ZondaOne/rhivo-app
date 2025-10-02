import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDbClient } from '@/db/client';
import { AppointmentManager } from '@/lib/booking';
import { z } from 'zod';

const sql = getDbClient();

const rescheduleSchema = z.object({
  appointmentId: z.string().uuid({ message: 'Invalid appointmentId' }),
  newStartTime: z.string().datetime({ message: 'newStartTime must be ISO datetime' }),
  reason: z.string().max(250).optional(),
});

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

    let body: z.infer<typeof rescheduleSchema>;

    try {
      body = rescheduleSchema.parse(await request.json());
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { message: 'Validation failed', errors: error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }

    const appointmentRows = await sql`
      SELECT id, business_id, service_id, slot_start, slot_end, version
      FROM appointments
      WHERE id = ${body.appointmentId}
        AND business_id = ${payload.business_id}
        AND deleted_at IS NULL
    `;

    if (appointmentRows.length === 0) {
      return NextResponse.json({ message: 'Appointment not found' }, { status: 404 });
    }

    const current = appointmentRows[0];
    const currentVersion = Number(current.version ?? 1);
    const existingDuration = Math.floor(
      (new Date(current.slot_end).getTime() - new Date(current.slot_start).getTime()) / (1000 * 60)
    );

    const newStart = new Date(body.newStartTime);
    if (Number.isNaN(newStart.getTime())) {
      return NextResponse.json({ message: 'Invalid newStartTime' }, { status: 400 });
    }

    if (newStart < new Date()) {
      return NextResponse.json({ message: 'Cannot reschedule into the past' }, { status: 400 });
    }

    const newEnd = new Date(newStart.getTime() + existingDuration * 60 * 1000);

    const appointmentManager = new AppointmentManager(sql);

    try {
      await appointmentManager.updateAppointment({
        appointmentId: body.appointmentId,
        slotStart: newStart,
        slotEnd: newEnd,
        actorId: payload.sub,
        expectedVersion: currentVersion,
      });
    } catch (error: any) {
      if (error?.code === 'CONFLICT') {
        return NextResponse.json(
          { message: 'Appointment has been modified, please refresh and try again' },
          { status: 409 }
        );
      }

      if (error instanceof Error && error.message.includes('No available capacity')) {
        return NextResponse.json(
          { message: 'Selected time slot is fully booked' },
          { status: 409 }
        );
      }

      console.error('Reschedule error:', error);
      return NextResponse.json(
        { message: 'Failed to reschedule appointment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reschedule error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}