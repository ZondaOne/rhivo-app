/**
 * Standardized Error Handling Utilities
 *
 * Implements UX-002 improvement:
 * - Toast notifications for transient errors (network, server)
 * - Inline messages for validation errors
 * - Retry buttons for recoverable errors
 */

export type ErrorType =
  | 'validation'      // Form validation errors - show inline
  | 'network'         // Network/connectivity errors - show toast with retry
  | 'server'          // Server errors - show toast with retry
  | 'auth'            // Authentication errors - show toast
  | 'not_found'       // Resource not found - show inline
  | 'unknown';        // Unknown errors - show toast

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  field?: string;
  retryable: boolean;
  errors?: Record<string, string[]>; // Validation errors by field
}

/**
 * Categorizes an error based on its properties
 */
export function categorizeError(error: unknown): ErrorDetails {
  const err = error as Record<string, unknown>;

  // Validation errors from API
  if (err?.details?.errors || err?.errors) {
    return {
      type: 'validation',
      message: (err.message as string) || 'Please correct the validation errors',
      errors: (err.details?.errors || err.errors) as Record<string, string[]>,
      retryable: false,
    };
  }

  // Network errors
  if (
    err?.name === 'NetworkError' ||
    err?.name === 'AbortError' ||
    err?.code === 'ECONNREFUSED' ||
    err?.code === 'ETIMEDOUT' ||
    (err?.message as string)?.includes('fetch') ||
    (err?.message as string)?.includes('network')
  ) {
    return {
      type: 'network',
      message: 'Network connection error. Please check your internet connection.',
      retryable: true,
    };
  }

  // Server errors (5xx)
  if ((err?.status as number) >= 500 && (err?.status as number) < 600) {
    return {
      type: 'server',
      message: (err.message as string) || 'Server error. Please try again later.',
      retryable: true,
    };
  }

  // Authentication errors
  if (err?.status === 401 || err?.status === 403) {
    return {
      type: 'auth',
      message: (err.message as string) || 'Authentication required. Please log in again.',
      retryable: false,
    };
  }

  // Not found errors
  if (err?.status === 404) {
    return {
      type: 'not_found',
      message: (err.message as string) || 'The requested resource was not found.',
      retryable: false,
    };
  }

  // Rate limiting
  if (err?.status === 429) {
    return {
      type: 'server',
      message: 'Too many requests. Please wait a moment and try again.',
      retryable: true,
    };
  }

  // Unknown errors
  return {
    type: 'unknown',
    message: error?.message || 'An unexpected error occurred. Please try again.',
    retryable: true,
  };
}

/**
 * Determines if an error should be shown as a toast
 */
export function shouldShowToast(errorType: ErrorType): boolean {
  return ['network', 'server', 'auth', 'unknown'].includes(errorType);
}

/**
 * Determines if an error should be shown inline
 */
export function shouldShowInline(errorType: ErrorType): boolean {
  return ['validation', 'not_found'].includes(errorType);
}

/**
 * Gets the appropriate toast variant for an error type
 */
export function getToastVariant(errorType: ErrorType): 'error' | 'warning' | 'info' {
  switch (errorType) {
    case 'network':
    case 'server':
    case 'auth':
      return 'error';
    case 'unknown':
      return 'error';
    default:
      return 'warning';
  }
}
