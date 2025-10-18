# Step 7f1: Shift Breaks and Split Shifts in YAML Schema

## Overview

Extended the YAML availability schema to support multiple time slots per day, enabling businesses to configure:
- Lunch breaks (e.g., 9:00-13:00, 14:00-18:00)
- Split shifts (e.g., 6:00-10:00, 18:00-22:00)
- Multiple breaks throughout the day

## Implementation

### Schema Changes

Modified `tenant-schema.ts` to support both legacy and new formats:

1. **New TimeSlotSchema**: Defines a single time slot with `open` and `close` times
2. **Updated DailyAvailabilitySchema**: Accepts either:
   - Legacy format: single `open`/`close` fields (auto-converted to slots array)
   - New format: `slots` array containing multiple time slots

### Backward Compatibility

The schema automatically converts legacy configurations:

```typescript
// Legacy format (still supported)
{
  day: 'monday',
  open: '09:00',
  close: '17:00',
  enabled: true
}

// Auto-converted internally to:
{
  day: 'monday',
  enabled: true,
  slots: [{ open: '09:00', close: '17:00' }]
}
```

All existing YAML configurations continue to work without modification.

### Validation Rules

The schema enforces:

1. **Non-overlapping slots**: Each slot's close time must be before the next slot's open time
2. **Chronological order**: Slots must be defined in time sequence
3. **Valid time ranges**: Each slot's close time must be after its open time
4. **Reasonable daily hours**: Total hours across all slots cannot exceed 24 hours
5. **5-minute grain alignment**: Times automatically snap to 5-minute intervals (enforced by TimeString validator)

## YAML Examples

### Example 1: Single Continuous Shift (Legacy Format)

```yaml
availability:
  - day: monday
    open: "09:00"
    close: "17:00"
    enabled: true
```

### Example 2: Lunch Break

```yaml
availability:
  - day: monday
    enabled: true
    slots:
      - open: "09:00"
        close: "13:00"
      - open: "14:00"
        close: "18:00"
```

This creates a 1-hour lunch break from 13:00-14:00.

### Example 3: Split Shift (Morning and Evening)

```yaml
availability:
  - day: friday
    enabled: true
    slots:
      - open: "06:00"
        close: "10:00"
      - open: "18:00"
        close: "22:00"
```

Perfect for businesses with morning and evening peaks (e.g., breakfast/dinner restaurants).

### Example 4: Multiple Breaks (Italian Business Hours)

```yaml
availability:
  - day: tuesday
    enabled: true
    slots:
      - open: "09:00"
        close: "13:00"
      - open: "15:00"
        close: "19:00"
```

Common in Italy with extended lunch breaks.

### Example 5: Complex Schedule with Varied Breaks

```yaml
availability:
  - day: wednesday
    enabled: true
    slots:
      - open: "08:00"
        close: "12:00"
      - open: "12:30"
        close: "14:00"
      - open: "15:00"
        close: "19:00"
```

Multiple short breaks throughout the day.

### Example 6: Disabled Day (Closed)

```yaml
availability:
  - day: sunday
    enabled: false
    # No open/close or slots needed when disabled
```

## Complete Example Configuration

```yaml
availability:
  # Regular business hours with lunch break
  - day: monday
    enabled: true
    slots:
      - open: "09:00"
        close: "13:00"
      - open: "14:00"
        close: "18:00"

  - day: tuesday
    enabled: true
    slots:
      - open: "09:00"
        close: "13:00"
      - open: "14:00"
        close: "18:00"

  # Extended hours on Wednesday
  - day: wednesday
    enabled: true
    slots:
      - open: "09:00"
        close: "13:00"
      - open: "14:00"
        close: "20:00"

  # Short break Thursday
  - day: thursday
    enabled: true
    slots:
      - open: "09:00"
        close: "12:30"
      - open: "13:00"
        close: "18:00"

  # Split shift Friday (legacy format still works)
  - day: friday
    open: "09:00"
    close: "17:00"
    enabled: true

  # Saturday with multiple breaks
  - day: saturday
    enabled: true
    slots:
      - open: "08:00"
        close: "13:00"
      - open: "15:00"
        close: "20:00"

  # Closed Sunday
  - day: sunday
    enabled: false
```

## TypeScript Types

```typescript
export type TimeSlot = {
  open: string;  // HH:MM format
  close: string; // HH:MM format
};

export type DailyAvailability = {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  enabled: boolean;
  slots: TimeSlot[]; // Empty array if disabled
};
```

## Validation Error Examples

### Invalid: Overlapping Slots

```yaml
# ERROR: Slots overlap (13:00 - 13:30)
availability:
  - day: monday
    enabled: true
    slots:
      - open: "09:00"
        close: "13:30"
      - open: "13:00"  # Starts before previous slot ends
        close: "18:00"
```

**Error Message**: "Slots must be non-overlapping, in chronological order, and total hours must not exceed 24 hours per day"

### Invalid: Out of Order Slots

```yaml
# ERROR: Slots not in chronological order
availability:
  - day: monday
    enabled: true
    slots:
      - open: "14:00"
        close: "18:00"
      - open: "09:00"  # Earlier than previous slot
        close: "13:00"
```

**Error Message**: "Slots must be non-overlapping, in chronological order, and total hours must not exceed 24 hours per day"

### Invalid: Close Before Open

```yaml
# ERROR: Close time before open time
availability:
  - day: monday
    enabled: true
    slots:
      - open: "18:00"
        close: "09:00"  # Next day time not supported in single slot
```

**Error Message**: "Close time must be after open time"

### Invalid: Excessive Daily Hours

```yaml
# ERROR: Total exceeds 24 hours
availability:
  - day: monday
    enabled: true
    slots:
      - open: "00:00"
        close: "12:00"
      - open: "12:00"
        close: "23:59"
      - open: "23:59"
        close: "23:59"  # Total > 24h
```

**Error Message**: "Slots must be non-overlapping, in chronological order, and total hours must not exceed 24 hours per day"

## Migration Guide

### For Existing YAML Configurations

No action required. All existing configurations with single `open`/`close` times are automatically converted to the new slots format internally.

### To Add Breaks to Existing Configuration

1. Replace the single `open`/`close` fields with a `slots` array
2. Define each time segment as a separate slot
3. Ensure slots are in chronological order with no overlaps

**Before:**
```yaml
- day: monday
  open: "09:00"
  close: "18:00"
  enabled: true
```

**After:**
```yaml
- day: monday
  enabled: true
  slots:
    - open: "09:00"
      close: "13:00"
    - open: "14:00"
      close: "18:00"
```

## Integration with Booking System

The slot-generation logic will use the `slots` array to:

1. Generate available time slots only within defined time ranges
2. Mark break periods as unavailable (gaps between slots)
3. Prevent bookings from spanning across breaks
4. Display break times in the calendar UI

See **Step 7f2** (Unified off-time system) for details on how breaks are processed during slot generation.

## Testing

Validation tests are automatically run when YAML configs are loaded. Check console logs for:

```
[YAML Config] Converting single open/close times for monday to slots array format
```

This confirms backward compatibility is working correctly.

## Acceptance Criteria

- [x] YAML configs can define multiple time slots per day
- [x] Validation prevents overlapping or invalid time ranges
- [x] Existing configs with single open/close auto-convert to slots array
- [x] All break scenarios work: lunch breaks, split shifts, multiple breaks per day
- [x] Schema enforces chronological ordering and reasonable daily hours
- [x] Clear documentation with examples provided
- [x] TypeScript types updated to reflect new structure

## Next Steps

- **Step 7f2**: Implement unified off-time system for slot generation using the slots data
- **Step 7f3**: Add break visualization to calendar UI and booking flow
