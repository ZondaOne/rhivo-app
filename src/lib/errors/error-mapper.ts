/**
 * Centralized error mapping utility for user-friendly error messages
 * Maps HTTP status codes and custom error codes to business owner-friendly messages
 */

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, any>;
}

/**
 * Error message mapping for common HTTP status codes
 */
const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This resource was modified by another user. Please refresh and try again.',
  422: 'Invalid data provided. Please check your input.',
  500: 'An unexpected error occurred. Please try again later.',
  502: 'Service temporarily unavailable. Please try again in a moment.',
  503: 'Service temporarily unavailable. Please try again in a moment.',
};

/**
 * Error message mapping for custom business logic error codes
 */
const BUSINESS_ERROR_MESSAGES: Record<string, string> = {
  // Booking and scheduling errors
  'NO_CAPACITY': 'This time slot is fully booked. Please choose another time.',
  'SLOT_UNAVAILABLE': 'This time slot is no longer available. Please refresh and choose another time.',
  'MAX_SIMULTANEOUS_BOOKINGS_REACHED': 'Maximum number of bookings for this time slot has been reached. Please choose another time.',
  'OUTSIDE_BUSINESS_HOURS': 'This time is outside of business hours. Please choose a time during operating hours.',
  'OUTSIDE_ADVANCE_BOOKING_WINDOW': 'This date is too far in the future. Please choose a date within the allowed booking window.',
  'APPOINTMENT_IN_PAST': 'Cannot schedule appointments in the past.',

  // Concurrent modification errors
  'CONFLICT': 'This appointment was modified by another user. Please refresh and try again.',
  'APPOINTMENT_MODIFIED': 'This appointment has been modified. Please refresh and try again.',
  'VERSION_MISMATCH': 'This appointment was updated by someone else. Please refresh and try again.',

  // Service and business errors
  'SERVICE_NOT_FOUND': 'This service is no longer available. Please choose another service.',
  'SERVICE_INACTIVE': 'This service is currently unavailable.',
  'BUSINESS_NOT_FOUND': 'Business not found.',
  'BUSINESS_INACTIVE': 'This business is currently inactive.',

  // Appointment state errors
  'APPOINTMENT_CANCELLED': 'This appointment has already been cancelled.',
  'APPOINTMENT_COMPLETED': 'This appointment has already been completed.',
  'APPOINTMENT_NOT_FOUND': 'Appointment not found. It may have been deleted.',
  'INVALID_STATUS_TRANSITION': 'Cannot change appointment to this status.',

  // Permission errors
  'NOT_AUTHORIZED': 'You do not have permission to perform this action.',
  'BUSINESS_OWNERSHIP_REQUIRED': 'You must be a business owner to perform this action.',

  // Validation errors
  'INVALID_TIME_SLOT': 'Invalid time slot selected.',
  'INVALID_SERVICE_DURATION': 'Invalid service duration.',
  'REQUIRED_FIELD_MISSING': 'Required fields are missing. Please fill in all required information.',
  'INVALID_EMAIL': 'Invalid email address provided.',
  'INVALID_PHONE': 'Invalid phone number provided.',
};

/**
 * Map any error to a user-friendly message
 */
export function mapErrorToUserMessage(error: any): string {
  // Handle null/undefined
  if (!error) {
    return HTTP_ERROR_MESSAGES[500];
  }

  // Handle custom business error codes first (highest priority)
  if (error.code && BUSINESS_ERROR_MESSAGES[error.code]) {
    return BUSINESS_ERROR_MESSAGES[error.code];
  }

  // Handle error message that contains specific keywords
  if (error.message) {
    const message = error.message.toLowerCase();

    if (message.includes('no available capacity') || message.includes('fully booked')) {
      return BUSINESS_ERROR_MESSAGES['NO_CAPACITY'];
    }

    if (message.includes('max simultaneous bookings') || message.includes('maximum bookings')) {
      return BUSINESS_ERROR_MESSAGES['MAX_SIMULTANEOUS_BOOKINGS_REACHED'];
    }

    if (message.includes('modified') || message.includes('version')) {
      return BUSINESS_ERROR_MESSAGES['CONFLICT'];
    }

    if (message.includes('service not found') || message.includes('service is no longer')) {
      return BUSINESS_ERROR_MESSAGES['SERVICE_NOT_FOUND'];
    }

    if (message.includes('outside business hours')) {
      return BUSINESS_ERROR_MESSAGES['OUTSIDE_BUSINESS_HOURS'];
    }

    if (message.includes('cancelled')) {
      return BUSINESS_ERROR_MESSAGES['APPOINTMENT_CANCELLED'];
    }
  }

  // Handle HTTP status codes
  if (error.status && HTTP_ERROR_MESSAGES[error.status]) {
    return HTTP_ERROR_MESSAGES[error.status];
  }

  // Handle Error instances with messages that don't match patterns above
  if (error instanceof Error && error.message && !error.message.startsWith('HTTP ')) {
    return error.message;
  }

  // Default fallback
  return HTTP_ERROR_MESSAGES[500];
}

/**
 * Create a standardized API error object
 */
export function createApiError(
  message: string,
  code?: string,
  status?: number,
  details?: Record<string, any>
): ApiError {
  return {
    message,
    code,
    status,
    details,
  };
}

/**
 * Check if an error is a specific type
 */
export function isErrorType(error: any, code: string): boolean {
  return error?.code === code || error?.message?.includes(code);
}

/**
 * Check if error is a conflict/concurrent modification error
 */
export function isConflictError(error: any): boolean {
  return (
    error?.status === 409 ||
    error?.code === 'CONFLICT' ||
    error?.code === 'VERSION_MISMATCH' ||
    error?.message?.toLowerCase().includes('modified')
  );
}

/**
 * Check if error is a capacity/availability error
 */
export function isCapacityError(error: any): boolean {
  return (
    error?.code === 'NO_CAPACITY' ||
    error?.code === 'MAX_SIMULTANEOUS_BOOKINGS_REACHED' ||
    error?.code === 'SLOT_UNAVAILABLE' ||
    error?.message?.toLowerCase().includes('capacity') ||
    error?.message?.toLowerCase().includes('fully booked')
  );
}
