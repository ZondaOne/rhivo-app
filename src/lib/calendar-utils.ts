import { Appointment } from '@/db/types';
import { TenantConfig } from '@/lib/config/tenant-schema';
import {
  generateOffTimeIntervals,
  isTimeAvailable,
  getIntersectingOffTimes,
  type OffTimeInterval,
} from '@/lib/booking/off-time-system';

export type CalendarView = 'month' | 'week' | 'day' | 'list';

/**
 * 5-Minute Grain Block System
 *
 * All time calculations snap to 5-minute increments for:
 * - Drag-and-drop precision
 * - Service duration flexibility
 * - Buffer time alignment
 * - Visual grid consistency
 */
export const GRAIN_MINUTES = 5;

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isClosingDay: boolean; // Non-working day (configurable via YAML)
  isHoliday: boolean;
  appointments: Appointment[];
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  appointments: Appointment[];
}

/**
 * Get the start and end dates for a calendar view
 */
export function getViewDateRange(
  date: Date,
  view: CalendarView
): { start: Date; end: Date } {
  const start = new Date(date);
  const end = new Date(date);

  switch (view) {
    case 'month':
      // First day of the month
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      // Last day of the month
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'week':
      // Start of week (Monday)
      const dayOfWeek = start.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start.setDate(start.getDate() - daysFromMonday);
      start.setHours(0, 0, 0, 0);

      // End of week (Sunday)
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;

    case 'day':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'list':
      // Default to 30 days
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + 30);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
}

/**
 * Italian holidays (hardcoded for now - will be configurable via YAML later)
 * TODO: Move to tenant YAML config under business.holidays
 */
export function isItalianHoliday(date: Date): boolean {
  const month = date.getMonth() + 1; // 1-based month
  const day = date.getDate();
  const year = date.getFullYear();

  // Fixed holidays
  const fixedHolidays = [
    [1, 1],   // New Year's Day
    [1, 6],   // Epiphany
    [4, 25],  // Liberation Day
    [5, 1],   // Labour Day
    [6, 2],   // Republic Day
    [8, 15],  // Ferragosto (Assumption)
    [11, 1],  // All Saints' Day
    [12, 8],  // Immaculate Conception
    [12, 25], // Christmas
    [12, 26], // Santo Stefano
  ];

  if (fixedHolidays.some(([m, d]) => m === month && d === day)) {
    return true;
  }

  // Easter Monday (moveable holiday - simplified calculation)
  // This is a basic implementation - in production, use a proper Easter calculation library
  const easterDates: Record<number, [number, number]> = {
    2024: [4, 1],  // April 1, 2024
    2025: [4, 21], // April 21, 2025
    2026: [4, 6],  // April 6, 2026
    2027: [3, 29], // March 29, 2027
    2028: [4, 17], // April 17, 2028
  };

  const easter = easterDates[year];
  if (easter && month === easter[0] && day === easter[1]) {
    return true;
  }

  return false;
}

/**
 * Check if a day is a closing day (non-working day)
 * Currently hardcoded to Sunday (0) - will be configurable via YAML later
 * TODO: Move to tenant YAML config under business.closingDays (array of day numbers: 0=Sunday, 6=Saturday)
 */
export function isClosingDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  // Hardcoded: Sunday only
  return dayOfWeek === 0;
}

/**
 * Generate calendar days for month view including padding
 * Week starts on Monday
 */
export function generateMonthCalendar(
  year: number,
  month: number,
  appointments: Appointment[]
): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstDayOfWeek = firstDay.getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: CalendarDay[] = [];

  // Calculate padding for Monday start (0=Sunday, 1=Monday, etc.)
  // If Sunday (0), need 6 days padding; if Monday (1), need 0 days, etc.
  const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Add previous month's padding days
  for (let i = paddingDays; i > 0; i--) {
    const date = new Date(year, month, 1 - i);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: date.getTime() === today.getTime(),
      isClosingDay: isClosingDay(date),
      isHoliday: isItalianHoliday(date),
      appointments: getAppointmentsForDay(date, appointments),
    });
  }

  // Add current month's days
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    days.push({
      date,
      isCurrentMonth: true,
      isToday: date.getTime() === today.getTime(),
      isClosingDay: isClosingDay(date),
      isHoliday: isItalianHoliday(date),
      appointments: getAppointmentsForDay(date, appointments),
    });
  }

  // Add next month's padding days to complete the grid
  const remainingDays = 42 - days.length; // 6 rows of 7 days
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(year, month + 1, day);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: date.getTime() === today.getTime(),
      isClosingDay: isClosingDay(date),
      isHoliday: isItalianHoliday(date),
      appointments: getAppointmentsForDay(date, appointments),
    });
  }

  return days;
}

/**
 * Generate time slots for day/week view
 */
export function generateTimeSlots(
  date: Date,
  slotDuration: number = 30,
  startHour: number = 0,
  endHour: number = 24,
  appointments: Appointment[]
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const baseDate = new Date(date);
  baseDate.setHours(0, 0, 0, 0);

  const endTime = new Date(baseDate);
  endTime.setHours(endHour, 0, 0, 0);

  const currentDate = new Date(baseDate);
  currentDate.setHours(startHour, 0, 0, 0);

  // Prevent infinite loop: stop when we reach endHour
  while (currentDate < endTime) {
    const startTime = new Date(currentDate);
    currentDate.setMinutes(currentDate.getMinutes() + slotDuration);
    const slotEndTime = new Date(currentDate);

    // Don't add slots that go beyond the end hour
    if (slotEndTime > endTime) {
      break;
    }

    slots.push({
      startTime,
      endTime: slotEndTime,
      appointments: getAppointmentsInSlot(startTime, slotEndTime, appointments),
    });
  }

  return slots;
}

/**
 * Get appointments for a specific day
 */
function getAppointmentsForDay(
  date: Date,
  appointments: Appointment[]
): Appointment[] {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return appointments.filter((apt) => {
    const aptStart = new Date(apt.start_time);
    return aptStart >= dayStart && aptStart <= dayEnd;
  });
}

/**
 * Get appointments within a time slot
 */
function getAppointmentsInSlot(
  slotStart: Date,
  slotEnd: Date,
  appointments: Appointment[]
): Appointment[] {
  return appointments.filter((apt) => {
    const aptStart = new Date(apt.start_time);
    const aptEnd = new Date(apt.end_time);

    // Check if appointment overlaps with slot
    return aptStart < slotEnd && aptEnd > slotStart;
  });
}

/**
 * Normalize locale string to JavaScript format
 * Converts next-intl locales (e.g., 'en', 'it') to JS locales (e.g., 'en-US', 'it-IT')
 */
function normalizeLocale(locale: string): string {
  const localeMap: Record<string, string> = {
    'en': 'en-US',
    'it': 'it-IT',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    // Add more mappings as needed
  };
  return localeMap[locale] || locale || 'en-US';
}

/**
 * Format time for display
 * @param date - The date to format
 * @param locale - The locale to use (defaults to 'en-US'). Accepts both 'en' and 'en-US' formats.
 */
export function formatTime(date: Date, locale: string = 'en-US'): string {
  const normalizedLocale = normalizeLocale(locale);
  return date.toLocaleTimeString(normalizedLocale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date for display
 * @param date - The date to format
 * @param format - Format type: 'short' or 'long'
 * @param locale - The locale to use (defaults to 'en-US'). Accepts both 'en' and 'en-US' formats.
 */
export function formatDate(date: Date, format: 'short' | 'long' = 'short', locale: string = 'en-US'): string {
  const normalizedLocale = normalizeLocale(locale);
  if (format === 'long') {
    return date.toLocaleDateString(normalizedLocale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return date.toLocaleDateString(normalizedLocale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Snap a time to the nearest 5-minute grain block
 *
 * Examples:
 * - 9:03 -> 9:05
 * - 9:07 -> 9:05
 * - 9:08 -> 9:10
 *
 * @param time - The time to snap
 * @returns New Date snapped to 5-minute grain
 */
export function snapToGrain(time: Date): Date {
  const snapped = new Date(time);
  const minutes = snapped.getMinutes();
  const remainder = minutes % GRAIN_MINUTES;

  if (remainder === 0) {
    return snapped; // Already aligned
  }

  // Round to nearest 5-minute block
  const adjustment = remainder >= GRAIN_MINUTES / 2
    ? GRAIN_MINUTES - remainder
    : -remainder;

  snapped.setMinutes(minutes + adjustment);
  snapped.setSeconds(0);
  snapped.setMilliseconds(0);

  return snapped;
}

/**
 * Check if drag-and-drop reschedule is valid
 * Automatically snaps to 5-minute grain blocks
 * Validates against off-time intervals (Step 7f2)
 */
export function validateReschedule(
  appointment: Appointment,
  newStartTime: Date,
  duration: number,
  existingAppointments: Appointment[],
  maxSimultaneous: number = 1,
  config?: TenantConfig,
  bufferBefore: number = 0,
  bufferAfter: number = 0
): { valid: boolean; reason?: string; snappedStartTime?: Date } {
  // Snap to 5-minute grain
  const snappedStart = snapToGrain(newStartTime);

  const newEndTime = new Date(snappedStart);
  newEndTime.setMinutes(newEndTime.getMinutes() + duration);

  // Check if new time is in the past
  if (snappedStart < new Date()) {
    return { valid: false, reason: 'Cannot schedule in the past' };
  }

  // Check against off-time intervals (breaks, closed periods, holidays) - Step 7f2
  if (config) {
    const effectiveStart = new Date(snappedStart);
    effectiveStart.setMinutes(effectiveStart.getMinutes() - bufferBefore);

    const effectiveEnd = new Date(newEndTime);
    effectiveEnd.setMinutes(effectiveEnd.getMinutes() + bufferAfter);

    const offTimes = generateOffTimeIntervals(config, snappedStart, newEndTime);

    if (!isTimeAvailable(effectiveStart, effectiveEnd, offTimes)) {
      const intersecting = getIntersectingOffTimes(effectiveStart, effectiveEnd, offTimes);
      const reason = intersecting.length > 0
        ? `Cannot schedule during ${intersecting[0].reason.toLowerCase()}`
        : 'Time slot conflicts with business hours';
      return { valid: false, reason };
    }
  }

  // Check for conflicts (using 5min grain block overlap detection)
  const conflicts = existingAppointments.filter((apt) => {
    if (apt.id === appointment.id) return false; // Exclude current appointment
    if (apt.status === 'cancelled') return false;

    const aptStart = new Date(apt.start_time);
    const aptEnd = new Date(apt.end_time);

    // Overlap check: two intervals overlap if start1 < end2 AND start2 < end1
    return snappedStart < aptEnd && newEndTime > aptStart;
  });

  if (conflicts.length >= maxSimultaneous) {
    return { valid: false, reason: 'Time slot is fully booked' };
  }

  return { valid: true, snappedStartTime: snappedStart };
}

/**
 * Calculate appointment duration in minutes
 */
export function getAppointmentDuration(appointment: Appointment): number {
  const start = new Date(appointment.start_time);
  const end = new Date(appointment.end_time);
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
}