import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/db/client';
import { ReservationManager } from '@/lib/booking';
import { loadConfigBySubdomain } from '@/lib/config/config-loader';
import { getServiceByIdentifier } from '@/lib/db/service-helpers';
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

    // Resolve serviceId (can be UUID or external_id)
    const service = await getServiceByIdentifier(db, data.businessId, data.serviceId);

    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
      );
    }

    // Find the service in YAML config to get capacity
    let serviceConfig: { id: string; maxSimultaneousBookings?: number } | null = null;
    for (const category of config.categories) {
      const found = category.services.find((s) => s.id === service.external_id);
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

    const manager = new ReservationManager(db);

    const available = await manager.getAvailableCapacity(
      data.businessId,
      service.id, // Use resolved UUID
      new Date(data.slotStart),
      new Date(data.slotEnd),
      maxSimultaneousBookings // Pass YAML config capacity
    );

    return NextResponse.json({
      success: true,
      available,
      slotStart: data.slotStart,
      slotEnd: data.slotEnd
    });
  } catch (error: unknown) {
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