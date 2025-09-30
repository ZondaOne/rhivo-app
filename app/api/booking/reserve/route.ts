import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/db/client';
import { ReservationManager } from '@/lib/booking';
import { z } from 'zod';

const reserveSchema = z.object({
  businessId: z.string().min(1),
  serviceId: z.string().min(1),
  startTime: z.string().datetime().optional(),
  slotStart: z.string().datetime().optional(),
  slotEnd: z.string().datetime().optional(),
  idempotencyKey: z.string().min(1),
  ttlMinutes: z.number().min(5).max(30).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = reserveSchema.parse(body);

    // Handle both startTime (simplified) and slotStart/slotEnd (explicit)
    let slotStart: Date;
    let slotEnd: Date;

    if (data.startTime) {
      // Get service duration to calculate end time
      const db = getDbClient();
      const serviceResult = await db`
        SELECT duration_minutes FROM services WHERE id = ${data.serviceId}
      `;

      if (serviceResult.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Service not found' },
          { status: 404 }
        );
      }

      slotStart = new Date(data.startTime);
      slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + serviceResult[0].duration_minutes);
    } else if (data.slotStart && data.slotEnd) {
      slotStart = new Date(data.slotStart);
      slotEnd = new Date(data.slotEnd);
    } else {
      return NextResponse.json(
        { success: false, error: 'Either startTime or both slotStart and slotEnd are required' },
        { status: 400 }
      );
    }

    const db = getDbClient();
    const manager = new ReservationManager(db);

    const reservation = await manager.createReservation({
      businessId: data.businessId,
      serviceId: data.serviceId,
      slotStart,
      slotEnd,
      idempotencyKey: data.idempotencyKey,
      ttlMinutes: data.ttlMinutes
    });

    return NextResponse.json({
      success: true,
      reservationId: reservation.id,
      reservationToken: reservation.id, // Same as ID for now
      expiresAt: reservation.expires_at,
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
        { success: false, error: 'Invalid request data', details: error.issues },
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