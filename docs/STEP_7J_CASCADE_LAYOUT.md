# Step 7j: Cascade Layout for Overlapping Appointments

**Status:** ✅ Implemented

## Overview

Implements Apple Calendar-style cascade layout for overlapping and near-time appointments in week and day views. Month view retains simple stacking with overflow badges.

## Implementation Details

### Cascade Layout Algorithm

**File:** `src/lib/appointment-stacking.ts`

The cascade algorithm allocates appointments to columns when they overlap in time:

1. **Column Allocation Logic:**
   - Sort appointments by start time (longer appointments first if same start time)
   - For each appointment, find the first available column where no overlap exists
   - If all columns have overlaps, create a new column
   - Track column end times to enable reuse when appointments don't overlap

2. **Column Width Calculation:**
   - 1 column: 100% width
   - 2 columns: 50% width each
   - 3 columns: 33.33% width each
   - 4 columns: 25% width each
   - 5+ columns: compressed (minimum 20% width with visual hint)

3. **Vertical Positioning:**
   - Minute-level precision using 5-minute grain alignment
   - Appointment height based on duration (rowSpan × cellHeight)
   - Top position based on start minute within the hour

### View-Specific Rendering

#### Month View (Stacking - Step 7i)
- Shows up to 3 appointments per time slot horizontally
- Uses opacity variations (100%, 85%, 70%) for visual differentiation
- Overflow badge shows "+N more" when >3 bookings
- Click overflow badge navigates to list view filtered to that date
- **Does NOT use cascade layout** (as per requirements)

#### Week View (Cascade Layout)
- Full cascade layout with column allocation
- Appointments positioned absolutely within hour cells
- 69px cell height (96px with padding)
- Gap between columns for visual separation
- Hover expands appointment to higher z-index with shadow

#### Day View (Cascade Layout)
- Same cascade algorithm as week view
- Larger cell height (140px) allows more detail
- Shows customer name when totalColumns ≤ 3
- Shows notes when totalColumns ≤ 2 and height > 80px
- Current time indicator displayed on today

### Key Functions

```typescript
// Allocate appointments to cascade columns
allocateCascadeColumns(
  appointments: Array<Appointment & { rowStart: number; rowSpan: number }>
): CascadedAppointment[]

// Calculate column width based on total columns
getCascadeColumnWidth(totalColumns: number): number

// Get CSS positioning styles for cascaded appointment
getCascadePositionStyles(
  columnIndex: number,
  totalColumns: number,
  topPx: number,
  heightPx: number
): React.CSSProperties
```

## Visual Behavior

### Cascade Spacing
- Left padding: 4px (week) / 8px (day)
- Gap between columns: 2px (week) / 2px (day)
- Right padding: 4px for last column, 6px/10px for others

### Hover Interactions
- On hover: z-index increases to 30
- Shadow appears (day view only)
- Edit button fades in
- Smooth transitions (60fps)

### Compression Mode
- Triggered when >4 columns needed
- Columns compress to minimum 20% width
- Customer names hidden when totalColumns > 3
- Notes hidden when totalColumns > 2

## Edge Cases Handled

1. **Same Start Time:** Longer appointments allocated first
2. **Partial Overlaps:** Correctly detects interval overlaps using start < end2 && start2 < end1
3. **Very Short Appointments:** Minimum height 32px (week) / 48px (day)
4. **Dense Schedules:** Compresses columns and hides details gracefully
5. **Drag and Drop:** Works correctly with cascaded appointments
6. **Mobile/Narrow Views:** Responsive adjustments in month view (2 max before overflow)

## Accessibility

- Keyboard navigation works with cascaded appointments
- Edit buttons accessible via tab
- Screen reader announces appointment details
- ARIA labels on overflow badges

## Performance

- Cascade algorithm: O(n × m) where n = appointments, m = columns (typically ≤ 4)
- Sorting: O(n log n)
- No performance impact for typical schedules (< 50 appointments/day)
- Absolute positioning avoids layout thrashing

## Related Files

- `src/lib/appointment-stacking.ts` - Cascade algorithm
- `src/components/dashboard/Calendar.tsx` - View implementations
- `src/lib/calendar-utils.ts` - Time calculations and 5-minute grain

## Testing Scenarios

- [x] Single appointment in slot
- [x] Two appointments overlapping (10:00-11:00, 10:30-11:30)
- [x] Three appointments with different start times (10:00, 10:15, 10:30)
- [x] Four appointments exactly overlapping (10:00-11:00 all)
- [x] Five+ appointments requiring compression
- [x] Appointments with different durations (15min, 45min, 90min)
- [x] Drag and drop between columns
- [x] Month view maintains stacking behavior
- [x] Overflow badge navigation to list view

## Future Enhancements

- [ ] Optional horizontal scroll for 6+ columns
- [ ] Configurable max visible columns via tenant YAML
- [ ] Color coding by service type in cascade view
- [ ] Compress mode visual indicator (e.g., "..." badge)

---

**Acceptance Criteria Met:**
✅ Cascade layout displays overlapping appointments in adjacent columns
✅ Column widths distribute proportionally (up to 4 columns, then compress)
✅ Vertical positioning uses minute-level precision with 5-minute grain
✅ Hover expands appointment for full details
✅ Month view uses stacking with overflow badge (NOT cascade)
✅ Smooth 60fps animations
✅ Works in both week and day views
✅ Handles edge cases (same start time, partial overlaps, very short appointments)
