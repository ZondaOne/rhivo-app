import * as Sentry from "@sentry/nextjs";
import { env } from "@/lib/env";

/**
 * Critical error types that require immediate notification
 */
export enum CriticalErrorType {
  DATABASE_CONNECTION = 'database_connection',
  DATABASE_TIMEOUT = 'database_timeout',
  DATABASE_POOL_EXHAUSTED = 'database_pool_exhausted',
  BOOKING_SYSTEM_FAILURE = 'booking_system_failure',
  PAYMENT_FAILURE = 'payment_failure',
}

/**
 * Context for critical errors to provide detailed information
 */
export interface CriticalErrorContext {
  errorType: CriticalErrorType;
  severity: 'critical' | 'high';
  error: Error;
  metadata?: {
    businessId?: string;
    businessName?: string;
    serviceId?: string;
    serviceName?: string;
    customerId?: string;
    customerEmail?: string;
    appointmentId?: string;
    reservationId?: string;
    timestamp?: string;
    [key: string]: any;
  };
}

/**
 * Determines if an error is a critical database error
 */
export function isDatabaseError(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();
  const errorString = error.toString().toLowerCase();

  // Connection errors
  const connectionPatterns = [
    'connection',
    'connect econnrefused',
    'connect etimedout',
    'enotfound',
    'unable to connect',
    'connection refused',
    'connection terminated',
    'network error',
    'socket',
  ];

  // Timeout errors
  const timeoutPatterns = [
    'timeout',
    'timed out',
    'query timeout',
    'statement timeout',
  ];

  // Pool exhaustion
  const poolPatterns = [
    'pool',
    'too many connections',
    'connection limit',
    'max connections',
  ];

  const allPatterns = [...connectionPatterns, ...timeoutPatterns, ...poolPatterns];

  return allPatterns.some(pattern =>
    errorMessage.includes(pattern) || errorString.includes(pattern)
  );
}

/**
 * Determines the specific type of database error
 */
export function getDatabaseErrorType(error: Error): CriticalErrorType {
  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return CriticalErrorType.DATABASE_TIMEOUT;
  }

  if (errorMessage.includes('pool') || errorMessage.includes('too many connections')) {
    return CriticalErrorType.DATABASE_POOL_EXHAUSTED;
  }

  return CriticalErrorType.DATABASE_CONNECTION;
}

/**
 * Send critical error to Sentry with proper context and tags
 * This will trigger email notifications if configured in Sentry
 */
export function reportCriticalError(context: CriticalErrorContext): void {
  const { errorType, severity, error, metadata } = context;

  // Only report in production
  if (env.NODE_ENV !== 'production') {
    console.error('[CRITICAL ERROR - DEV MODE]', {
      errorType,
      severity,
      error: error.message,
      metadata,
    });
    return;
  }

  // Set Sentry context
  Sentry.withScope((scope) => {
    // Set error level
    scope.setLevel(severity === 'critical' ? 'fatal' : 'error');

    // Set tags for filtering in Sentry
    scope.setTag('error_type', errorType);
    scope.setTag('severity', severity);
    scope.setTag('critical', 'true');

    // Add metadata as context
    if (metadata) {
      if (metadata.businessId) {
        scope.setTag('business_id', metadata.businessId);
        scope.setContext('business', {
          id: metadata.businessId,
          name: metadata.businessName,
        });
      }

      if (metadata.serviceId) {
        scope.setContext('service', {
          id: metadata.serviceId,
          name: metadata.serviceName,
        });
      }

      if (metadata.customerId || metadata.customerEmail) {
        scope.setUser({
          id: metadata.customerId,
          email: metadata.customerEmail,
        });
      }

      if (metadata.appointmentId) {
        scope.setContext('appointment', {
          id: metadata.appointmentId,
        });
      }

      if (metadata.reservationId) {
        scope.setContext('reservation', {
          id: metadata.reservationId,
        });
      }

      // Add all metadata as extra context
      scope.setContext('error_metadata', metadata);
    }

    // Add fingerprint for grouping similar errors
    scope.setFingerprint([errorType, error.message]);

    // Capture the error
    Sentry.captureException(error);
  });

  // Also log to console for immediate visibility in logs
  console.error('[CRITICAL ERROR]', {
    errorType,
    severity,
    error: error.message,
    stack: error.stack,
    metadata,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Wrapper for database operations that automatically reports critical errors
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  context?: Partial<CriticalErrorContext['metadata']>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Error && isDatabaseError(error)) {
      reportCriticalError({
        errorType: getDatabaseErrorType(error),
        severity: 'critical',
        error,
        metadata: context,
      });
    }
    throw error;
  }
}

/**
 * Report booking system failures with full context
 */
export function reportBookingFailure(
  error: Error,
  context: {
    businessId: string;
    businessName?: string;
    serviceId: string;
    serviceName?: string;
    customerId?: string;
    customerEmail?: string;
    timestamp: string;
    slotStart?: string;
    slotEnd?: string;
  }
): void {
  reportCriticalError({
    errorType: CriticalErrorType.BOOKING_SYSTEM_FAILURE,
    severity: 'critical',
    error,
    metadata: {
      ...context,
      component: 'booking_system',
    },
  });
}
