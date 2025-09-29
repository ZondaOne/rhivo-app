import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/tokens';

/**
 * Auth middleware to verify JWT and extract claims
 */
export function withAuth(
  handler: (request: NextRequest, context: any) => Promise<NextResponse>,
  options: { requireRole?: ('owner' | 'staff' | 'customer')[] } = {}
) {
  return async (request: NextRequest, context: any) => {
    try {
      // Get token from Authorization header
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Missing or invalid authorization header' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);

      // Verify token
      let payload;
      try {
        payload = verifyAccessToken(token);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      // Check required role
      if (options.requireRole && !options.requireRole.includes(payload.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      // Add user info to request headers for downstream use
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', payload.sub);
      requestHeaders.set('x-user-role', payload.role);
      if (payload.business_id) {
        requestHeaders.set('x-business-id', payload.business_id);
      }

      // Create new request with updated headers
      const newRequest = new NextRequest(request, {
        headers: requestHeaders,
      });

      // Call handler with authenticated request
      return handler(newRequest, context);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      );
    }
  };
}