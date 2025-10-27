/**
 * API endpoint for managing availability exceptions (off days)
 *
 * GET: List all availability exceptions
 * POST: Add a new availability exception
 * DELETE: Remove an availability exception
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/db/client';
import { verifyAccessToken } from '@/lib/auth/tokens';
import * as yaml from 'js-yaml';
import { TenantConfigSchema, type AvailabilityException } from '@/lib/config/tenant-schema';
import { clearConfigCache } from '@/lib/config/config-loader';

/**
 * GET /api/settings/availability-exceptions
 * List all availability exceptions for the authenticated business
 * Query params:
 *   - checkDate: Check for existing bookings on this date (YYYY-MM-DD)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Only owners can manage availability
    if (payload.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only business owners can manage availability exceptions' },
        { status: 403 }
      );
    }

    // Get business ID from user
    const db = getDbClient();
    const [user] = await db`
      SELECT business_id
      FROM users
      WHERE id = ${payload.sub}
        AND deleted_at IS NULL
    `;

    if (!user || !user.business_id) {
      return NextResponse.json(
        { error: 'User has no associated business' },
        { status: 404 }
      );
    }

    // Get business config from database
    const [business] = await db`
      SELECT config_yaml, subdomain
      FROM businesses
      WHERE id = ${user.business_id}
        AND deleted_at IS NULL
        AND status = 'active'
    `;

    if (!business || !business.config_yaml) {
      return NextResponse.json(
        { error: 'Business configuration not found' },
        { status: 404 }
      );
    }

    // Check if we need to check for existing bookings
    const { searchParams } = new URL(request.url);
    const checkDate = searchParams.get('checkDate');

    if (checkDate) {
      // Check for existing bookings on this date
      const startOfDay = new Date(checkDate + 'T00:00:00Z');
      const endOfDay = new Date(checkDate + 'T23:59:59Z');

      const bookings = await db`
        SELECT
          a.id,
          a.booking_id,
          a.slot_start,
          a.slot_end,
          s.name as service_name,
          COALESCE(u.name, a.guest_name) as customer_name,
          COALESCE(u.email, a.guest_email) as customer_email
        FROM appointments a
        LEFT JOIN services s ON s.id = a.service_id
        LEFT JOIN users u ON u.id = a.customer_id
        WHERE a.business_id = ${user.business_id}
          AND a.status = 'confirmed'
          AND a.slot_start >= ${startOfDay.toISOString()}
          AND a.slot_start < ${endOfDay.toISOString()}
          AND a.deleted_at IS NULL
        ORDER BY a.slot_start ASC
      `;

      return NextResponse.json({
        success: true,
        hasBookings: bookings.length > 0,
        bookings: bookings.map(b => ({
          id: b.id,
          bookingId: b.booking_id,
          startTime: b.slot_start,
          endTime: b.slot_end,
          serviceName: b.service_name,
          customerName: b.customer_name,
          customerEmail: b.customer_email,
        })),
      });
    }

    // Read YAML config from database
    const config = yaml.load(business.config_yaml) as { availabilityExceptions?: unknown[] };

    // Return availability exceptions
    const exceptions = config.availabilityExceptions || [];

    return NextResponse.json({
      success: true,
      exceptions,
    });
  } catch (error) {
    console.error('Error fetching availability exceptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability exceptions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/availability-exceptions
 * Add a new availability exception (off day)
 *
 * Body: { date: "YYYY-MM-DD", reason: string, closed?: boolean, open?: "HH:MM", close?: "HH:MM" }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Only owners can manage availability
    if (payload.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only business owners can manage availability exceptions' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { date, reason, closed = true, open, close } = body;

    // Validate required fields
    if (!date || !reason) {
      return NextResponse.json(
        { error: 'Date and reason are required' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Date must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    // Validate date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exceptionDate = new Date(date);

    if (exceptionDate < today) {
      return NextResponse.json(
        { error: 'Cannot create off days in the past' },
        { status: 400 }
      );
    }

    // Get business ID from user
    const db = getDbClient();
    const [user] = await db`
      SELECT business_id
      FROM users
      WHERE id = ${payload.sub}
        AND deleted_at IS NULL
    `;

    if (!user || !user.business_id) {
      return NextResponse.json(
        { error: 'User has no associated business' },
        { status: 404 }
      );
    }

    // Get business config from database
    const [business] = await db`
      SELECT config_yaml, subdomain
      FROM businesses
      WHERE id = ${user.business_id}
        AND deleted_at IS NULL
        AND status = 'active'
    `;

    if (!business || !business.config_yaml) {
      return NextResponse.json(
        { error: 'Business configuration not found' },
        { status: 404 }
      );
    }

    // Read YAML config from database
    const config = yaml.load(business.config_yaml) as { availabilityExceptions?: unknown[] };

    // Initialize availabilityExceptions if not exists
    if (!config.availabilityExceptions) {
      config.availabilityExceptions = [];
    }

    // Check if exception already exists for this date
    const existingIndex = (config.availabilityExceptions || []).findIndex(
      (ex: { date: string }) => ex.date === date
    );

    const newException: AvailabilityException = {
      date,
      reason,
      closed,
      ...(open && close && !closed ? { open, close } : {}),
    };

    if (existingIndex >= 0) {
      // Update existing exception
      config.availabilityExceptions[existingIndex] = newException;
    } else {
      // Add new exception
      config.availabilityExceptions.push(newException);
    }

    // Sort exceptions by date
    if (config.availabilityExceptions) {
      (config.availabilityExceptions as Array<{ date: string }>).sort((a, b) =>
        a.date.localeCompare(b.date)
      );
    }

    // Validate the updated config against schema
    const validationResult = TenantConfigSchema.safeParse(config);
    if (!validationResult.success) {
      console.error('Config validation failed:', validationResult.error);
      return NextResponse.json(
        {
          error: 'Invalid configuration after update',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    // Write updated config back to database
    const updatedYaml = yaml.dump(config, {
      indent: 2,
      lineWidth: -1, // Don't wrap lines
      noRefs: true,
    });

    await db`
      UPDATE businesses
      SET config_yaml = ${updatedYaml},
          updated_at = NOW()
      WHERE id = ${user.business_id}
    `;

    // Clear config cache to force reload
    clearConfigCache(business.subdomain);

    return NextResponse.json({
      success: true,
      exception: newException,
      message: existingIndex >= 0 ? 'Off day updated successfully' : 'Off day added successfully',
    });
  } catch (error) {
    console.error('Error adding availability exception:', error);
    return NextResponse.json(
      { error: 'Failed to add availability exception' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/availability-exceptions
 * Remove an availability exception by date
 *
 * Query param: date (YYYY-MM-DD)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Only owners can manage availability
    if (payload.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only business owners can manage availability exceptions' },
        { status: 403 }
      );
    }

    // Get date from query params
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Get business ID from user
    const db = getDbClient();
    const [user] = await db`
      SELECT business_id
      FROM users
      WHERE id = ${payload.sub}
        AND deleted_at IS NULL
    `;

    if (!user || !user.business_id) {
      return NextResponse.json(
        { error: 'User has no associated business' },
        { status: 404 }
      );
    }

    // Get business config from database
    const [business] = await db`
      SELECT config_yaml, subdomain
      FROM businesses
      WHERE id = ${user.business_id}
        AND deleted_at IS NULL
        AND status = 'active'
    `;

    if (!business || !business.config_yaml) {
      return NextResponse.json(
        { error: 'Business configuration not found' },
        { status: 404 }
      );
    }

    // Read YAML config from database
    const config = yaml.load(business.config_yaml) as { availabilityExceptions?: unknown[] };

    // Check if exception exists
    const initialLength = config.availabilityExceptions?.length || 0;

    if (!config.availabilityExceptions) {
      return NextResponse.json(
        { error: 'No availability exceptions found' },
        { status: 404 }
      );
    }

    // Remove the exception
    config.availabilityExceptions = (config.availabilityExceptions || []).filter(
      (ex: { date: string }) => ex.date !== date
    );

    if (config.availabilityExceptions.length === initialLength) {
      return NextResponse.json(
        { error: 'Availability exception not found for this date' },
        { status: 404 }
      );
    }

    // Validate the updated config against schema
    const validationResult = TenantConfigSchema.safeParse(config);
    if (!validationResult.success) {
      console.error('Config validation failed:', validationResult.error);
      return NextResponse.json(
        {
          error: 'Invalid configuration after update',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    // Write updated config back to database
    const updatedYaml = yaml.dump(config, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
    });

    await db`
      UPDATE businesses
      SET config_yaml = ${updatedYaml},
          updated_at = NOW()
      WHERE id = ${user.business_id}
    `;

    // Clear config cache to force reload
    clearConfigCache(business.subdomain);

    return NextResponse.json({
      success: true,
      message: 'Off day removed successfully',
    });
  } catch (error) {
    console.error('Error deleting availability exception:', error);
    return NextResponse.json(
      { error: 'Failed to delete availability exception' },
      { status: 500 }
    );
  }
}
