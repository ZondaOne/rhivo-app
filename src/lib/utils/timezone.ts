/**
 * Timezone Utilities
 *
 * Ensures consistent timezone handling across the booking system:
 * - All dates stored in DB are in UTC (timestamps with time zone)
 * - All API requests/responses use ISO 8601 format with timezone
 * - Frontend displays times in business timezone
 * - Slot generation uses business timezone for day boundaries
 *
 * Critical for international deployments where:
 * - Server may be in different timezone than business
 * - Customer may be in different timezone than business
 * - Bookings must align with business's local operating hours
 */

/**
 * Parse a date string in the context of a specific timezone
 *
 * Examples:
 * - parseInTimezone('2025-01-15', 'Europe/Rome') -> Jan 15 2025 00:00:00 Rome time
 * - parseInTimezone('2025-01-15T10:30:00', 'America/New_York') -> Jan 15 2025 10:30:00 NY time
 *
 * @param dateString - Date string (YYYY-MM-DD or ISO format)
 * @param timezone - IANA timezone (e.g., 'Europe/Rome', 'America/New_York')
 * @returns Date object representing the time in the specified timezone
 */
export function parseInTimezone(dateString: string, timezone: string): Date {
  console.log('[parseInTimezone] Input:', { dateString, timezone });

  // If already has timezone info (ISO format with Z or offset), use it directly
  if (dateString.includes('Z') || /[+-]\d{2}:\d{2}$/.test(dateString)) {
    const result = new Date(dateString);
    console.log('[parseInTimezone] Already has TZ info, returning:', result.toISOString());
    return result;
  }

  // For date-only strings (YYYY-MM-DD), interpret as midnight in business timezone
  // For datetime strings without timezone, interpret in business timezone

  // Use Intl.DateTimeFormat to ensure we're in the right timezone
  // This approach handles DST transitions correctly
  const parts = dateString.split(/[-T:]/);
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
  const day = parseInt(parts[2]);
  const hour = parts[3] ? parseInt(parts[3]) : 0;
  const minute = parts[4] ? parseInt(parts[4]) : 0;
  const second = parts[5] ? parseInt(parts[5]) : 0;

  console.log('[parseInTimezone] Parsed components:', { year, month, day, hour, minute, second });

  // Create a date string in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Build a local date in the target timezone
  // We need to find the UTC timestamp that corresponds to this local time
  const targetDate = new Date(Date.UTC(year, month, day, hour, minute, second));
  console.log('[parseInTimezone] Target UTC date:', targetDate.toISOString());

  // Get the offset for this date in the target timezone
  const offsetStr = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  })
    .formatToParts(targetDate)
    .find(part => part.type === 'timeZoneName')?.value;

  console.log('[parseInTimezone] Offset string:', offsetStr);

  // Parse offset (e.g., "GMT+01:00" -> 60 minutes)
  let offsetMinutes = 0;
  if (offsetStr) {
    const match = offsetStr.match(/GMT([+-])(\d{2}):(\d{2})/);
    if (match) {
      const sign = match[1] === '+' ? 1 : -1;
      offsetMinutes = sign * (parseInt(match[2]) * 60 + parseInt(match[3]));
    }
  }

  console.log('[parseInTimezone] Offset minutes:', offsetMinutes);

  // Adjust the UTC date by the offset to get the correct UTC timestamp
  const utcTimestamp = targetDate.getTime() - offsetMinutes * 60 * 1000;
  const result = new Date(utcTimestamp);

  console.log('[parseInTimezone] Final result:', result.toISOString());
  console.log('[parseInTimezone] Verification - this time in', timezone, ':',
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(result)
  );

  return result;
}

/**
 * Get the start of day (midnight) in a specific timezone
 *
 * Example: getStartOfDay(new Date(), 'Europe/Rome')
 * Returns: Date object representing midnight in Rome on that day
 */
export function getStartOfDay(date: Date, timezone: string): Date {
  const year = getYearInTimezone(date, timezone);
  const month = getMonthInTimezone(date, timezone);
  const day = getDayInTimezone(date, timezone);

  return parseInTimezone(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, timezone);
}

/**
 * Get the end of day (23:59:59.999) in a specific timezone
 */
export function getEndOfDay(date: Date, timezone: string): Date {
  const start = getStartOfDay(date, timezone);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/**
 * Get the year component in a specific timezone
 */
function getYearInTimezone(date: Date, timezone: string): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
    }).format(date)
  );
}

/**
 * Get the month component (0-indexed) in a specific timezone
 */
function getMonthInTimezone(date: Date, timezone: string): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      month: '2-digit',
    }).format(date)
  ) - 1;
}

/**
 * Get the day component in a specific timezone
 */
function getDayInTimezone(date: Date, timezone: string): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      day: '2-digit',
    }).format(date)
  );
}

/**
 * Format a date in a specific timezone (for display)
 *
 * @param date - Date to format
 * @param timezone - IANA timezone
 * @param options - Intl.DateTimeFormat options
 */
export function formatInTimezone(
  date: Date,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: timezone,
  }).format(date);
}

/**
 * Get day of week in a specific timezone
 *
 * @param date - Date to check
 * @param timezone - IANA timezone
 * @returns Day of week (0 = Sunday, 6 = Saturday)
 */
export function getDayOfWeekInTimezone(date: Date, timezone: string): number {
  const dayStr = formatInTimezone(date, timezone, { weekday: 'long' }).toLowerCase();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days.indexOf(dayStr);
}

/**
 * Get day of week name in a specific timezone
 *
 * @param date - Date to check
 * @param timezone - IANA timezone
 * @returns 'monday' | 'tuesday' | ... | 'sunday'
 */
export function getDayNameInTimezone(
  date: Date,
  timezone: string
): 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const dayIndex = getDayOfWeekInTimezone(date, timezone);
  return days[dayIndex];
}

/**
 * Check if a date is today in a specific timezone
 */
export function isToday(date: Date, timezone: string): boolean {
  const now = new Date();
  const dateStr = formatInTimezone(date, timezone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const nowStr = formatInTimezone(now, timezone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return dateStr === nowStr;
}

/**
 * Parse time string (HH:MM) and combine with date in a specific timezone
 *
 * Example: parseTime('14:30', new Date('2025-01-15'), 'Europe/Rome')
 * Returns: Date object representing 2:30 PM Rome time on Jan 15
 */
export function parseTime(timeString: string, date: Date, timezone: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const year = getYearInTimezone(date, timezone);
  const month = getMonthInTimezone(date, timezone);
  const day = getDayInTimezone(date, timezone);

  return parseInTimezone(
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`,
    timezone
  );
}

/**
 * Get current time in a specific timezone
 */
export function nowInTimezone(timezone: string): Date {
  // Current UTC time is always correct, but this is for consistency
  return new Date();
}

/**
 * Convert business hours (HH:MM) to Date objects for a specific day in business timezone
 *
 * This is critical for slot generation - ensures we're generating slots
 * in the business's timezone, not the server's timezone
 */
export function getBusinessHoursForDay(
  date: Date,
  openTime: string,
  closeTime: string,
  timezone: string
): { open: Date; close: Date } {
  return {
    open: parseTime(openTime, date, timezone),
    close: parseTime(closeTime, date, timezone),
  };
}

/**
 * Format a date range for display in business timezone
 *
 * Example: formatDateRange(start, end, 'Europe/Rome')
 * Returns: "Monday, January 15, 2025, 2:30 PM - 4:00 PM CET"
 */
export function formatDateRange(
  start: Date,
  end: Date,
  timezone: string,
  locale: string = 'en-US'
): string {
  const sameDay =
    formatInTimezone(start, timezone, { year: 'numeric', month: '2-digit', day: '2-digit' }) ===
    formatInTimezone(end, timezone, { year: 'numeric', month: '2-digit', day: '2-digit' });

  if (sameDay) {
    const dateStr = formatInTimezone(start, timezone, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const startTime = formatInTimezone(start, timezone, {
      hour: 'numeric',
      minute: '2-digit',
    });
    const endTime = formatInTimezone(end, timezone, {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
    return `${dateStr}, ${startTime} - ${endTime}`;
  } else {
    const startStr = formatInTimezone(start, timezone, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    const endStr = formatInTimezone(end, timezone, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
    return `${startStr} - ${endStr}`;
  }
}
