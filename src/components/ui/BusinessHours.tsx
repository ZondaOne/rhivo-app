'use client';

import { TenantConfig, DailyAvailability } from '@/lib/config/tenant-schema';

interface BusinessHoursProps {
  config: TenantConfig;
  className?: string;
  variant?: 'full' | 'compact';
}

/**
 * Business Hours Summary Component (Step 7f3)
 *
 * Generates human-readable business hours display including breaks,
 * closed days, and split shifts.
 *
 * Examples:
 * - "Mon-Fri 9:00 AM - 1:00 PM, 2:00 PM - 6:00 PM"
 * - "Sat 10:00 AM - 2:00 PM"
 * - "Sun: Closed"
 */
export function BusinessHours({ config, className = '', variant = 'full' }: BusinessHoursProps) {
  const formattedHours = formatBusinessHours(config.availability);

  if (variant === 'compact') {
    return (
      <div className={`text-sm text-gray-600 ${className}`}>
        {formattedHours.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="font-medium text-gray-900 min-w-[80px]">{entry.days}</span>
            <span>{entry.hours}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
        Business Hours
      </h3>
      <div className="space-y-2">
        {formattedHours.map((entry, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <span className="font-medium text-gray-900 min-w-[100px]">
              {entry.days}
            </span>
            <span className="text-gray-700">{entry.hours}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface FormattedHoursEntry {
  days: string;
  hours: string;
}

/**
 * Format business hours into human-readable text
 * Groups consecutive days with identical hours
 */
function formatBusinessHours(availability: DailyAvailability[]): FormattedHoursEntry[] {
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // Sort availability by day of week
  const sortedAvailability = [...availability].sort((a, b) => {
    return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
  });

  const result: FormattedHoursEntry[] = [];
  let currentGroup: DailyAvailability[] = [];
  let currentHoursPattern: string | null = null;

  for (const dayAvail of sortedAvailability) {
    const hoursPattern = formatDayHours(dayAvail);

    if (hoursPattern === currentHoursPattern) {
      // Same hours, add to current group
      currentGroup.push(dayAvail);
    } else {
      // Different hours, save current group and start new one
      if (currentGroup.length > 0 && currentHoursPattern !== null) {
        result.push({
          days: formatDayRange(currentGroup),
          hours: currentHoursPattern,
        });
      }

      currentGroup = [dayAvail];
      currentHoursPattern = hoursPattern;
    }
  }

  // Add final group
  if (currentGroup.length > 0 && currentHoursPattern !== null) {
    result.push({
      days: formatDayRange(currentGroup),
      hours: currentHoursPattern,
    });
  }

  return result;
}

/**
 * Format hours for a single day, including breaks
 */
function formatDayHours(dayAvail: DailyAvailability): string {
  if (!dayAvail.enabled) {
    return 'Closed';
  }

  if (!dayAvail.slots || dayAvail.slots.length === 0) {
    return 'Closed';
  }

  // Format each slot
  const slotStrings = dayAvail.slots.map(slot => {
    return `${formatTime(slot.open)} - ${formatTime(slot.close)}`;
  });

  return slotStrings.join(', ');
}

/**
 * Format a range of days (e.g., "Mon-Fri", "Sat", "Sun")
 */
function formatDayRange(days: DailyAvailability[]): string {
  if (days.length === 0) return '';
  if (days.length === 1) return capitalizeDay(days[0].day);

  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayIndices = days.map(d => dayOrder.indexOf(d.day)).sort((a, b) => a - b);

  // Check if days are consecutive
  const isConsecutive = dayIndices.every((idx, i) => {
    if (i === 0) return true;
    return idx === dayIndices[i - 1] + 1;
  });

  if (isConsecutive) {
    const firstDay = dayOrder[dayIndices[0]];
    const lastDay = dayOrder[dayIndices[dayIndices.length - 1]];
    return `${abbreviateDay(firstDay)}-${abbreviateDay(lastDay)}`;
  }

  // Not consecutive, list individually
  return days.map(d => abbreviateDay(d.day)).join(', ');
}

/**
 * Format time from HH:MM to human-readable (e.g., "9:00 AM")
 */
function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const displayMinute = minute === 0 ? '' : `:${minuteStr}`;

  return `${displayHour}${displayMinute} ${period}`;
}

/**
 * Abbreviate day name (Monday -> Mon)
 */
function abbreviateDay(day: string): string {
  const abbr: Record<string, string> = {
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun',
  };
  return abbr[day] || day;
}

/**
 * Capitalize day name (monday -> Monday)
 */
function capitalizeDay(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

/**
 * Get off-time blocks for a specific date to show breaks in UI
 */
export interface BreakBlock {
  start: Date;
  end: Date;
  label: string;
  type: 'break' | 'closed_day' | 'holiday';
}

/**
 * Extract break blocks for a given day from availability config
 * Used to render break overlays in calendar views
 */
export function getDayBreakBlocks(
  date: Date,
  availability: DailyAvailability[]
): BreakBlock[] {
  const breakBlocks: BreakBlock[] = [];
  const dayOfWeek = getDayOfWeek(date);

  const dayAvail = availability.find(a => a.day === dayOfWeek);

  if (!dayAvail || !dayAvail.enabled) {
    // Entire day is closed
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    breakBlocks.push({
      start: dayStart,
      end: dayEnd,
      label: 'Closed',
      type: 'closed_day',
    });

    return breakBlocks;
  }

  const slots = dayAvail.slots || [];

  if (slots.length === 0) {
    // No slots, entire day closed
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    breakBlocks.push({
      start: dayStart,
      end: dayEnd,
      label: 'Closed',
      type: 'closed_day',
    });

    return breakBlocks;
  }

  // Add before business hours block
  const firstSlot = slots[0];
  const [firstOpenHour, firstOpenMin] = firstSlot.open.split(':').map(Number);
  const firstOpenTime = new Date(date);
  firstOpenTime.setHours(firstOpenHour, firstOpenMin, 0, 0);

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  if (firstOpenTime > dayStart) {
    breakBlocks.push({
      start: dayStart,
      end: firstOpenTime,
      label: 'Before business hours',
      type: 'closed_day',
    });
  }

  // Add breaks between slots
  for (let i = 0; i < slots.length - 1; i++) {
    const currentSlot = slots[i];
    const nextSlot = slots[i + 1];

    const [currentCloseHour, currentCloseMin] = currentSlot.close.split(':').map(Number);
    const [nextOpenHour, nextOpenMin] = nextSlot.open.split(':').map(Number);

    const breakStart = new Date(date);
    breakStart.setHours(currentCloseHour, currentCloseMin, 0, 0);

    const breakEnd = new Date(date);
    breakEnd.setHours(nextOpenHour, nextOpenMin, 0, 0);

    if (breakEnd > breakStart) {
      breakBlocks.push({
        start: breakStart,
        end: breakEnd,
        label: getBreakLabel(breakStart, breakEnd),
        type: 'break',
      });
    }
  }

  // Add after business hours block
  const lastSlot = slots[slots.length - 1];
  const [lastCloseHour, lastCloseMin] = lastSlot.close.split(':').map(Number);
  const lastCloseTime = new Date(date);
  lastCloseTime.setHours(lastCloseHour, lastCloseMin, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  if (lastCloseTime < dayEnd) {
    breakBlocks.push({
      start: lastCloseTime,
      end: dayEnd,
      label: 'After business hours',
      type: 'closed_day',
    });
  }

  return breakBlocks;
}

/**
 * Get day of week name from date
 */
function getDayOfWeek(date: Date): 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()] as any;
}

/**
 * Generate a descriptive label for a break
 */
function getBreakLabel(start: Date, end: Date): string {
  const startHour = start.getHours();
  const endHour = end.getHours();
  const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

  // Lunch break detection (typically between 12-2 PM)
  if (startHour >= 12 && startHour <= 13 && durationMinutes >= 30 && durationMinutes <= 120) {
    return 'Lunch Break';
  }

  // Long break (> 4 hours)
  if (durationMinutes > 240) {
    return 'Extended Break';
  }

  return 'Break';
}
