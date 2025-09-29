# Step 4 Implementation: Booking Transaction & Concurrency Design

## Overview

Implemented a complete booking system with robust concurrency controls to prevent double-bookings and ensure data consistency under high load.

## Components Implemented

### 1. Core Managers

#### `src/lib/booking/reservation-manager.ts`
- **Purpose**: Manages short-lived reservations with TTL (default 15 minutes)
- **Key Features**:
  - Atomic capacity checking using database CTEs
  - Idempotency key support for safe retries
  - Reservation validation and extension
  - Available capacity calculation

**Key Methods**:
- `createReservation()` - Creates reservation with atomic capacity check
- `validateReservation()` - Checks if reservation is still valid
- `getAvailableCapacity()` - Returns available slots for a time window
- `cleanupExpiredReservations()` - Background cleanup job

#### `src/lib/booking/appointment-manager.ts`
- **Purpose**: Manages confirmed appointments with optimistic locking
- **Key Features**:
  - Transactional commit from reservation to appointment
  - Manual appointment creation (for owner/staff)
  - Optimistic locking using version field
  - Automatic audit trail generation

**Key Methods**:
- `commitReservation()` - Converts reservation to confirmed appointment
- `createManualAppointment()` - Direct appointment creation (bypasses reservation)
- `updateAppointment()` - Update with optimistic lock check
- `cancelAppointment()` - Soft delete with audit trail

### 2. Concurrency Controls

#### Database-Level Constraints
```sql
-- Atomic capacity checking via CTE
WITH service_capacity AS (...)
INSERT INTO reservations (...)
WHERE overlapping_count.count < service_capacity.max_simultaneous_bookings
```

#### Optimistic Locking
- Version field on appointments incremented on each update
- Update fails if version doesn't match expected value
- Returns `CONFLICT` error with current version

#### Idempotency
- Same idempotency key returns existing reservation/appointment
- Prevents duplicate bookings on network retries
- Unique constraint on `idempotency_key` field

#### TTL-Based Expiry
- Reservations automatically expire after configured TTL
- Background cleanup job removes expired reservations
- Expired reservations cannot be committed

### 3. API Routes

#### `POST /api/booking/reserve`
Create a reservation for a time slot.

**Request:**
```json
{
  "businessId": "business-id",
  "serviceId": "service-id",
  "slotStart": "2025-01-15T10:00:00Z",
  "slotEnd": "2025-01-15T11:00:00Z",
  "idempotencyKey": "client-generated-key",
  "ttlMinutes": 15
}
```

**Response:** Reservation ID and expiry time

#### `POST /api/booking/commit`
Convert reservation to confirmed appointment.

**Request:**
```json
{
  "reservationId": "reservation-id",
  "guestEmail": "customer@example.com",
  "guestPhone": "+1234567890"
}
```

**Response:** Confirmed appointment with cancellation token

#### `GET /api/booking/capacity`
Check available capacity for a time slot.

**Query Params:** businessId, serviceId, slotStart, slotEnd

**Response:** Number of available slots

#### `GET /api/cron/cleanup-reservations`
Background job to cleanup expired reservations.

**Authentication:** Bearer token via `CRON_SECRET` env var

### 4. Background Jobs

#### `src/lib/booking/reservation-cleanup.ts`
- `cleanupExpiredReservations()` - Removes expired reservations
- `getReservationMetrics()` - System health metrics
- `checkReservationHealth()` - Alert on issues (e.g., cleanup not running)

**Cron Configuration** (vercel.json):
```json
{
  "crons": [{
    "path": "/api/cron/cleanup-reservations",
    "schedule": "*/5 * * * *"
  }]
}
```

### 5. Testing

#### `src/lib/booking/__tests__/concurrency.test.ts`
Comprehensive concurrency tests:
- Prevents overbooking under concurrent load
- Idempotency validation
- Optimistic locking conflict detection
- Reservation expiry handling
- Capacity calculation accuracy

## Transactional Flows

### Customer Booking Flow
```
1. Client creates reservation (15min hold)
   └─> Atomic capacity check at DB level

2. UI prompts for contact details

3. Client commits reservation
   └─> Transaction:
       - Validate reservation not expired
       - Create confirmed appointment
       - Generate audit log
       - Delete reservation (free slot)
```

### Concurrent Booking Scenario
```
Slot capacity: 2
Concurrent requests: 10

Database CTE ensures:
- COUNT(existing_bookings + reservations) < max_capacity
- Only 2 reservations succeed
- Remaining 8 fail with "slot unavailable"
```

### Update with Optimistic Locking
```
User A reads appointment (version: 5)
User B reads appointment (version: 5)

User A updates (expected_version: 5)
└─> Success! Version incremented to 6

User B updates (expected_version: 5)
└─> CONFLICT! Current version is 6
└─> Client reloads and retries
```

## Error Handling

### Reservation Errors
- `"The selected time slot is no longer available"` - Capacity exhausted
- `"Reservation not found or expired"` - TTL expired before commit

### Appointment Errors
- `CONFLICT` error - Optimistic lock failure
- `"No available capacity for the new time slot"` - Reschedule target full

### Recovery Strategies
1. **Slot Unavailable**: Show next available slots
2. **Reservation Expired**: Restart with new reservation
3. **Update Conflict**: Reload and prompt retry
4. **Network Failure**: Safe to retry with same idempotency key

## Database Schema Requirements

Tables used:
- `reservations` - Short-lived slot holds
- `appointments` - Confirmed bookings
- `services` - Service config including `max_simultaneous_bookings`
- `audit_logs` - Change tracking

Key indexes:
- `idx_reservations_expiry` on `expires_at`
- `idx_reservations_slot` on `(business_id, service_id, slot_start, slot_end)`
- `idx_appointments_slot` on confirmed appointments

Unique constraints:
- `reservations.idempotency_key`
- `appointments.idempotency_key`

## Performance Considerations

1. **Indexes**: Critical for overlap queries - ensure proper indexing on slot times
2. **Cleanup Frequency**: Run every 1-5 minutes to prevent reservation table bloat
3. **TTL Duration**: Balance user experience (longer) vs slot availability (shorter)
4. **Connection Pooling**: Use Neon's pooling for high concurrency
5. **CTE Optimization**: Single query does capacity check + insert atomically

## Acceptance Criteria Met

✅ **Transactional Flow**: Reservation → Commit → Confirm lifecycle implemented
✅ **TTL Management**: 15-minute default, configurable, automatic expiry
✅ **Idempotency**: Same key returns same reservation/appointment
✅ **Failure Handling**: All error cases surfaced with clear messages
✅ **DB Constraints**: Capacity enforcement at database level
✅ **Conflict Resolution**: Optimistic locking detects concurrent modifications
✅ **Test Plan**: Concurrency scenarios covered in test suite

## No Overbooking Guarantee

The system prevents overbooking through multiple layers:

1. **Database-level capacity constraint**: CTE atomically checks count before insert
2. **Transaction isolation**: All critical operations in transactions
3. **Unique constraints**: Prevent duplicate bookings
4. **Optimistic locking**: Detects concurrent appointment modifications
5. **Reservation expiry**: Stale holds don't block slots indefinitely

## Next Steps

To deploy this implementation:

1. Run database migrations to ensure schema is up-to-date
2. Configure `CRON_SECRET` environment variable
3. Set up cron job for reservation cleanup
4. Run concurrency tests to validate no overbooking
5. Monitor reservation metrics via health check endpoint

## Documentation

Complete usage documentation and examples in:
- `src/lib/booking/README.md` - Comprehensive guide with examples
- `src/lib/booking/__tests__/concurrency.test.ts` - Test scenarios