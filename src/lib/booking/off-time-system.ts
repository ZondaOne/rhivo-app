/**
 * Unified Off-Time System (Step 7f2)
 *
 * Treats all unavailable time intervals uniformly:
 * - Breaks (gaps between availability slots)
 * - Closed days (availability.enabled = false)
 * - Holidays (availabilityExceptions with closed = true)
 * - Custom exceptions (availabilityExceptions with special hours)
 *
 * This system ensures that bookings cannot span across breaks, closed periods,
 * or other off-time intervals, maintaining data consistency with 5-minute grain precision.
 *
 * TIMEZONE HANDLING:
 * All time calculations use the business's timezone to ensure correct day boundaries
 * and business hours alignment. See docs/TIMEZONE_HANDLING.md for details.
 */

import { TenantConfig, DailyAvailability, AvailabilityException } from '@/lib/config/tenant-schema';
import { parseTime, getStartOfDay, getEndOfDay } from '@/lib/utils/timezone';

/**
 * Represents a time interval when the business is unavailable
 */
export interface OffTimeInterval {
  start: Date;
  end: Date;
  reason: string;
  type: 'closed_day' | 'break' | 'holiday' | 'exception';
}

/**
 * Generate all off-time intervals for a given date range
 *
 * This function aggregates all sources of unavailable time:
 * 1. Closed days (availability.enabled = false)
 * 2. Breaks (gaps between slots in availability.slots)
 * 3. Holidays (availabilityExceptions with closed = true)
 * 4. Custom exceptions (availabilityExceptions with modified hours)
 *
 * @param config - Tenant configuration with availability rules
 * @param startDate - Start of date range to check (should be in business timezone)
 * @param endDate - End of date range to check (should be in business timezone)
 * @param timezone - Business timezone (optional, defaults to config.business.timezone)
 * @returns Array of off-time intervals sorted chronologically
 */
export function generateOffTimeIntervals(
  config: TenantConfig,
  startDate: Date,
  endDate: Date,
  timezone?: string
): OffTimeInterval[] {
  const businessTimezone = timezone || config.business.timezone;
  const offTimes: OffTimeInterval[] = [];

  // Iterate through each day in the range
  let currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);

  const endDateOnly = new Date(endDate);
  endDateOnly.setHours(23, 59, 59, 999);

  while (currentDate <= endDateOnly) {
    const dayOffTimes = generateOffTimeIntervalsForDay(currentDate, config, businessTimezone);
    offTimes.push(...dayOffTimes);

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Sort by start time for efficient searching
  offTimes.sort((a, b) => a.start.getTime() - b.start.getTime());

  return offTimes;
}

/**
 * Generate off-time intervals for a single day
 *
 * @param timezone - Business timezone for correct time calculations
 */
function generateOffTimeIntervalsForDay(
  date: Date,
  config: TenantConfig,
  timezone: string
): OffTimeInterval[] {
  const offTimes: OffTimeInterval[] = [];
  const dayOfWeek = getDayOfWeek(date);
  const dateString = formatDateYYYYMMDD(date);

  // Check for exceptions first (they override regular availability)
  const exception = config.availabilityExceptions.find(e => e.date === dateString);

  if (exception?.closed) {
    // Entire day is closed (use business timezone for day boundaries)
    const dayStart = getStartOfDay(date, timezone);
    const dayEnd = getEndOfDay(date, timezone);

    offTimes.push({
      start: dayStart,
      end: dayEnd,
      reason: exception.reason || 'Closed',
      type: 'holiday',
    });

    return offTimes;
  }

  // Get regular availability for this day
  const availability = config.availability.find(a => a.day === dayOfWeek);

  if (!availability || !availability.enabled) {
    // Day is not enabled (closed day - use business timezone)
    const dayStart = getStartOfDay(date, timezone);
    const dayEnd = getEndOfDay(date, timezone);

    offTimes.push({
      start: dayStart,
      end: dayEnd,
      reason: 'Closed',
      type: 'closed_day',
    });

    return offTimes;
  }

  // Determine which slots to use (exception hours or regular hours)
  let slots = availability.slots || [];

  if (exception && exception.open && exception.close) {
    // Exception with modified hours
    slots = [{ open: exception.open, close: exception.close }];
  }

  if (slots.length === 0) {
    // No slots means entire day is off-time (use business timezone)
    const dayStart = getStartOfDay(date, timezone);
    const dayEnd = getEndOfDay(date, timezone);

    offTimes.push({
      start: dayStart,
      end: dayEnd,
      reason: 'Closed',
      type: 'closed_day',
    });

    return offTimes;
  }

  // Generate off-time intervals for breaks between slots and before/after business hours
  // Use business timezone for day boundaries
  const dayStart = getStartOfDay(date, timezone);
  const dayEnd = getEndOfDay(date, timezone);

  // Off-time before first slot (midnight to first open time in business timezone)
  const firstSlot = slots[0];
  const firstOpenTime = parseTime(firstSlot.open, date, timezone);

  if (firstOpenTime > dayStart) {
    offTimes.push({
      start: dayStart,
      end: firstOpenTime,
      reason: 'Before business hours',
      type: 'closed_day',
    });
  }

  // Off-time between slots (breaks - use business timezone)
  for (let i = 0; i < slots.length - 1; i++) {
    const currentSlot = slots[i];
    const nextSlot = slots[i + 1];

    const breakStart = parseTime(currentSlot.close, date, timezone);
    const breakEnd = parseTime(nextSlot.open, date, timezone);

    if (breakEnd > breakStart) {
      offTimes.push({
        start: breakStart,
        end: breakEnd,
        reason: 'Break',
        type: 'break',
      });
    }
  }

  // Off-time after last slot (last close to midnight in business timezone)
  const lastSlot = slots[slots.length - 1];
  const lastCloseTime = parseTime(lastSlot.close, date, timezone);

  if (lastCloseTime < dayEnd) {
    offTimes.push({
      start: lastCloseTime,
      end: dayEnd,
      reason: 'After business hours',
      type: 'closed_day',
    });
  }

  return offTimes;
}

/**
 * Check if two time intervals overlap using grain-block precision
 *
 * Two intervals [A1, A2) and [B1, B2) overlap if:
 * A1 < B2 AND B1 < A2
 *
 * This works for any duration aligned to 5-minute grain blocks.
 */
export function intervalsOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Check if a given time range intersects with any off-time interval
 *
 * @param start - Start time of the range to check
 * @param end - End time of the range to check
 * @param offTimes - Array of off-time intervals (should be sorted by start time)
 * @returns True if the time range is fully available (no intersections), false if it overlaps with off-time
 */
export function isTimeAvailable(
  start: Date,
  end: Date,
  offTimes: OffTimeInterval[]
): boolean {
  for (const offTime of offTimes) {
    if (intervalsOverlap(start, end, offTime.start, offTime.end)) {
      return false;
    }
  }
  return true;
}

/**
 * Get all off-time intervals that intersect with a given time range
 *
 * Useful for showing detailed reasons why a time slot is unavailable
 */
export function getIntersectingOffTimes(
  start: Date,
  end: Date,
  offTimes: OffTimeInterval[]
): OffTimeInterval[] {
  return offTimes.filter(offTime =>
    intervalsOverlap(start, end, offTime.start, offTime.end)
  );
}

/**
 * Get day of week name from date
 */
function getDayOfWeek(date: Date): 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' {
  const days: Array<'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'> = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Pre-compute and cache off-time intervals for a date range
 *
 * This optimization allows fast lookups when checking many time slots
 * by pre-computing all off-time intervals once.
 */
export class OffTimeCache {
  private cache: Map<string, OffTimeInterval[]> = new Map();

  constructor(private config: TenantConfig) {}

  /**
   * Get off-time intervals for a specific day (cached)
   */
  getForDay(date: Date): OffTimeInterval[] {
    const dateString = formatDateYYYYMMDD(date);

    if (!this.cache.has(dateString)) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const offTimes = generateOffTimeIntervals(this.config, dayStart, dayEnd);
      this.cache.set(dateString, offTimes);
    }

    return this.cache.get(dateString)!;
  }

  /**
   * Get off-time intervals for a date range (cached per day)
   */
  getForRange(startDate: Date, endDate: Date): OffTimeInterval[] {
    const offTimes: OffTimeInterval[] = [];

    let currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    const endDateOnly = new Date(endDate);
    endDateOnly.setHours(23, 59, 59, 999);

    while (currentDate <= endDateOnly) {
      offTimes.push(...this.getForDay(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return offTimes;
  }

  /**
   * Clear the cache (useful when config changes)
   */
  clear(): void {
    this.cache.clear();
  }
}
