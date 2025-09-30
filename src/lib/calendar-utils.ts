import { Appointment } from '@/db/types';

export type CalendarView = 'month' | 'week' | 'day' | 'list';

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
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
      // Start of week (Sunday)
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);

      // End of week (Saturday)
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
 * Generate calendar days for month view including padding
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

  // Add previous month's padding days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: date.getTime() === today.getTime(),
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
      appointments: getAppointmentsForDay(date, appointments),
    });
  }

  // Add next month's padding days
  const remainingDays = 42 - days.length; // 6 rows of 7 days
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(year, month + 1, day);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: date.getTime() === today.getTime(),
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
  const currentDate = new Date(date);
  currentDate.setHours(startHour, 0, 0, 0);

  while (currentDate.getHours() < endHour) {
    const startTime = new Date(currentDate);
    currentDate.setMinutes(currentDate.getMinutes() + slotDuration);
    const endTime = new Date(currentDate);

    slots.push({
      startTime,
      endTime,
      appointments: getAppointmentsInSlot(startTime, endTime, appointments),
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
 * Format time for display
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date for display
 */
export function formatDate(date: Date, format: 'short' | 'long' = 'short'): string {
  if (format === 'long') {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Check if drag-and-drop reschedule is valid
 */
export function validateReschedule(
  appointment: Appointment,
  newStartTime: Date,
  duration: number,
  existingAppointments: Appointment[],
  maxSimultaneous: number = 1
): { valid: boolean; reason?: string } {
  const newEndTime = new Date(newStartTime);
  newEndTime.setMinutes(newEndTime.getMinutes() + duration);

  // Check if new time is in the past
  if (newStartTime < new Date()) {
    return { valid: false, reason: 'Cannot schedule in the past' };
  }

  // Check for conflicts
  const conflicts = existingAppointments.filter((apt) => {
    if (apt.id === appointment.id) return false; // Exclude current appointment
    if (apt.status === 'cancelled') return false;

    const aptStart = new Date(apt.start_time);
    const aptEnd = new Date(apt.end_time);

    return newStartTime < aptEnd && newEndTime > aptStart;
  });

  if (conflicts.length >= maxSimultaneous) {
    return { valid: false, reason: 'Time slot is fully booked' };
  }

  return { valid: true };
}

/**
 * Calculate appointment duration in minutes
 */
export function getAppointmentDuration(appointment: Appointment): number {
  const start = new Date(appointment.start_time);
  const end = new Date(appointment.end_time);
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
}