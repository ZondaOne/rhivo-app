import { NextRequest, NextResponse } from 'next/server';
import { loadConfigByBusinessId } from '@/lib/config/config-loader';
import { verifyAccessToken } from '@/lib/auth/tokens';
import { getDbClient } from '@/db/client';
import { requireBusinessOwnership } from '@/lib/auth/verify-ownership';

/**
 * GET /api/config/business?businessId=xxx
 *
 * Loads tenant configuration for a business by ID.
 * Requires authentication - for use in owner dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid authorization header',
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired token',
        },
        { status: 401 }
      );
    }

    // Get business ID from query params
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          error: 'businessId parameter is required',
        },
        { status: 400 }
      );
    }

    const sql = getDbClient();

    // CRITICAL: Verify user owns this business before loading config
    const unauthorizedResponse = await requireBusinessOwnership(sql, decoded.sub, businessId);
    if (unauthorizedResponse) {
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to access this business',
        },
        { status: 403 }
      );
    }

    // Load config by business ID
    const result = await loadConfigByBusinessId(businessId);

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
    console.error('Error loading business config:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
