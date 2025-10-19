# Booking and Rescheduling Logic Consistency Analysis

## Overview

This document analyzes the consistency of booking and rescheduling logic between:
1. **Customer perspective** (public booking flow at `/book`)
2. **Business owner perspective** (dashboard at `/dashboard`)

With steps 7f1 (breaks/split shifts) and 7f2 (unified off-time system) in place, this analysis ensures that the same business rules are enforced consistently across all entry points.

---

## Current Implementation Status

### ✅ What's Working Correctly

#### 1. Capacity Validation (YAML as Single Source of Truth)
**Status: CONSISTENT** ✅

All booking paths correctly use YAML config as the single source of truth for capacity:

- **Customer booking** (`/api/booking/reserve`):
  - Loads YAML config
  - Extracts `service.maxSimultaneousBookings ?? config.bookingLimits.maxSimultaneousBookings`
  - Passes to `ReservationManager.createReservation()`

- **Owner manual appointment** (`/api/appointments/manual`):
  - Loads YAML config
  - Extracts capacity from service config
  - Passes to `AppointmentManager.createManualAppointment()`

- **Owner reschedule** (`/api/appointments/reschedule`):
  - Loads YAML config
  - Uses helper function `getMaxSimultaneousBookings()` to extract capacity
  - Passes to `AppointmentManager.updateAppointment()`

**Conclusion**: Capacity validation is consistent. All paths respect per-service overrides and business-level defaults from YAML.

---

#### 2. Advisory Locks for Race Condition Prevention
**Status: CONSISTENT** ✅

The `ReservationManager.createReservation()` method uses PostgreSQL advisory locks to prevent TOCTOU (time-of-check-to-time-of-use) race conditions:

- Generates deterministic lock key from `business_id + service_id + slot_start`
- Acquires `pg_advisory_xact_lock(lockKey)` before capacity check
- Lock is automatically released at transaction end
- Prevents multiple concurrent reservations for the same slot

This protection applies to:
- Customer booking flow (via reservation system)
- Any code using `ReservationManager.createReservation()`

**Note**: Manual appointment creation uses `getAvailableCapacity()` check without advisory locks, but this is acceptable because:
- Manual appointments bypass the reservation system
- They are created by authenticated business owners (lower concurrency)
- The database trigger `check_appointment_capacity()` serves as a safety net

---

#### 3. Optimistic Locking for Concurrent Modifications
**Status: CONSISTENT** ✅

The `AppointmentManager.updateAppointment()` method uses version-based optimistic locking:

- Checks `appointment.version === expectedVersion` before updating
- Increments version on successful update
- Returns conflict error if version mismatch detected

This applies to:
- Owner reschedule via drag-and-drop (`/api/appointments/reschedule`)
- Owner appointment edit modal (future implementation)

**Conclusion**: Concurrent modification conflicts are properly detected and rejected.

---

### ⚠️ Critical Gaps in Business Rule Enforcement

#### 1. **Off-Time Validation (Breaks, Closed Days, Holidays)**
**Status: INCONSISTENT** ⚠️

**Problem**: Off-time validation using steps 7f1 and 7f2 is NOT consistently applied across all booking entry points.

| Entry Point | Off-Time Validation Status | Impact |
|-------------|---------------------------|--------|
| Customer slot generation (`/api/booking/slots`) | ✅ IMPLEMENTED | Slots correctly exclude breaks, closed periods, holidays |
| Customer reservation creation (`/api/booking/reserve`) | ❌ **MISSING** | **Customers can create reservations during breaks or closed hours** |
| Owner manual appointment (`/api/appointments/manual`) | ❌ **MISSING** | **Owners can create appointments during breaks or closed hours** |
| Owner reschedule drag-and-drop (calendar-utils.ts `validateReschedule()`) | ✅ IMPLEMENTED | Prevents rescheduling to breaks/closed periods |
| Owner reschedule API (`/api/appointments/reschedule`) | ❌ **MISSING** | **API doesn't validate against off-time intervals** |

**Current Behavior**:

1. **Slot Generation** (`/api/booking/slots`):
   ```typescript
   // src/lib/booking/slot-generator.ts:87-90
   const offTimeIntervals = generateOffTimeIntervals(config, startDate, endDate, businessTimezone);

   // Line 224: Checks each slot against off-time
   const conflictsWithOffTime = !isTimeAvailable(effectiveStart, bufferEnd, offTimeIntervals);
   if (conflictsWithOffTime) {
     // Mark slot as unavailable with reason
   }
   ```
   ✅ **Result**: UI correctly shows breaks as unavailable slots.

2. **Reservation Creation** (`/api/booking/reserve`):
   ```typescript
   // app/api/booking/reserve/route.ts:143-151
   const reservation = await manager.createReservation({
     businessId: data.businessId,
     serviceId: service.id,
     slotStart,
     slotEnd,
     idempotencyKey: data.idempotencyKey,
     ttlMinutes: data.ttlMinutes,
     maxSimultaneousBookings // ✅ Capacity checked
     // ❌ NO off-time validation
   });
   ```
   ❌ **Problem**: If a malicious client bypasses the UI and directly calls the API with a time during a break, the reservation will succeed.

3. **Manual Appointment Creation** (`/api/appointments/manual`):
   ```typescript
   // app/api/appointments/manual/route.ts:171-182
   const appointment = await appointmentManager.createManualAppointment({
     businessId: payload.business_id,
     serviceId: body.service_id,
     slotStart,
     slotEnd,
     customerId,
     maxSimultaneousBookings: serviceConfig.maxSimultaneousBookings,
     // ❌ NO off-time validation
   });
   ```
   ❌ **Problem**: Owners can accidentally create appointments during breaks or closed hours.

4. **Reschedule API** (`/api/appointments/reschedule`):
   ```typescript
   // app/api/appointments/reschedule/route.ts:191-199
   await appointmentManager.updateAppointment({
     appointmentId: body.appointmentId,
     slotStart: newStart,
     slotEnd: newEnd,
     serviceId: body.serviceId,
     actorId: payload.sub,
     expectedVersion: currentVersion,
     maxSimultaneousBookings, // ✅ Capacity checked
     // ❌ NO off-time validation
   });
   ```
   ❌ **Problem**: API doesn't validate against breaks, even though the frontend drag-and-drop does.

5. **Calendar Drag-and-Drop Validation** (frontend only):
   ```typescript
   // src/lib/calendar-utils.ts:372-389
   if (config) {
     const offTimes = generateOffTimeIntervals(config, snappedStart, newEndTime);
     if (!isTimeAvailable(effectiveStart, effectiveEnd, offTimes)) {
       const intersecting = getIntersectingOffTimes(effectiveStart, effectiveEnd, offTimes);
       const reason = intersecting.length > 0
         ? `Cannot schedule during ${intersecting[0].reason.toLowerCase()}`
         : 'Time slot conflicts with business hours';
       return { valid: false, reason };
     }
   }
   ```
   ⚠️ **Partial**: Frontend validates, but API endpoint doesn't double-check.

**Security Risk**: A client could bypass UI validation and make direct API calls to book during breaks.

**User Experience Risk**: Owners could accidentally double-click or drag appointments to invalid times, and the API would accept them.

---

#### 2. **Buffer Time Validation**
**Status: PARTIALLY IMPLEMENTED** ⚠️

**Problem**: Buffer times (before/after service) are validated in slot generation and drag-and-drop, but NOT in API endpoints.

| Entry Point | Buffer Validation Status |
|-------------|-------------------------|
| Slot generation | ✅ Includes buffers in off-time checks |
| Customer reservation API | ⚠️ **Buffers not considered in off-time validation** |
| Owner manual appointment API | ⚠️ **Buffers not considered in off-time validation** |
| Owner reschedule API | ⚠️ **Buffers not considered in off-time validation** |

**Current Behavior**:

Slot generation correctly calculates effective occupied time:
```typescript
// src/lib/booking/slot-generator.ts:180-208
const bufferBefore = service.bufferBefore || 0;
const bufferAfter = service.bufferAfter || 0;

// Effective start includes buffer before
const effectiveStart = new Date(slotStart);
effectiveStart.setMinutes(effectiveStart.getMinutes() - bufferBefore);

// Effective end includes buffer after
const bufferEnd = new Date(slotEnd);
bufferEnd.setMinutes(bufferEnd.getMinutes() + bufferAfter);

// Check if effective time (including buffers) conflicts with off-time
const conflictsWithOffTime = !isTimeAvailable(effectiveStart, bufferEnd, offTimeIntervals);
```

But API endpoints don't retrieve or validate buffer times:
```typescript
// app/api/booking/reserve/route.ts - NO buffer validation
// app/api/appointments/manual/route.ts - NO buffer validation
// app/api/appointments/reschedule/route.ts - NO buffer validation
```

**Impact**:
- A service with `bufferAfter: 15` could be booked at 12:45, extending to 13:15, which would overlap with a 13:00-14:00 lunch break
- The UI would show this slot as unavailable, but the API would accept it

---

#### 3. **Business Hours Validation**
**Status: INCONSISTENT** ⚠️

**Problem**: Business hours validation is implicit in slot generation (slots are only generated within availability hours), but there's NO explicit validation in API endpoints.

| Entry Point | Business Hours Validation |
|-------------|--------------------------|
| Slot generation | ✅ Only generates slots within availability hours |
| Reservation API | ❌ **No explicit check if time is within availability slots** |
| Manual appointment API | ⚠️ Has past-time check but no availability check |
| Reschedule API | ⚠️ Error handling mentions "outside business hours" but implementation doesn't check |

**Current Code**:

Manual appointment has only past-time check:
```typescript
// app/api/appointments/manual/route.ts:101-103
if (slotStart < new Date()) {
  return NextResponse.json({ message: 'Cannot create appointments in the past' }, { status: 400 });
}
// ❌ NO CHECK: Is slotStart within availability slots?
```

Reschedule API mentions business hours in error handling:
```typescript
// app/api/appointments/reschedule/route.ts:260-268
if (error instanceof Error && error.message.includes('outside business hours')) {
  return NextResponse.json({
    message: 'This time is outside of business hours. Please choose a time during operating hours.',
    code: 'OUTSIDE_BUSINESS_HOURS'
  }, { status: 400 });
}
// ❌ But the actual validation doesn't throw this error
```

**Impact**:
- An owner could manually create an appointment at 3:00 AM when business hours are 9:00 AM - 6:00 PM
- The API would accept it because there's no availability check

---

#### 4. **Advance Booking Limits**
**Status: INCONSISTENT** ⚠️

**Problem**: Advance booking limits are validated in slot generation but NOT in API endpoints.

| Entry Point | Advance Booking Validation |
|-------------|---------------------------|
| Slot generation | ✅ Respects `advanceBookingDays` and `minAdvanceBookingMinutes` |
| Reservation API | ❌ **No check against advance booking limits** |
| Manual appointment API | ⚠️ Only checks past time, not advance limit |
| Reschedule API | ⚠️ Allows rescheduling up to 5 minutes in the past (intentional) but no far-future check |

**Current Behavior**:

Slot generation enforces limits:
```typescript
// src/lib/booking/slot-generator.ts:168-177
const maxAdvanceDate = new Date(now);
maxAdvanceDate.setDate(maxAdvanceDate.getDate() + config.bookingLimits.advanceBookingDays);

if (date > maxAdvanceDate) {
  return slots; // Beyond advance booking window
}

const minAdvanceTime = new Date(now);
minAdvanceTime.setMinutes(minAdvanceTime.getMinutes() + config.bookingLimits.minAdvanceBookingMinutes);

if (slotStart < minAdvanceTime) {
  // Skip slot
}
```

But APIs don't enforce these limits:
```typescript
// app/api/booking/reserve/route.ts - NO advance booking limit check
// app/api/appointments/manual/route.ts - NO advance booking limit check
```

**Impact**:
- If `advanceBookingDays: 30`, a customer could bypass UI and book an appointment 365 days in advance
- If `minAdvanceBookingMinutes: 120`, a customer could bypass UI and book an appointment 5 minutes from now

---

#### 5. **5-Minute Grain Alignment**
**Status: INCONSISTENT** ⚠️

**Problem**: Grain alignment is enforced in drag-and-drop but NOT in API endpoints.

| Entry Point | Grain Alignment |
|-------------|----------------|
| Slot generation | ✅ All slots are grain-aligned |
| Drag-and-drop validation | ✅ Uses `snapToGrain()` function |
| Reservation API | ❌ **Accepts any timestamp** |
| Manual appointment API | ❌ **Accepts any timestamp** |
| Reschedule API | ❌ **Accepts any timestamp** |

**Current Behavior**:

Drag-and-drop snaps to grain:
```typescript
// src/lib/calendar-utils.ts:361-362
const snappedStart = snapToGrain(newStartTime);
```

But APIs accept raw timestamps:
```typescript
// app/api/booking/reserve/route.ts:126-139
if (data.startTime) {
  slotStart = new Date(data.startTime); // ❌ NOT snapped to grain
}
```

**Impact**:
- A booking could be created at 10:07 AM instead of 10:05 AM or 10:10 AM
- This breaks the visual grid alignment in calendar views
- Overlap detection still works (uses interval math), but UI may look misaligned

---

## Summary of Issues

### Critical Issues (Security/Data Integrity)

1. **Off-time validation missing in APIs** - Customers and owners can create bookings during breaks, closed days, or holidays
2. **Buffer time validation missing in APIs** - Bookings can extend into off-time periods via buffers
3. **Business hours validation missing in APIs** - Bookings can be created outside availability slots

### Important Issues (Business Logic)

4. **Advance booking limits not enforced in APIs** - Customers can bypass advance booking restrictions
5. **Grain alignment not enforced in APIs** - Bookings can have non-standard timestamps

### Low Priority Issues (UX Consistency)

6. **Error message inconsistency** - Reschedule API mentions "outside business hours" but doesn't actually check

---

## Recommended Fixes

### Priority 1: Off-Time Validation in All APIs

Add off-time validation to:
- `/api/booking/reserve` (before creating reservation)
- `/api/appointments/manual` (before creating appointment)
- `/api/appointments/reschedule` (before updating appointment)

**Implementation Pattern**:

```typescript
import { loadConfigBySubdomain } from '@/lib/config/config-loader';
import { generateOffTimeIntervals, isTimeAvailable } from '@/lib/booking/off-time-system';

// 1. Load YAML config
const configResult = await loadConfigBySubdomain(subdomain);
const config = configResult.config;

// 2. Get service to retrieve buffer times
const service = await getServiceByIdentifier(db, businessId, serviceId);

// 3. Calculate effective occupied time (including buffers)
const effectiveStart = new Date(slotStart);
effectiveStart.setMinutes(effectiveStart.getMinutes() - (service.buffer_before_minutes || 0));

const effectiveEnd = new Date(slotEnd);
effectiveEnd.setMinutes(effectiveEnd.getMinutes() + (service.buffer_after_minutes || 0));

// 4. Generate off-time intervals
const offTimes = generateOffTimeIntervals(config, slotStart, slotEnd, config.business.timezone);

// 5. Validate availability
if (!isTimeAvailable(effectiveStart, effectiveEnd, offTimes)) {
  const intersecting = getIntersectingOffTimes(effectiveStart, effectiveEnd, offTimes);
  const reason = intersecting.length > 0 ? intersecting[0].reason : 'Time slot unavailable';

  return NextResponse.json({
    success: false,
    error: `Cannot schedule during ${reason.toLowerCase()}`,
    code: 'OFF_TIME_CONFLICT'
  }, { status: 400 });
}
```

**Files to modify**:
- `app/api/booking/reserve/route.ts` (lines 140-151)
- `app/api/appointments/manual/route.ts` (lines 160-182)
- `app/api/appointments/reschedule/route.ts` (lines 175-199)

---

### Priority 2: Business Hours and Advance Booking Validation

Create a reusable validation function:

```typescript
// src/lib/booking/validation.ts

import { TenantConfig } from '@/lib/config/tenant-schema';
import { generateOffTimeIntervals, isTimeAvailable, getIntersectingOffTimes } from './off-time-system';

export interface BookingValidationParams {
  config: TenantConfig;
  slotStart: Date;
  slotEnd: Date;
  bufferBefore: number;
  bufferAfter: number;
  skipAdvanceLimitCheck?: boolean; // For owner manual appointments
}

export interface BookingValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

export function validateBookingTime(params: BookingValidationParams): BookingValidationResult {
  const { config, slotStart, slotEnd, bufferBefore, bufferAfter, skipAdvanceLimitCheck } = params;

  const now = new Date();

  // 1. Check if in the past (with 5-minute grace period for clock differences)
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  if (slotStart < fiveMinutesAgo) {
    return {
      valid: false,
      error: 'Cannot schedule in the past',
      code: 'PAST_TIME'
    };
  }

  // 2. Check advance booking limits (unless skipped for owner appointments)
  if (!skipAdvanceLimitCheck) {
    const maxAdvanceDate = new Date(now);
    maxAdvanceDate.setDate(maxAdvanceDate.getDate() + config.bookingLimits.advanceBookingDays);

    if (slotStart > maxAdvanceDate) {
      return {
        valid: false,
        error: `Cannot book more than ${config.bookingLimits.advanceBookingDays} days in advance`,
        code: 'BEYOND_ADVANCE_BOOKING_LIMIT'
      };
    }

    const minAdvanceTime = new Date(now);
    minAdvanceTime.setMinutes(minAdvanceTime.getMinutes() + config.bookingLimits.minAdvanceBookingMinutes);

    if (slotStart < minAdvanceTime) {
      return {
        valid: false,
        error: `Must book at least ${config.bookingLimits.minAdvanceBookingMinutes} minutes in advance`,
        code: 'BELOW_MIN_ADVANCE_BOOKING'
      };
    }
  }

  // 3. Calculate effective time including buffers
  const effectiveStart = new Date(slotStart);
  effectiveStart.setMinutes(effectiveStart.getMinutes() - bufferBefore);

  const effectiveEnd = new Date(slotEnd);
  effectiveEnd.setMinutes(effectiveEnd.getMinutes() + bufferAfter);

  // 4. Generate off-time intervals (breaks, closed days, holidays, outside business hours)
  const offTimes = generateOffTimeIntervals(config, slotStart, slotEnd, config.business.timezone);

  // 5. Check against off-time
  if (!isTimeAvailable(effectiveStart, effectiveEnd, offTimes)) {
    const intersecting = getIntersectingOffTimes(effectiveStart, effectiveEnd, offTimes);
    const reason = intersecting.length > 0 ? intersecting[0].reason : 'Time unavailable';

    return {
      valid: false,
      error: `Cannot schedule during ${reason.toLowerCase()}`,
      code: 'OFF_TIME_CONFLICT'
    };
  }

  return { valid: true };
}
```

Then use in all API endpoints:

```typescript
// app/api/booking/reserve/route.ts
import { validateBookingTime } from '@/lib/booking/validation';

const validation = validateBookingTime({
  config,
  slotStart,
  slotEnd,
  bufferBefore: service.buffer_before_minutes || 0,
  bufferAfter: service.buffer_after_minutes || 0,
});

if (!validation.valid) {
  return NextResponse.json({
    success: false,
    error: validation.error,
    code: validation.code
  }, { status: 400 });
}
```

---

### Priority 3: Grain Alignment Enforcement

Add grain snapping to all API endpoints:

```typescript
// src/lib/booking/validation.ts

export function snapToGrain(time: Date): Date {
  const GRAIN_MINUTES = 5;
  const snapped = new Date(time);
  const minutes = snapped.getMinutes();
  const remainder = minutes % GRAIN_MINUTES;

  if (remainder === 0) {
    return snapped;
  }

  const adjustment = remainder >= GRAIN_MINUTES / 2
    ? GRAIN_MINUTES - remainder
    : -remainder;

  snapped.setMinutes(minutes + adjustment);
  snapped.setSeconds(0);
  snapped.setMilliseconds(0);

  return snapped;
}
```

Use in API endpoints:

```typescript
// Snap times to 5-minute grain before processing
const slotStart = snapToGrain(new Date(data.startTime));
const slotEnd = snapToGrain(new Date(slotStart.getTime() + service.duration_minutes * 60 * 1000));
```

---

## Testing Recommendations

### Unit Tests

1. **Off-time validation**:
   - Book during lunch break → should fail
   - Book during closed day → should fail
   - Book during holiday → should fail
   - Book that spans across break boundary → should fail

2. **Buffer time validation**:
   - Book service ending at break start → should succeed
   - Book service with buffer extending into break → should fail

3. **Business hours validation**:
   - Book outside availability slots → should fail
   - Book during split shift gap → should fail

4. **Advance booking limits**:
   - Book beyond advanceBookingDays → should fail
   - Book within minAdvanceBookingMinutes → should fail
   - Book at exact boundary → should succeed

5. **Grain alignment**:
   - Submit booking at 10:07 → should be snapped to 10:05 or 10:10
   - Verify snapping logic rounds correctly

### Integration Tests

1. **Consistency across entry points**:
   - Same booking request should be accepted/rejected consistently across:
     - Customer booking API
     - Owner manual appointment API
     - Owner reschedule API

2. **Concurrency tests**:
   - Multiple concurrent reservations during break → all should fail
   - Reservation + manual appointment at same time → only 1 should succeed

3. **End-to-end tests**:
   - UI shows slot unavailable (during break) → API rejects booking attempt
   - UI allows drag to valid slot → API accepts reschedule
   - UI prevents drag to break → API also rejects reschedule

---

## Implementation Checklist

### Phase 1: Critical Fixes (Week 1)
- [ ] Create `src/lib/booking/validation.ts` with `validateBookingTime()` function
- [ ] Add off-time validation to `/api/booking/reserve`
- [ ] Add off-time validation to `/api/appointments/manual`
- [ ] Add off-time validation to `/api/appointments/reschedule`
- [ ] Add buffer time retrieval from services table
- [ ] Write unit tests for off-time validation
- [ ] Write integration tests for consistency across APIs

### Phase 2: Business Logic Enforcement (Week 2)
- [ ] Add advance booking limit validation to customer APIs
- [ ] Add business hours validation to all APIs
- [ ] Add grain alignment to all APIs
- [ ] Update error messages for consistency
- [ ] Write unit tests for new validations
- [ ] Update API documentation

### Phase 3: Database Safety Net (Week 3)
- [ ] Add database trigger for off-time validation (optional but recommended)
- [ ] Add database trigger for business hours validation (optional)
- [ ] Add check constraint for grain alignment (5-minute multiples)
- [ ] Test trigger safety net with load tests
- [ ] Document multi-layer validation strategy

---

## Conclusion

**Current State**: Steps 7f1 and 7f2 are correctly implemented in slot generation and drag-and-drop validation, but are NOT consistently enforced across all API endpoints.

**Risk**: Malicious clients or accidental owner actions can bypass business rules and create invalid bookings.

**Solution**: Add comprehensive validation to all API endpoints using a centralized `validateBookingTime()` function that checks:
1. Off-time intervals (breaks, closed days, holidays)
2. Buffer times
3. Business hours
4. Advance booking limits
5. Grain alignment

**Impact**: After fixes, business rules will be enforced consistently across all entry points, preventing invalid bookings and ensuring data integrity.

**Timeline**: Critical fixes should be completed within 1-2 weeks. Full implementation with database safety nets within 3 weeks.
