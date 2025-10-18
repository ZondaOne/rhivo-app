# Step 7f2: Unified Off-Time System for Slot Generation

## Overview

Implemented a unified off-time system that treats all unavailable time intervals uniformly, preventing bookings from spanning across breaks, closed periods, or holidays. This system integrates seamlessly with the 5-minute grain block system and the breaks/split shifts schema from Step 7f1.

## Purpose

Before Step 7f2, the slot generation logic only checked for:
- Closed days (availability.enabled = false)
- Holidays (availabilityExceptions.closed = true)
- Individual availability hours

It did NOT properly handle:
- Breaks between availability slots
- Services spanning across break boundaries
- Consistent validation across all booking entry points

The unified off-time system solves this by:
1. Treating all unavailable time uniformly as "off-time intervals"
2. Pre-computing these intervals for efficient checking
3. Validating that no booking (service + buffers) intersects with off-time
4. Providing detailed reasons for unavailability

## Architecture

### Core Components

#### 1. OffTimeInterval Interface

```typescript
interface OffTimeInterval {
  start: Date;
  end: Date;
  reason: string;
  type: 'closed_day' | 'break' | 'holiday' | 'exception';
}
```

Represents any period when the business is unavailable for bookings.

#### 2. generateOffTimeIntervals()

```typescript
function generateOffTimeIntervals(
  config: TenantConfig,
  startDate: Date,
  endDate: Date
): OffTimeInterval[]
```

Aggregates all sources of off-time for a date range:
- **Closed days**: When availability.enabled = false
- **Before/after business hours**: Time outside availability slots
- **Breaks**: Gaps between availability slots (e.g., lunch break from 13:00-14:00)
- **Holidays**: availabilityExceptions with closed = true
- **Custom exceptions**: availabilityExceptions with modified hours

Returns a sorted array of off-time intervals for efficient overlap checking.

#### 3. isTimeAvailable()

```typescript
function isTimeAvailable(
  start: Date,
  end: Date,
  offTimes: OffTimeInterval[]
): boolean
```

Fast check if a time range is fully available (no intersections with off-time).
Uses grain-block precision interval overlap detection: `start1 < end2 AND end1 > start2`

#### 4. getIntersectingOffTimes()

```typescript
function getIntersectingOffTimes(
  start: Date,
  end: Date,
  offTimes: OffTimeInterval[]
): OffTimeInterval[]
```

Returns all off-time intervals that intersect with a given range.
Useful for showing detailed reasons why a time slot is unavailable.

#### 5. OffTimeCache Class

```typescript
class OffTimeCache {
  getForDay(date: Date): OffTimeInterval[]
  getForRange(startDate: Date, endDate: Date): OffTimeInterval[]
  clear(): void
}
```

Pre-computes and caches off-time intervals per day for performance optimization.
Reduces redundant calculations when checking many time slots.

## Integration Points

### 1. Slot Generation (slot-generator.ts)

**Before Step 7f2:**
```typescript
// Only checked if day was closed or had exceptions
if (!availability.enabled) return [];
if (exception?.closed) return [];

// Generated slots within open/close times
// No break checking - could generate slots that span breaks
```

**After Step 7f2:**
```typescript
// Pre-compute all off-time intervals for date range
const offTimeIntervals = generateOffTimeIntervals(config, startDate, endDate);

// For each potential slot:
if (!isTimeAvailable(effectiveStart, bufferEnd, offTimeIntervals)) {
  const intersecting = getIntersectingOffTimes(effectiveStart, bufferEnd, offTimeIntervals);
  // Mark slot as unavailable with specific reason
}
```

Benefits:
- Slots that would span breaks are automatically marked unavailable
- Detailed reasons provided (e.g., "Break", "After business hours")
- Consistent with availability slots from Step 7f1

### 2. Drag-and-Drop Validation (calendar-utils.ts)

Enhanced `validateReschedule()` to check off-time intervals:

```typescript
export function validateReschedule(
  appointment: Appointment,
  newStartTime: Date,
  duration: number,
  existingAppointments: Appointment[],
  maxSimultaneous: number = 1,
  config?: TenantConfig,  // Added for off-time checking
  bufferBefore: number = 0,
  bufferAfter: number = 0
): { valid: boolean; reason?: string; snappedStartTime?: Date }
```

Now prevents drag-and-drop rescheduling to times that would:
- Span across breaks
- Extend into closed periods
- Conflict with holidays

Returns clear error messages like "Cannot schedule during break".

### 3. Future Integration Points

The unified off-time system should be used in:
- Manual appointment creation API
- Appointment edit modal validation
- Reschedule API endpoints
- Reservation creation (booking flow)

## Examples

### Example 1: Lunch Break

**YAML Configuration:**
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

**Generated Off-Time Intervals:**
```typescript
[
  {
    start: Mon 00:00:00,
    end: Mon 09:00:00,
    reason: "Before business hours",
    type: "closed_day"
  },
  {
    start: Mon 13:00:00,
    end: Mon 14:00:00,
    reason: "Break",
    type: "break"
  },
  {
    start: Mon 18:00:00,
    end: Mon 23:59:59,
    reason: "After business hours",
    type: "closed_day"
  }
]
```

**Slot Generation Result:**
- 90-minute massage service at 12:00 → **UNAVAILABLE** (would extend to 13:30, spanning break)
- 90-minute massage service at 12:30 → **UNAVAILABLE** (would extend to 14:00, spanning break)
- 90-minute massage service at 14:00 → **AVAILABLE** (ends at 15:30, within second slot)

### Example 2: Split Shift (Morning & Evening)

**YAML Configuration:**
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

**Generated Off-Time Intervals:**
```typescript
[
  {
    start: Fri 00:00:00,
    end: Fri 06:00:00,
    reason: "Before business hours",
    type: "closed_day"
  },
  {
    start: Fri 10:00:00,
    end: Fri 18:00:00,
    reason: "Break",
    type: "break"
  },
  {
    start: Fri 22:00:00,
    end: Fri 23:59:59,
    reason: "After business hours",
    type: "closed_day"
  }
]
```

**Slot Generation Result:**
- 60-minute service at 09:30 → **AVAILABLE** (ends at 10:30, but 10:00-10:30 is break, so actually **UNAVAILABLE**)
- 45-minute service at 09:00 → **AVAILABLE** (ends at 09:45, within first slot)
- 60-minute service at 18:00 → **AVAILABLE** (ends at 19:00, within second slot)

### Example 3: Holiday Exception

**YAML Configuration:**
```yaml
availabilityExceptions:
  - date: "2025-12-25"
    reason: "Christmas Day"
    closed: true
```

**Generated Off-Time Intervals:**
```typescript
[
  {
    start: 2025-12-25 00:00:00,
    end: 2025-12-25 23:59:59,
    reason: "Christmas Day",
    type: "holiday"
  }
]
```

**Slot Generation Result:**
- All slots on Dec 25, 2025 → **UNAVAILABLE** (entire day marked as holiday)

### Example 4: Buffer Times with Breaks

**Service Configuration:**
```yaml
services:
  - id: deep-tissue-massage
    name: Deep Tissue Massage
    duration: 60
    bufferBefore: 10
    bufferAfter: 15
```

**Availability:**
```yaml
slots:
  - open: "09:00"
    close: "13:00"
  - open: "14:00"
    close: "18:00"
```

**Effective Occupied Time for 12:00 booking:**
- Buffer before: 11:50
- Service: 12:00 - 13:00
- Buffer after: until 13:15
- **Result: UNAVAILABLE** because buffer extends into break (13:00-14:00)

**Effective Occupied Time for 11:45 booking:**
- Buffer before: 11:35
- Service: 11:45 - 12:45
- Buffer after: until 13:00
- **Result: AVAILABLE** because buffer ends exactly at break start

## Performance Optimization

### Pre-computation Strategy

Off-time intervals are computed once per date range, not per slot:

```typescript
// EFFICIENT (Step 7f2 approach)
const offTimes = generateOffTimeIntervals(config, startDate, endDate);
for (slot in slots) {
  isTimeAvailable(slot.start, slot.end, offTimes); // Fast lookup
}

// INEFFICIENT (naive approach)
for (slot in slots) {
  const offTimes = generateOffTimeIntervals(config, slot.start, slot.end);
  isTimeAvailable(slot.start, slot.end, offTimes);
}
```

### Binary Search Optimization (Future Enhancement)

For businesses with many breaks and exceptions, we could optimize `isTimeAvailable` with binary search:

```typescript
function isTimeAvailable(start, end, offTimes) {
  // Find first off-time that could overlap using binary search
  const idx = binarySearchFirstPossibleOverlap(start, offTimes);

  // Check only relevant off-times
  for (let i = idx; i < offTimes.length && offTimes[i].start < end; i++) {
    if (intervalsOverlap(start, end, offTimes[i].start, offTimes[i].end)) {
      return false;
    }
  }
  return true;
}
```

Current implementation uses linear search, which is acceptable for typical scenarios (< 10 off-time intervals per day).

## Edge Cases Handled

### 1. Service Spanning Multiple Availability Slots

**Scenario:** Business has slots 09:00-12:00 and 13:00-18:00. Customer tries to book 4-hour service at 11:00.

**Behavior:**
- Service would run 11:00-15:00
- This spans break from 12:00-13:00
- `isTimeAvailable(11:00, 15:00, offTimes)` returns false
- Slot marked as unavailable with reason "Break"

### 2. Service Ending Exactly at Break Start

**Scenario:** Business has slots 09:00-13:00 and 14:00-18:00. Customer books 60-minute service at 12:00.

**Behavior:**
- Service runs 12:00-13:00
- Ends exactly when break starts (13:00)
- Interval overlap check: `12:00 < 14:00 AND 13:00 > 13:00` = false (no overlap)
- Slot is **AVAILABLE**

### 3. Service Starting Exactly at Break End

**Scenario:** Customer books 60-minute service at 14:00 (break is 13:00-14:00).

**Behavior:**
- Service runs 14:00-15:00
- Starts exactly when break ends
- Interval overlap check: `14:00 < 14:00 AND 15:00 > 13:00` = false (no overlap)
- Slot is **AVAILABLE**

### 4. Midnight Wraparound

**Scenario:** Business has late-night hours 20:00-00:00.

**Behavior:**
- Day end is set to 23:59:59.999
- Off-time after last slot: 00:00:00 (next day) - 23:59:59
- No wraparound issues because each day is processed independently

### 5. Exception Overriding Regular Availability

**Scenario:** Regular Monday hours are 09:00-17:00, but Dec 28 (Monday) has exception 10:00-15:00.

**Behavior:**
- `generateOffTimeIntervalsForDay` checks exceptions first
- If exception with custom hours exists, uses those instead of regular availability
- Off-time intervals: 00:00-10:00 and 15:00-23:59:59

## Testing Scenarios

### Unit Tests Required

1. **Off-time generation for closed day**
   - Input: availability.enabled = false
   - Expected: Single off-time interval covering entire day

2. **Off-time generation for lunch break**
   - Input: slots = [{09:00-13:00}, {14:00-18:00}]
   - Expected: Three intervals (before 09:00, 13:00-14:00 break, after 18:00)

3. **Off-time generation for split shift**
   - Input: slots = [{06:00-10:00}, {18:00-22:00}]
   - Expected: Three intervals (before 06:00, 10:00-18:00 break, after 22:00)

4. **Off-time generation for holiday**
   - Input: availabilityExceptions with closed=true
   - Expected: Single interval covering entire day with type="holiday"

5. **Interval overlap detection - overlapping**
   - Input: [10:00, 12:00] and [11:00, 13:00]
   - Expected: true (overlap exists)

6. **Interval overlap detection - adjacent**
   - Input: [10:00, 12:00] and [12:00, 14:00]
   - Expected: false (no overlap, exact boundary)

7. **Service spanning break**
   - Input: 90-min service at 12:00, break 13:00-14:00
   - Expected: isTimeAvailable = false

8. **Service ending at break start**
   - Input: 60-min service at 12:00, break 13:00-14:00
   - Expected: isTimeAvailable = true

9. **Multiple breaks in single day**
   - Input: slots = [{08:00-12:00}, {12:30-14:00}, {15:00-19:00}]
   - Expected: Five off-time intervals

10. **Buffer times extending into break**
    - Input: Service 12:00-13:00 with bufferAfter=15, break 13:00-14:00
    - Expected: isTimeAvailable = false (buffer extends to 13:15)

### Integration Tests Required

1. **Slot generation with lunch break**
   - Verify no slots span break period
   - Verify slots generated correctly in both availability periods

2. **Slot generation with split shift**
   - Verify no slots during long break
   - Verify correct slot distribution in morning and evening

3. **Drag-and-drop reschedule to break time**
   - Attempt to drag appointment to 13:30 (during 13:00-14:00 break)
   - Verify validation fails with clear reason

4. **Manual appointment creation during break**
   - Submit form to create appointment at 13:15
   - Verify API rejects with "Cannot schedule during break" error

5. **Holiday exception blocking all slots**
   - Configure exception for specific date with closed=true
   - Verify no available slots generated for that date

## Acceptance Criteria

- [x] OffTimeInterval interface and type definitions created
- [x] generateOffTimeIntervals() function aggregates all off-time sources
- [x] Slot generation correctly excludes all off-time (closed days, breaks, holidays, exceptions)
- [x] Bookings cannot span across breaks (service + buffers must complete before break or start after)
- [x] Drag-and-drop validation checks against off-time intervals
- [ ] Manual appointment creation validates against off-time (requires API updates)
- [ ] Reschedule API endpoint validates against off-time (requires API updates)
- [x] Unified system treats all unavailable time consistently
- [x] Performance remains acceptable with complex availability patterns
- [x] All off-time sources handled by same logic
- [x] Clear, specific error messages provided (e.g., "Break", "Holiday")

## Next Steps

### Immediate (Step 7f3)
- Add visual break indicators to calendar UI
- Show break labels in timeline views
- Display business hours summary with breaks
- Update booking page to show break times

### Short-term (API Integration)
- Update manual appointment creation API to use `isTimeAvailable`
- Update reschedule API endpoint to validate with off-time system
- Add off-time data to appointment validation middleware

### Future Enhancements
- Binary search optimization for businesses with many exceptions
- Interval tree data structure for O(log n) overlap detection
- Smart break suggestions (e.g., "This time conflicts with lunch break. Try 14:00?")
- Visual timeline showing all off-time intervals for debugging

## Files Modified

### Created
- `/src/lib/booking/off-time-system.ts` - Core unified off-time system

### Modified
- `/src/lib/booking/slot-generator.ts` - Integrated off-time checking into slot generation
- `/src/lib/calendar-utils.ts` - Enhanced validateReschedule with off-time validation

## Technical Details

### Time Complexity
- `generateOffTimeIntervals`: O(D * S) where D = days, S = slots per day (typically 1-3)
- `isTimeAvailable`: O(N) where N = off-time intervals (typically < 10 per day)
- `getIntersectingOffTimes`: O(N)

### Space Complexity
- O(D * S) for storing off-time intervals
- OffTimeCache stores O(D * S) intervals in memory

### Grain Block Precision
All interval calculations use the 5-minute grain block system:
- Off-time intervals align to grain boundaries (start/end times from YAML are already HH:MM)
- Service durations are multiples of 5 (enforced by schema)
- Buffer times are multiples of 5 (auto-rounded by schema)
- Overlap detection uses standard interval logic that works with any grain-aligned times

## References

- **Step 7f1**: Breaks and split shifts YAML schema foundation
- **Step 7f3**: Break visualization and booking UX (next step)
- **Step 7g**: Drag-and-drop rescheduling with validation
- **Step 7h**: Appointment edit modal with off-time validation
- **STEP_7F1_BREAKS_SPLIT_SHIFTS.md**: Detailed YAML schema documentation
