import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyToken } from '@/lib/auth';
import { loadConfigByBusinessId } from '@/lib/config/config-loader';
import { generateTimeSlots } from '@/lib/booking/slot-generator';
import { getDbClient } from '@/db/client';
import { parseInTimezone, getEndOfDay } from '@/lib/utils/timezone';

const sql = getDbClient();

const querySchema = z.object({
  serviceId: z.string().uuid({ message: 'Invalid serviceId' }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

/**
 * GET /api/appointments/available-slots
 *
 * Get available time slots for a service (Owner Dashboard)
 * Requires authentication
 *
 * Query params:
 * - serviceId: Service UUID
 * - date: Date (YYYY-MM-DD)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let payload: ReturnType<typeof verifyToken>;
    try {
      payload = verifyToken(token);
    } catch {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!payload || payload.role !== 'owner') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const rawParams = {
      serviceId: searchParams.get('serviceId'),
      date: searchParams.get('date'),
    };

    // Validate query params
    const validation = querySchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { serviceId, date } = validation.data;

    // Get service and business details
    const serviceRows = await sql`
      SELECT
        s.id,
        s.name,
        s.duration_minutes,
        s.external_id,
        s.business_id,
        b.subdomain
      FROM services s
      JOIN businesses b ON s.business_id = b.id
      WHERE s.id = ${serviceId}
        AND s.deleted_at IS NULL
        AND b.deleted_at IS NULL
      LIMIT 1
    `;

    if (serviceRows.length === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const serviceRecord = serviceRows[0];
    const businessId = serviceRecord.business_id;

    // Verify user owns this business
    const ownershipCheck = await sql`
      SELECT user_owns_business(${payload.sub}, ${businessId}) as owns_business
    `;

    if (!ownershipCheck[0]?.owns_business) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Load tenant config by business ID
    const configResult = await loadConfigByBusinessId(businessId);
    if (!configResult.success || !configResult.config) {
      return NextResponse.json(
        { error: configResult.error || 'Configuration not found' },
        { status: 500 }
      );
    }

    const config = configResult.config;

    // Find the service in the config by external_id
    let service = null;
    for (const category of config.categories) {
      const found = category.services.find(s => s.id === serviceRecord.external_id);
      if (found) {
        service = found;
        break;
      }
    }

    if (!service) {
      return NextResponse.json({ error: 'Service not found in configuration' }, { status: 404 });
    }

    if (!service.enabled) {
      return NextResponse.json({ error: 'Service is not available' }, { status: 400 });
    }

    // Parse date in business timezone
    const businessTimezone = config.business.timezone;
    const start = parseInTimezone(date, businessTimezone);
    const end = getEndOfDay(start, businessTimezone);

    console.log('[available-slots API] Date parsing:', {
      requestedDate: date,
      businessTimezone,
      startUTC: start.toISOString(),
      endUTC: end.toISOString(),
      startLocal: start.toString(),
      endLocal: end.toString()
    });

    // Get existing appointments in date range
    const appointments = await sql`
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
    const reservations = await sql`
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
      slots,
      service: {
        id: serviceRecord.id,
        name: serviceRecord.name,
        duration: service.duration,
      },
    });
  } catch (error) {
    console.error('Error generating slots:', error);
    return NextResponse.json(
      { error: 'Failed to generate available slots' },
      { status: 500 }
    );
  }
}
