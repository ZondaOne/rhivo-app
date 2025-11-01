import { NextRequest, NextResponse } from 'next/server';

/**
 * CORS Configuration for Rhivo App
 *
 * Allowed origins:
 * - https://rhivo.app
 * - https://www.rhivo.app
 * - https://*.rhivo.app (all subdomains)
 * - http://localhost:* (development only)
 */

const ALLOWED_ORIGINS = [
  'https://rhivo.app',
  'https://www.rhivo.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

/**
 * Check if an origin is allowed
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;

  // Exact match
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  // Check wildcard subdomain match for rhivo.app
  if (origin.match(/^https:\/\/[a-z0-9-]+\.rhivo\.app$/)) {
    return true;
  }

  // Allow localhost with any port in development
  if (process.env.NODE_ENV === 'development' && origin.match(/^http:\/\/localhost:\d+$/)) {
    return true;
  }

  return false;
}

/**
 * Add CORS headers to a response
 */
export function addCorsHeaders(response: NextResponse, origin: string | null): NextResponse {
  if (isAllowedOrigin(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin!);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  return response;
}

/**
 * Handle OPTIONS preflight request
 */
export function handleCorsPreflightRequest(request: NextRequest): NextResponse {
  const origin = request.headers.get('origin');
  const response = new NextResponse(null, { status: 204 });

  return addCorsHeaders(response, origin);
}

/**
 * Wrapper to add CORS support to API route handlers
 */
export function withCors(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any) => {
    const origin = request.headers.get('origin');

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return handleCorsPreflightRequest(request);
    }

    // Call the handler
    const response = await handler(request, context);

    // Add CORS headers to response
    return addCorsHeaders(response, origin);
  };
}
