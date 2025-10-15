import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/db/client';
import { ReservationManager } from '@/lib/booking';
import { getServiceByIdentifier } from '@/lib/db/service-helpers';
import { loadConfigBySubdomain } from '@/lib/config/config-loader';
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

    const db = getDbClient();

    console.log('🔍 DEBUG: Looking up service');
    console.log('  businessId:', data.businessId);
    console.log('  serviceId:', data.serviceId);
    console.log('  serviceId type:', typeof data.serviceId);

    // Check what's in the database
    const allServices = await db`
      SELECT id, name, external_id, business_id 
      FROM services 
      WHERE business_id = ${data.businessId} 
        AND deleted_at IS NULL
    `;
    console.log('  All services in business:', JSON.stringify(allServices, null, 2));

    // Resolve serviceId (can be UUID or external_id)
    const service = await getServiceByIdentifier(db, data.businessId, data.serviceId);
    console.log('  Found service:', service ? JSON.stringify(service, null, 2) : 'NULL');

    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Service not found', debug: { businessId: data.businessId, serviceId: data.serviceId, availableServices: allServices } },
        { status: 404 }
      );
    }

    // Load YAML config to get capacity (single source of truth)
    const business = await db`
      SELECT subdomain, config_yaml_path FROM businesses
      WHERE id = ${data.businessId} AND deleted_at IS NULL
      LIMIT 1
    `;

    if (business.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      );
    }

    const configResult = await loadConfigBySubdomain(business[0].subdomain);

    if (!configResult.success || !configResult.config) {
      return NextResponse.json(
        { success: false, error: 'Failed to load business configuration' },
        { status: 500 }
      );
    }

    const config = configResult.config;

    // Find the service in YAML config to get capacity
    let serviceConfig = null;
    for (const category of config.categories) {
      const found = category.services.find((s: any) => s.id === service.external_id);
      if (found) {
        serviceConfig = found;
        break;
      }
    }

    if (!serviceConfig) {
      return NextResponse.json(
        { success: false, error: 'Service configuration not found in YAML' },
        { status: 500 }
      );
    }

    // Use per-service capacity or fall back to business-level default
    const maxSimultaneousBookings = serviceConfig.maxSimultaneousBookings ?? config.bookingLimits.maxSimultaneousBookings;

    // Handle both startTime (simplified) and slotStart/slotEnd (explicit)
    let slotStart: Date;
    let slotEnd: Date;

    if (data.startTime) {
      // Use service duration to calculate end time
      slotStart = new Date(data.startTime);
      slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + service.duration_minutes);
    } else if (data.slotStart && data.slotEnd) {
      slotStart = new Date(data.slotStart);
      slotEnd = new Date(data.slotEnd);
    } else {
      return NextResponse.json(
        { success: false, error: 'Either startTime or both slotStart and slotEnd are required' },
        { status: 400 }
      );
    }

    const manager = new ReservationManager(db);

    const reservation = await manager.createReservation({
      businessId: data.businessId,
      serviceId: service.id,  // Use resolved UUID
      slotStart,
      slotEnd,
      idempotencyKey: data.idempotencyKey,
      ttlMinutes: data.ttlMinutes,
      maxSimultaneousBookings // Pass YAML config capacity
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