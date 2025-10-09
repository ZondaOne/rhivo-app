import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/db/client';
import { AppointmentManager } from '@/lib/booking';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { generateBookingId } from '@/lib/booking/id';

const commitSchema = z.object({
  reservationId: z.string().min(1),
  customerId: z.string().min(1).optional(),
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().optional(),
  guestName: z.string().min(1).optional()
}).refine(
  (data) => data.customerId || data.guestEmail,
  { message: 'Either customerId or guestEmail must be provided' }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = commitSchema.parse(body);

    const db = getDbClient();
    const manager = new AppointmentManager(db);
    const bookingId = generateBookingId();

    // Generate cancellation token for guest bookings
    const cancellationToken = data.guestEmail ? uuidv4() : undefined;

    const appointment = await manager.commitReservation({
      reservationId: data.reservationId,
      bookingId: bookingId,
      customerId: data.customerId,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      guestName: data.guestName,
      cancellationToken
    });

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        bookingId: appointment.booking_id,
        businessId: appointment.business_id,
        serviceId: appointment.service_id,
        slotStart: appointment.slot_start,
        slotEnd: appointment.slot_end,
        status: appointment.status,
        cancellationToken: appointment.cancellation_token
      }
    });
  } catch (error: unknown) {
    if (error.message.includes('Reservation')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Commit error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to confirm booking' },
      { status: 500 }
    );
  }
}