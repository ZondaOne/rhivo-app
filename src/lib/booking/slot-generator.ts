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
 * - Business availability (regular hours + exceptions)
 * - Service duration (any 5min multiple)
 * - Time slot duration (DISPLAY interval, also 5min multiple)
 * - Existing appointments
 * - Existing reservations (not expired)
 * - Buffer times (before/after service, 5min multiples)
 * - Max simultaneous bookings (staff capacity)
 */

// Universal 5-minute grain block constant
const GRAIN_MINUTES = 5;

import { TenantConfig, Service } from '@/lib/config/tenant-schema';

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
}

interface Reservation {
  slot_start: string;
  slot_end: string;
  expires_at: string;
}

/**
 * Generate available time slots for a given date range and service
 */
export function generateTimeSlots(options: SlotGeneratorOptions): TimeSlot[] {
  const {
    config,
    service,
    startDate,
    endDate,
    existingAppointments = [],
    existingReservations = [],
  } = options;

  const slots: TimeSlot[] = [];
  const now = new Date();

  // Get active reservations (not expired)
  const activeReservations = existingReservations.filter(r =>
    new Date(r.expires_at) > now
  );

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
      now
    );
    slots.push(...daySlots);

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return slots;
}

/**
 * Generate slots for a single day
 */
function generateSlotsForDay(
  date: Date,
  config: TenantConfig,
  service: Service,
  appointments: Array<{ slot_start: string; slot_end: string }>,
  reservations: Array<Reservation>,
  now: Date
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // Check if this day is available
  const dayOfWeek = getDayOfWeek(date);
  const availability = config.availability.find(a => a.day === dayOfWeek);

  if (!availability || !availability.enabled) {
    return slots; // Day is closed
  }

  // Check for exceptions (holidays, special hours)
  const dateString = formatDateYYYYMMDD(date);
  const exception = config.availabilityExceptions.find(e => e.date === dateString);

  if (exception?.closed) {
    return slots; // Closed on this day
  }

  // Determine open/close times for the day
  let openTime = availability.open;
  let closeTime = availability.close;

  if (exception && exception.open && exception.close) {
    openTime = exception.open;
    closeTime = exception.close;
  }

  // Parse times
  const [openHour, openMin] = openTime.split(':').map(Number);
  const [closeHour, closeMin] = closeTime.split(':').map(Number);

  // Create datetime objects for open and close
  const dayStart = new Date(date);
  dayStart.setHours(openHour, openMin, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(closeHour, closeMin, 0, 0);

  // Check advance booking limits
  const maxAdvanceDate = new Date(now);
  maxAdvanceDate.setDate(maxAdvanceDate.getDate() + config.bookingLimits.advanceBookingDays);

  if (date > maxAdvanceDate) {
    return slots; // Beyond advance booking window
  }

  // Check minimum advance booking
  const minAdvanceTime = new Date(now);
  minAdvanceTime.setMinutes(minAdvanceTime.getMinutes() + config.bookingLimits.minAdvanceBookingMinutes);

  // Generate slots at timeSlotDuration intervals (DISPLAY interval)
  // Each slot is checked for availability based on 5-minute grain blocks
  let slotStart = new Date(dayStart);

  // Account for buffer before/after service (already rounded to 5min by schema)
  const bufferBefore = service.bufferBefore || 0;
  const bufferAfter = service.bufferAfter || 0;

  while (slotStart < dayEnd) {
    // Slot end time is based on service duration (not display interval)
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + service.duration);

    // Total occupied time includes buffers
    const bufferEnd = new Date(slotEnd);
    bufferEnd.setMinutes(bufferEnd.getMinutes() + bufferAfter);

    // Check if service + buffer can fit in remaining time
    if (bufferEnd > dayEnd) {
      break; // Service would extend past closing time
    }

    // Effective start includes buffer before
    const effectiveStart = new Date(slotStart);
    effectiveStart.setMinutes(effectiveStart.getMinutes() - bufferBefore);

    // Skip slots in the past or within minimum advance time
    if (slotStart < minAdvanceTime) {
      // Move to next slot using timeSlotDuration (display interval)
      slotStart.setMinutes(slotStart.getMinutes() + config.timeSlotDuration);
      continue;
    }

    // Calculate capacity using 5-minute grain blocks
    // This checks if any 5-min block in the service duration + buffers is occupied
    const capacity = calculateSlotCapacity(
      effectiveStart,
      bufferEnd,
      config.bookingLimits.maxSimultaneousBookings,
      appointments,
      reservations
    );

    const totalCapacity = config.bookingLimits.maxSimultaneousBookings;
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
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()] as any;
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
