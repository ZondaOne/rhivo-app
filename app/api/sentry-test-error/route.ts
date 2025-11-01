import { NextRequest, NextResponse } from 'next/server';
import { reportCriticalError, CriticalErrorType } from '@/lib/monitoring/critical-errors';

/**
 * Test endpoint to verify Sentry error tracking is working
 * DELETE THIS ENDPOINT IN PRODUCTION or protect it with authentication
 */
export async function GET(request: NextRequest) {
  // Check if we're in development mode
  const isDev = process.env.NODE_ENV === 'development';

  if (!isDev) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  // Create a test critical error
  const testError = new Error('TEST: Database connection failed - This is a test error from Sentry verification');

  reportCriticalError({
    errorType: CriticalErrorType.DATABASE_CONNECTION,
    severity: 'critical',
    error: testError,
    metadata: {
      businessId: 'test-business-123',
      businessName: 'Test Business',
      serviceId: 'test-service-456',
      serviceName: 'Test Service',
      customerEmail: 'test@example.com',
      timestamp: new Date().toISOString(),
      note: 'This is a test error to verify Sentry integration',
    },
  });

  return NextResponse.json({
    success: true,
    message: 'Test error sent to Sentry. Check your email and Sentry dashboard in 1-2 minutes.',
    note: 'If you are in production, this error was NOT sent (endpoint is disabled in production)',
  });
}
