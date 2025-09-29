import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '../../../../db/client';
import { ReservationManager } from '../../../../lib/booking';
import { z } from 'zod';

const reserveSchema = z.object({
  businessId: z.string().min(1),
  serviceId: z.string().min(1),
  slotStart: z.string().datetime(),
  slotEnd: z.string().datetime(),
  idempotencyKey: z.string().min(1),
  ttlMinutes: z.number().min(5).max(30).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = reserveSchema.parse(body);

    const db = getDbClient();
    const manager = new ReservationManager(db);

    const reservation = await manager.createReservation({
      businessId: data.businessId,
      serviceId: data.serviceId,
      slotStart: new Date(data.slotStart),
      slotEnd: new Date(data.slotEnd),
      idempotencyKey: data.idempotencyKey,
      ttlMinutes: data.ttlMinutes
    });

    return NextResponse.json({
      success: true,
      reservation: {
        id: reservation.id,
        expiresAt: reservation.expires_at,
        slotStart: reservation.slot_start,
        slotEnd: reservation.slot_end
      }
    });
  } catch (error: any) {
    if (error.message.includes('no longer available')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Reservation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create reservation' },
      { status: 500 }
    );
  }
}