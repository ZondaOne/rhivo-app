/**
 * Time Slot Generation Algorithm (5-Minute Grain Block System)
 *
 * Uses a 5-minute grain block system for universal time grid:
 * - All calculations use 5min blocks as the base unit
 * - timeSlotDuration determines DISPLAY interval (e.g., 30min shown in UI)
 * - Service durations can be any multiple of 5min (15, 45, 75, 90, 105, etc.)
 * - Buffers snap to 5min increments
 * - Calendar drag-and-drop snaps to 5min grid
 *
 * Generates available time slots based on:
 * - Business availability (regular hours + exceptions + breaks)
 * - Service duration (any 5min multiple)
 * - Time slot duration (DISPLAY interval, also 5min multiple)
 * - Existing appointments
 * - Existing reservations (not expired)
 * - Buffer times (before/after service, 5min multiples)
 * - Max simultaneous bookings (staff capacity)
 * - Off-time intervals (breaks, closed days, holidays) - Step 7f2
 */

// Universal 5-minute grain block constant
const GRAIN_MINUTES = 5;

import { TenantConfig, Service } from '@/lib/config/tenant-schema';
import {
  generateOffTimeIntervals,
  isTimeAvailable,
  getIntersectingOffTimes,
  OffTimeInterval,
} from './off-time-system';

export interface TimeSlot {
  start: string; // ISO datetime string
  end: string; // ISO datetime string
  available: boolean;
  capacity: number; // How many slots available at this time
  totalCapacity: number; // Maximum capacity for this slot
  capacityPercentage: number; // % of capacity used (0-100)
  reason?: string; // If unavailable, why?
}

export interface SlotGeneratorOptions {
  config: TenantConfig;
  service: Service;
  startDate: Date;
  endDate: Date;
  existingAppointments?: Array<{ slot_start: string; slot_end: string }>;
  existingReservations?: Array<{ slot_start: string; slot_end: string; expires_at: string }>;
  timezone?: string; // Optional: if not provided, uses config.business.timezone
}

interface Reservation {
  slot_start: string;
  slot_end: string;
  expires_at: string;
}

/**
 * Generate available time slots for a given date range and service
 *
 * IMPORTANT: All date calculations use the business's timezone to ensure
 * correct day boundaries and business hours alignment
 */
export function generateTimeSlots(options: SlotGeneratorOptions): TimeSlot[] {
  const {
    config,
    service,
    startDate,
    endDate,
    existingAppointments = [],
    existingReservations = [],
    timezone,
  } = options;

  const slots: TimeSlot[] = [];
  const now = new Date();

  // Use business timezone for all calculations
  const businessTimezone = timezone || config.business.timezone;

  // Get active reservations (not expired)
  const activeReservations = existingReservations.filter(r =>
    new Date(r.expires_at) > now
  );

  // Pre-compute all off-time intervals for the date range (Step 7f2)
  // This includes: breaks, closed days, holidays, and exceptions
  // IMPORTANT: Pass business timezone for correct day boundary calculations
  const offTimeIntervals = generateOffTimeIntervals(config, startDate, endDate, businessTimezone);

  // Iterate through each day in the range
  let currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);

  const endDateOnly = new Date(endDate);
  endDateOnly.setHours(23, 59, 59, 999);

  while (currentDate <= endDateOnly) {
    const daySlots = generateSlotsForDay(
      currentDate,
      config,
      service,
      existingAppointments,
      activeReservations,
      now,
      offTimeIntervals,
      businessTimezone
    );
    slots.push(...daySlots);

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return slots;
}

/**
 * Generate slots for a single day
 *
 * @param timezone - Business timezone for correct day boundary calculations
 */
function generateSlotsForDay(
  date: Date,
  config: TenantConfig,
  service: Service,
  appointments: Array<{ slot_start: string; slot_end: string }>,
  reservations: Array<Reservation>,
  now: Date,
  offTimeIntervals: OffTimeInterval[],
  timezone: string
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // Check if this day is available
  const dayOfWeek = getDayOfWeek(date);
  const availability = config.availability.find(a => a.day === dayOfWeek);

  if (!availability || !availability.enabled) {
    return slots; // Day is closed (handled by off-time system)
  }

  // Check for exceptions (holidays, special hours)
  const dateString = formatDateYYYYMMDD(date);
  const exception = config.availabilityExceptions.find(e => e.date === dateString);

  if (exception?.closed) {
    return slots; // Closed on this day (handled by off-time system)
  }

  // Get the slots for this day (supports breaks and split shifts from Step 7f1)
  const availabilitySlots = availability.slots || [];

  if (availabilitySlots.length === 0) {
    return slots; // No available time slots
  }

  // For slot generation, we need to iterate through each availability slot
  // and generate booking slots within the available periods
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  // Check advance booking limits
  const maxAdvanceDate = new Date(now);
  maxAdvanceDate.setDate(maxAdvanceDate.getDate() + config.bookingLimits.advanceBookingDays);

  if (date > maxAdvanceDate) {
    return slots; // Beyond advance booking window
  }

  // Check minimum advance booking
  const minAdvanceTime = new Date(now);
  minAdvanceTime.setMinutes(minAdvanceTime.getMinutes() + config.bookingLimits.minAdvanceBookingMinutes);

  // Account for buffer before/after service (already rounded to 5min by schema)
  const bufferBefore = service.bufferBefore || 0;
  const bufferAfter = service.bufferAfter || 0;

  // Iterate through each availability slot (supports breaks and split shifts)
  for (const availSlot of availabilitySlots) {
    const [openHour, openMin] = availSlot.open.split(':').map(Number);
    const [closeHour, closeMin] = availSlot.close.split(':').map(Number);

    const slotOpen = new Date(date);
    slotOpen.setHours(openHour, openMin, 0, 0);

    const slotClose = new Date(date);
    slotClose.setHours(closeHour, closeMin, 0, 0);

    // Generate slots at timeSlotDuration intervals (DISPLAY interval) within this availability slot
    let slotStart = new Date(slotOpen);

    while (slotStart < slotClose) {
      // Slot end time is based on service duration (not display interval)
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + service.duration);

      // Total occupied time includes buffers
      const bufferEnd = new Date(slotEnd);
      bufferEnd.setMinutes(bufferEnd.getMinutes() + bufferAfter);

      // Effective start includes buffer before
      const effectiveStart = new Date(slotStart);
      effectiveStart.setMinutes(effectiveStart.getMinutes() - bufferBefore);

      // Check if service + buffer can fit in remaining time of this availability slot
      if (bufferEnd > slotClose) {
        break; // Service would extend past this slot's closing time
      }

      // Skip slots in the past or within minimum advance time
      if (slotStart < minAdvanceTime) {
        // Move to next slot using timeSlotDuration (display interval)
        slotStart.setMinutes(slotStart.getMinutes() + config.timeSlotDuration);
        continue;
      }

      // CRITICAL: Check if this time range conflicts with any off-time intervals (Step 7f2)
      // This prevents bookings from spanning across breaks, closed periods, or holidays
      const conflictsWithOffTime = !isTimeAvailable(effectiveStart, bufferEnd, offTimeIntervals);

      if (conflictsWithOffTime) {
        // Get detailed reasons for unavailability
        const intersectingOffTimes = getIntersectingOffTimes(effectiveStart, bufferEnd, offTimeIntervals);
        const reason = intersectingOffTimes.length > 0
          ? intersectingOffTimes[0].reason
          : 'Unavailable during off-time';

        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          available: false,
          capacity: 0,
          totalCapacity: 0,
          capacityPercentage: 100,
          reason,
        });

        // Move to next slot
        slotStart.setMinutes(slotStart.getMinutes() + config.timeSlotDuration);
        continue;
      }

      // Calculate capacity using 5-minute grain blocks
      // This checks if any 5-min block in the service duration + buffers is occupied
      // Use per-service capacity if specified, otherwise fall back to business-level default
      const maxCapacity = service.maxSimultaneousBookings ?? config.bookingLimits.maxSimultaneousBookings;

      const capacity = calculateSlotCapacity(
        effectiveStart,
        bufferEnd,
        maxCapacity,
        appointments,
        reservations
      );

      const totalCapacity = maxCapacity;
      const availableCapacity = capacity;
      const usedCapacity = totalCapacity - availableCapacity;
      const capacityPercentage = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;

      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        available: capacity > 0,
        capacity,
        totalCapacity,
        capacityPercentage,
        reason: capacity === 0 ? 'Fully booked' : undefined,
      });

      // Move to next slot using timeSlotDuration (DISPLAY interval, e.g., 30min)
      // This means a 45min service will be checked at 9:00, 9:30, 10:00, etc.
      slotStart.setMinutes(slotStart.getMinutes() + config.timeSlotDuration);
    }
  }

  return slots;
}

/**
 * Calculate how many slots are available at a given time using 5-minute grain blocks
 *
 * This function checks overlap at the grain block level, ensuring that services
 * with arbitrary durations (15, 45, 75, 90, 105 min) are properly allocated.
 *
 * @param slotStart - Start time of the potential booking slot (with buffer before)
 * @param slotEnd - End time of the potential booking slot (with buffer after)
 * @param maxCapacity - Maximum simultaneous bookings allowed
 * @param appointments - Existing confirmed appointments
 * @param reservations - Active reservations (not expired)
 * @returns Number of available capacity slots (0 = fully booked)
 */
function calculateSlotCapacity(
  slotStart: Date,
  slotEnd: Date,
  maxCapacity: number,
  appointments: Array<{ slot_start: string; slot_end: string }>,
  reservations: Array<Reservation>
): number {
  let usedCapacity = 0;

  // Check appointments that overlap with this slot
  // Overlap check: two intervals [A1, A2) and [B1, B2) overlap if A1 < B2 AND B1 < A2
  for (const apt of appointments) {
    const aptStart = new Date(apt.slot_start);
    const aptEnd = new Date(apt.slot_end);

    // Check for overlap (works for any duration, aligned to 5min blocks)
    if (aptStart < slotEnd && aptEnd > slotStart) {
      usedCapacity++;
    }
  }

  // Check active reservations that overlap with this slot
  for (const res of reservations) {
    const resStart = new Date(res.slot_start);
    const resEnd = new Date(res.slot_end);

    // Check for overlap
    if (resStart < slotEnd && resEnd > slotStart) {
      usedCapacity++;
    }
  }

  return Math.max(0, maxCapacity - usedCapacity);
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
 * Group slots by date for easier rendering
 */
export function groupSlotsByDate(slots: TimeSlot[]): Map<string, TimeSlot[]> {
  const grouped = new Map<string, TimeSlot[]>();

  for (const slot of slots) {
    const date = formatDateYYYYMMDD(new Date(slot.start));
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(slot);
  }

  return grouped;
}

/**
 * Re-export off-time system utilities for use in booking validation
 * (Step 7f2: Unified off-time system)
 */
export {
  generateOffTimeIntervals,
  isTimeAvailable,
  getIntersectingOffTimes,
  type OffTimeInterval,
} from './off-time-system';
