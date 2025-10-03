import { NextRequest, NextResponse } from 'next/server';
import { loadConfigBySubdomain } from '@/lib/config/config-loader';

/**
 * GET /api/config/tenant?subdomain=xxx
 *
 * Loads tenant configuration for the booking page.
 * This endpoint is public and doesn't require authentication.
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

    const result = await loadConfigBySubdomain(subdomain);

    if (!result.success || !result.config) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Configuration not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      config: result.config,
      subdomain: result.subdomain,
    });
  } catch (error) {
    console.error('Error loading tenant config:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
