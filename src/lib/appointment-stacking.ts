import { Appointment } from '@/db/types';

export interface StackedAppointment extends Appointment {
  stackPosition: number; // 0, 1, 2 for the first three appointments
  totalInStack: number;  // Total appointments in this time slot
  opacity: number;       // Visual differentiation: 100%, 85%, 70%
}

/**
 * Groups appointments by their exact start time
 */
export function groupByStartTime(appointments: Appointment[]): Map<string, Appointment[]> {
  const groups = new Map<string, Appointment[]>();

  appointments.forEach((apt) => {
    const key = new Date(apt.start_time).toISOString();
    const existing = groups.get(key) || [];
    groups.set(key, [...existing, apt]);
  });

  return groups;
}

/**
 * Adds stacking metadata to appointments for visualization
 */
export function addStackingMetadata(appointments: Appointment[]): StackedAppointment[] {
  const grouped = groupByStartTime(appointments);
  const opacityLevels = [100, 85, 70];

  return appointments.map((apt) => {
    const key = new Date(apt.start_time).toISOString();
    const group = grouped.get(key) || [];
    const stackPosition = group.findIndex(a => a.id === apt.id);
    const totalInStack = group.length;
    const opacity = opacityLevels[Math.min(stackPosition, 2)] || 70;

    return {
      ...apt,
      stackPosition,
      totalInStack,
      opacity
    };
  });
}

/**
 * Checks if appointments overlap in time (not just exact same start time)
 */
export function appointmentsOverlap(apt1: Appointment, apt2: Appointment): boolean {
  const start1 = new Date(apt1.start_time).getTime();
  const end1 = new Date(apt1.end_time).getTime();
  const start2 = new Date(apt2.start_time).getTime();
  const end2 = new Date(apt2.end_time).getTime();

  return start1 < end2 && start2 < end1;
}

/**
 * Groups appointments by overlapping time slots (for cascade layout - step 7j)
 */
export function groupByOverlappingSlots(appointments: Appointment[]): Appointment[][] {
  if (appointments.length === 0) return [];

  const sorted = [...appointments].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  const groups: Appointment[][] = [];
  let currentGroup: Appointment[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const apt = sorted[i];
    const overlapsWithCurrent = currentGroup.some(groupApt => appointmentsOverlap(groupApt, apt));

    if (overlapsWithCurrent) {
      currentGroup.push(apt);
    } else {
      groups.push(currentGroup);
      currentGroup = [apt];
    }
  }

  groups.push(currentGroup);
  return groups;
}

/**
 * Calculate the width percentage for each appointment in a stack
 */
export function calculateStackWidth(position: number, total: number): number {
  if (total === 1) return 100;
  if (total === 2) return 50;
  if (total === 3) return 33.33;
  // For 4+ appointments, compress them
  return 25;
}

/**
 * Generate CSS styles for stacked appointment positioning
 */
export function getStackPositionStyles(
  stackPosition: number,
  totalInStack: number,
  opacity: number
): React.CSSProperties {
  const width = calculateStackWidth(stackPosition, totalInStack);
  const left = stackPosition * width;

  return {
    width: `${width}%`,
    left: `${left}%`,
    opacity: opacity / 100,
  };
}

/**
 * Cascade Layout Algorithm (Step 7j - Apple Calendar style)
 * Assigns columns to overlapping appointments for week/day views
 */
export interface CascadeColumn {
  appointments: Appointment[];
  columnIndex: number;
}

export interface CascadedAppointment extends Appointment {
  columnIndex: number;
  totalColumns: number;
  rowStart: number;
  rowSpan: number;
}

/**
 * Allocate appointments to columns based on overlaps (Step 7o - Enhanced for multi-hour appointments)
 * Returns appointments with column assignments
 *
 * This algorithm properly handles multi-hour appointments by considering their full time span
 * when detecting overlaps, not just their starting hour.
 */
export function allocateCascadeColumns(
  appointments: Array<Appointment & { rowStart: number; rowSpan: number }>
): CascadedAppointment[] {
  if (appointments.length === 0) return [];

  // Sort by start time, then by duration (longer first)
  const sorted = [...appointments].sort((a, b) => {
    const startDiff = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    if (startDiff !== 0) return startDiff;
    // If same start time, longer appointments first
    return b.rowSpan - a.rowSpan;
  });

  const result: CascadedAppointment[] = [];
  const columns: Array<{ end: number; appointments: CascadedAppointment[] }> = [];

  for (const apt of sorted) {
    const start = new Date(apt.start_time).getTime();
    const end = new Date(apt.end_time).getTime();

    // Find the first available column (Step 7o enhancement: use full appointment span)
    let columnIndex = 0;
    let foundColumn = false;

    for (let i = 0; i < columns.length; i++) {
      // Check if this column is free (last appointment's END time is before current START time)
      // This correctly handles multi-hour appointments that span across hour boundaries
      if (columns[i].end <= start) {
        columnIndex = i;
        foundColumn = true;
        break;
      }
    }

    if (!foundColumn) {
      // Need a new column
      columnIndex = columns.length;
      columns.push({ end, appointments: [] });
    } else {
      // Update existing column's end time to the maximum of current end or appointment end
      // This ensures subsequent appointments consider the full span of multi-hour appointments
      columns[columnIndex].end = Math.max(columns[columnIndex].end, end);
    }

    const cascaded: CascadedAppointment = {
      ...apt,
      columnIndex,
      totalColumns: Math.max(columns.length, columnIndex + 1),
    };

    columns[columnIndex].appointments.push(cascaded);
    result.push(cascaded);
  }

  // Update totalColumns for all appointments
  const totalColumns = columns.length;
  result.forEach(apt => {
    apt.totalColumns = totalColumns;
  });

  return result;
}

/**
 * Calculate column width percentage for cascade layout
 * Compresses when more than 4 columns
 */
export function getCascadeColumnWidth(totalColumns: number): number {
  if (totalColumns === 1) return 100;
  if (totalColumns === 2) return 50;
  if (totalColumns === 3) return 33.33;
  if (totalColumns === 4) return 25;
  // 4+ columns: compress further
  return Math.max(100 / totalColumns, 20); // Minimum 20% width
}

/**
 * Get inline styles for cascaded appointment positioning
 * Enhanced with visual spacing and depth cues
 */
export function getCascadePositionStyles(
  columnIndex: number,
  totalColumns: number,
  topPx: number,
  heightPx: number
): React.CSSProperties {
  const width = getCascadeColumnWidth(totalColumns);
  const left = columnIndex * width;

  // Add subtle vertical offset for "shingled" effect (max 4px offset per column)
  const verticalOffset = Math.min(columnIndex * 2, 8);

  // Calculate right padding to create gaps between columns
  // Last column has less padding, others have 4-8px depending on total columns
  const rightPaddingPercent = columnIndex === totalColumns - 1 ? 0.5 : (totalColumns <= 3 ? 2 : 1.5);

  return {
    position: 'absolute',
    left: `${left}%`,
    width: `calc(${width}% - ${rightPaddingPercent}%)`,
    top: `${topPx + verticalOffset}px`,
    height: `${heightPx - verticalOffset}px`,
    zIndex: 10 + columnIndex, // Higher z-index for later columns
  };
}

/**
 * Get visual style classes for cascaded appointments
 * Returns CSS classes for border, shadow, and hover effects
 */
export function getCascadeVisualClasses(
  columnIndex: number,
  _totalColumns: number,
  isCompressed: boolean = false
): string {
  const baseClasses = 'group transition-all duration-200';

  // Border intensity: later columns get slightly thicker borders for depth
  const borderClass = columnIndex === 0
    ? 'border-2 border-teal-200'
    : columnIndex === 1
    ? 'border-2 border-teal-300'
    : 'border-2 border-teal-400';

  // Shadow depth: create visual layering
  const shadowClass = columnIndex === 0
    ? 'shadow-sm'
    : columnIndex === 1
    ? 'shadow-md'
    : 'shadow-lg';

  // Hover effect: expand slightly on hover
  const hoverClass = 'hover:scale-[1.02] hover:shadow-xl hover:z-50';

  // Compression indicator (when more than 4 overlapping appointments)
  const compressionClass = isCompressed ? 'ring-1 ring-orange-300' : '';

  return `${baseClasses} ${borderClass} ${shadowClass} ${hoverClass} ${compressionClass}`;
}
