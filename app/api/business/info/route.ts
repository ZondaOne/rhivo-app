import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/db/client';

/**
 * GET /api/business/info?subdomain=xxx
 *
 * Get business basic information by subdomain
 * Public endpoint (no auth required)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const subdomain = searchParams.get('subdomain');

    if (!subdomain) {
      return NextResponse.json(
        {
          success: false,
          error: 'Subdomain parameter is required',
        },
        { status: 400 }
      );
    }

    const db = getDbClient();
    const businessResult = await db`
      SELECT
        id,
        subdomain,
        name,
        timezone,
        status
      FROM businesses
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

    const business = businessResult[0];

    return NextResponse.json({
      success: true,
      id: business.id,
      subdomain: business.subdomain,
      name: business.name,
      timezone: business.timezone,
      status: business.status,
    }, {
      headers: {
        // Business info rarely changes - cache for 10 minutes
        // Public endpoint, safe for CDN caching
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    console.error('Error fetching business info:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
