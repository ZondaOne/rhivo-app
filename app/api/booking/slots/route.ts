import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadConfigBySubdomain } from '@/lib/config/config-loader';
import { generateTimeSlots } from '@/lib/booking/slot-generator';
import { getDbClient } from '@/db/client';
import { parseInTimezone, getEndOfDay } from '@/lib/utils/timezone';

const querySchema = z.object({
  subdomain: z.string().min(1, 'Subdomain is required'),
  serviceId: z.string().min(1, 'Service ID is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional(),
});

/**
 * GET /api/booking/slots
 *
 * Get available time slots for a service
 *
 * Query params:
 * - subdomain: Business subdomain
 * - serviceId: Service ID
 * - startDate: Start date (YYYY-MM-DD)
 * - endDate: End date (YYYY-MM-DD) - optional, defaults to startDate + 7 days
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawParams = {
      subdomain: searchParams.get('subdomain'),
      serviceId: searchParams.get('serviceId'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    };

    // Validate query params
    const validation = querySchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid parameters',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { subdomain, serviceId, startDate, endDate: rawEndDate } = validation.data;

    // Load tenant config
    const configResult = await loadConfigBySubdomain(subdomain);
    if (!configResult.success || !configResult.config) {
      return NextResponse.json(
        {
          success: false,
          error: configResult.error || 'Configuration not found',
        },
        { status: 404 }
      );
    }

    const config = configResult.config;

    // Find the service in the config
    let service = null;
    for (const category of config.categories) {
      const found = category.services.find(s => s.id === serviceId);
      if (found) {
        service = found;
        break;
      }
    }

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          error: 'Service not found',
        },
        { status: 404 }
      );
    }

    if (!service.enabled) {
      return NextResponse.json(
        {
          success: false,
          error: 'Service is not available for booking',
        },
        { status: 400 }
      );
    }

    // Parse dates in business timezone (critical for correct slot generation)
    // This ensures that "2025-01-15" means midnight on Jan 15 in the business's timezone,
    // not midnight in the server's timezone
    const businessTimezone = config.business.timezone;

    const start = parseInTimezone(startDate, businessTimezone);
    // If no endDate provided, default to the same day (not 7 days later)
    // to avoid generating slots spanning multiple days
    const endDate = rawEndDate || startDate;
    const end = getEndOfDay(parseInTimezone(endDate, businessTimezone), businessTimezone);

    // Get business from database
    const db = getDbClient();
    const businessResult = await db`
      SELECT id FROM businesses
      WHERE subdomain = ${subdomain}
        AND deleted_at IS NULL
        AND status = 'active'
      LIMIT 1
    `;

    if (businessResult.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Business not found',
        },
        { status: 404 }
      );
    }

    const businessId = businessResult[0].id;

    // Get existing appointments in date range
    const appointments = await db`
      SELECT slot_start, slot_end
      FROM appointments
      WHERE business_id = ${businessId}
        AND slot_start >= ${start.toISOString()}
        AND slot_start <= ${end.toISOString()}
        AND status IN ('confirmed', 'completed')
        AND deleted_at IS NULL
    `;

    // Get active reservations (not expired)
    const now = new Date();
    const reservations = await db`
      SELECT slot_start, slot_end, expires_at
      FROM reservations
      WHERE business_id = ${businessId}
        AND slot_start >= ${start.toISOString()}
        AND slot_start <= ${end.toISOString()}
        AND expires_at > ${now.toISOString()}
    `;

    // Generate time slots
    const slots = generateTimeSlots({
      config,
      service,
      startDate: start,
      endDate: end,
      existingAppointments: appointments.map(a => ({
        slot_start: a.slot_start,
        slot_end: a.slot_end,
      })),
      existingReservations: reservations.map(r => ({
        slot_start: r.slot_start,
        slot_end: r.slot_end,
        expires_at: r.expires_at,
      })),
    });

    return NextResponse.json({
      success: true,
      slots,
      service: {
        id: service.id,
        name: service.name,
        duration: service.duration,
        price: service.price,
      },
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error generating slots:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
