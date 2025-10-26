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
export function categorizeError(error: any): ErrorDetails {
  // Validation errors from API
  if (error?.details?.errors || error?.errors) {
    return {
      type: 'validation',
      message: error.message || 'Please correct the validation errors',
      errors: error.details?.errors || error.errors,
      retryable: false,
    };
  }

  // Network errors
  if (
    error?.name === 'NetworkError' ||
    error?.name === 'AbortError' ||
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ETIMEDOUT' ||
    error?.message?.includes('fetch') ||
    error?.message?.includes('network')
  ) {
    return {
      type: 'network',
      message: 'Network connection error. Please check your internet connection.',
      retryable: true,
    };
  }

  // Server errors (5xx)
  if (error?.status >= 500 && error?.status < 600) {
    return {
      type: 'server',
      message: error.message || 'Server error. Please try again later.',
      retryable: true,
    };
  }

  // Authentication errors
  if (error?.status === 401 || error?.status === 403) {
    return {
      type: 'auth',
      message: error.message || 'Authentication required. Please log in again.',
      retryable: false,
    };
  }

  // Not found errors
  if (error?.status === 404) {
    return {
      type: 'not_found',
      message: error.message || 'The requested resource was not found.',
      retryable: false,
    };
  }

  // Rate limiting
  if (error?.status === 429) {
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
