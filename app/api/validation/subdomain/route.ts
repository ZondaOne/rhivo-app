import { NextRequest, NextResponse } from 'next/server';
import { validateSubdomain, validateSubdomainFormat } from '@/lib/validation/subdomain';

/**
 * GET /api/validation/subdomain?subdomain=example
 * Check if a subdomain is valid and available
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get('subdomain');

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain parameter is required' },
        { status: 400 }
      );
    }

    // Check format first (fast, synchronous)
    const formatCheck = validateSubdomainFormat(subdomain);
    if (!formatCheck.valid) {
      return NextResponse.json({
        valid: false,
        available: false,
        error: formatCheck.error,
      });
    }

    // Check availability (database query)
    const result = await validateSubdomain(subdomain);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Subdomain validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
