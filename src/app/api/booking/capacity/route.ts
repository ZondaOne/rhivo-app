import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '../../../../db/client';
import { ReservationManager } from '../../../../lib/booking';
import { z } from 'zod';

const capacitySchema = z.object({
  businessId: z.string().min(1),
  serviceId: z.string().min(1),
  slotStart: z.string().datetime(),
  slotEnd: z.string().datetime()
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const data = capacitySchema.parse({
      businessId: searchParams.get('businessId'),
      serviceId: searchParams.get('serviceId'),
      slotStart: searchParams.get('slotStart'),
      slotEnd: searchParams.get('slotEnd')
    });

    const db = getDbClient();
    const manager = new ReservationManager(db);

    const available = await manager.getAvailableCapacity(
      data.businessId,
      data.serviceId,
      new Date(data.slotStart),
      new Date(data.slotEnd)
    );

    return NextResponse.json({
      success: true,
      available,
      slotStart: data.slotStart,
      slotEnd: data.slotEnd
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request parameters', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Capacity check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check capacity' },
      { status: 500 }
    );
  }
}