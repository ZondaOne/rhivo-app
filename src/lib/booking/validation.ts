/**
 * Centralized Booking Validation
 *
 * Provides consistent validation rules across all booking entry points:
 * - Customer booking API (/api/booking/reserve)
 * - Owner manual appointment API (/api/appointments/manual)
 * - Owner reschedule API (/api/appointments/reschedule)
 *
 * Enforces:
 * 1. Off-time validation (breaks, closed days, holidays) - Step 7f2
 * 2. Buffer time validation - Step 7f
 * 3. Business hours validation
 * 4. Advance booking limits
 * 5. 5-minute grain alignment
 */

import { TenantConfig } from '@/lib/config/tenant-schema';
import {
  generateOffTimeIntervals,
  isTimeAvailable,
  getIntersectingOffTimes,
} from './off-time-system';

export interface BookingValidationParams {
  config: TenantConfig;
  slotStart: Date;
  slotEnd: Date;
  bufferBefore: number;
  bufferAfter: number;
  skipAdvanceLimitCheck?: boolean; // Set to true for owner manual appointments
  skipPastTimeCheck?: boolean; // Set to true for very specific use cases (default false)
}

export interface BookingValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

/**
 * Validates a booking time against all business rules
 *
 * This function ensures consistency across all booking entry points by
 * enforcing the same validation logic everywhere.
 *
 * @param params - Validation parameters including config, times, and buffers
 * @returns Validation result with error details if invalid
 */
export function validateBookingTime(
  params: BookingValidationParams
): BookingValidationResult {
  const {
    config,
    slotStart,
    slotEnd,
    bufferBefore,
    bufferAfter,
    skipAdvanceLimitCheck = false,
    skipPastTimeCheck = false,
  } = params;

  const now = new Date();

  // 1. Check if in the past (with 5-minute grace period for clock differences)
  // Allow rescheduling up to 5 minutes in the past to account for:
  // - Timezone/clock differences
  // - Time taken for user to click confirm
  // - Network latency
  if (!skipPastTimeCheck) {
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    if (slotStart < fiveMinutesAgo) {
      return {
        valid: false,
        error: 'Cannot schedule in the past',
        code: 'PAST_TIME',
      };
    }
  }

  // 2. Check advance booking limits (unless skipped for owner appointments)
  // Owners can create appointments further in advance than customers
  if (!skipAdvanceLimitCheck) {
    const maxAdvanceDate = new Date(now);
    maxAdvanceDate.setDate(
      maxAdvanceDate.getDate() + config.bookingLimits.advanceBookingDays
    );

    if (slotStart > maxAdvanceDate) {
      return {
        valid: false,
        error: `Cannot book more than ${config.bookingLimits.advanceBookingDays} days in advance`,
        code: 'BEYOND_ADVANCE_BOOKING_LIMIT',
      };
    }

    const minAdvanceTime = new Date(now);
    minAdvanceTime.setMinutes(
      minAdvanceTime.getMinutes() + config.bookingLimits.minAdvanceBookingMinutes
    );

    if (slotStart < minAdvanceTime) {
      return {
        valid: false,
        error: `Must book at least ${config.bookingLimits.minAdvanceBookingMinutes} minutes in advance`,
        code: 'BELOW_MIN_ADVANCE_BOOKING',
      };
    }
  }

  // 3. Calculate effective time including buffers
  // Buffer before: setup/cleanup time before service
  // Buffer after: cleanup/turnaround time after service
  const effectiveStart = new Date(slotStart);
  effectiveStart.setMinutes(effectiveStart.getMinutes() - bufferBefore);

  const effectiveEnd = new Date(slotEnd);
  effectiveEnd.setMinutes(effectiveEnd.getMinutes() + bufferAfter);

  // 4. Generate off-time intervals
  // This includes:
  // - Breaks between availability slots (e.g., lunch break 13:00-14:00)
  // - Closed days (availability.enabled = false)
  // - Holidays (availabilityExceptions with closed = true)
  // - Time outside business hours (before first slot, after last slot)
  const offTimes = generateOffTimeIntervals(
    config,
    slotStart,
    slotEnd,
    config.business.timezone
  );

  // 5. Check if effective time (including buffers) conflicts with off-time
  // This is the CRITICAL validation that steps 7f1 and 7f2 enable
  if (!isTimeAvailable(effectiveStart, effectiveEnd, offTimes)) {
    const intersecting = getIntersectingOffTimes(
      effectiveStart,
      effectiveEnd,
      offTimes
    );
    const reason =
      intersecting.length > 0 ? intersecting[0].reason : 'Time unavailable';

    return {
      valid: false,
      error: `Cannot schedule during ${reason.toLowerCase()}`,
      code: 'OFF_TIME_CONFLICT',
    };
  }

  // All validations passed
  return { valid: true };
}

/**
 * Snap a time to the nearest 5-minute grain block
 *
 * The 5-minute grain system ensures:
 * - Consistent time intervals across the platform
 * - Clean visual alignment in calendar views
 * - Simplified overlap detection
 *
 * Examples:
 * - 9:03 -> 9:05 (rounds up)
 * - 9:07 -> 9:05 (rounds down)
 * - 9:08 -> 9:10 (rounds up)
 * - 9:10 -> 9:10 (already aligned)
 *
 * @param time - The time to snap
 * @returns New Date snapped to 5-minute grain
 */
export function snapToGrain(time: Date): Date {
  const GRAIN_MINUTES = 5;
  const snapped = new Date(time);
  const minutes = snapped.getMinutes();
  const remainder = minutes % GRAIN_MINUTES;

  if (remainder === 0) {
    return snapped; // Already aligned
  }

  // Round to nearest 5-minute block
  const adjustment =
    remainder >= GRAIN_MINUTES / 2 ? GRAIN_MINUTES - remainder : -remainder;

  snapped.setMinutes(minutes + adjustment);
  snapped.setSeconds(0);
  snapped.setMilliseconds(0);

  return snapped;
}

/**
 * Validates and snaps booking time to grain
 *
 * Convenience function that combines grain snapping and validation.
 * Use this when you want to accept user input and normalize it.
 *
 * @param params - Same as validateBookingTime, but slotStart/slotEnd will be snapped
 * @returns Validation result with snapped times if valid
 */
export function validateAndSnapBookingTime(
  params: BookingValidationParams
): BookingValidationResult & {
  snappedStart?: Date;
  snappedEnd?: Date;
} {
  // Snap times to grain first
  const snappedStart = snapToGrain(params.slotStart);
  const snappedEnd = snapToGrain(params.slotEnd);

  // Validate with snapped times
  const validation = validateBookingTime({
    ...params,
    slotStart: snappedStart,
    slotEnd: snappedEnd,
  });

  if (!validation.valid) {
    return validation;
  }

  return {
    valid: true,
    snappedStart,
    snappedEnd,
  };
}
