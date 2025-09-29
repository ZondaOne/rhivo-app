# Booking Transaction & Concurrency System

This module implements the complete booking flow with robust concurrency controls to prevent double-bookings and ensure data consistency.

## Architecture

### 1. Reservation Phase
- Client creates a short-lived reservation (default 15min TTL)
- Atomic capacity checking at database level
- Idempotency keys prevent duplicate reservations on network retries
- Reservation holds a slot without committing

### 2. Commit Phase
- Client converts reservation to confirmed appointment
- Transaction validates reservation hasn't expired
- Automatic audit trail creation
- Reservation deleted to free slot

### 3. Concurrency Controls
- **Database-level capacity constraints**: Uses CTEs to atomically check and enforce `maxSimultaneousBookings`
- **Optimistic locking**: Version field on appointments detects concurrent modifications
- **Idempotency keys**: Same key returns existing reservation/appointment
- **TTL-based expiry**: Stale reservations automatically expire
- **Transaction isolation**: All critical operations wrapped in transactions

### 4. Cleanup
- Background cron job removes expired reservations
- Health monitoring alerts on system issues

## Usage Examples

### Customer Booking Flow

```typescript
import { ReservationManager, AppointmentManager } from '@/lib/booking';
import { getDbClient } from '@/db/client';
import { v4 as uuidv4 } from 'uuid';

const db = getDbClient();

// Step 1: Create reservation
const reservationManager = new ReservationManager(db);
const idempotencyKey = uuidv4(); // Client generates this

try {
  const reservation = await reservationManager.createReservation({
    businessId: 'biz-uuid',
    serviceId: 'service-uuid',
    slotStart: new Date('2025-01-15T10:00:00Z'),
    slotEnd: new Date('2025-01-15T11:00:00Z'),
    idempotencyKey,
    ttlMinutes: 15 // Optional, defaults to 15
  });

  console.log('Reservation created:', reservation.id);
  console.log('Expires at:', reservation.expires_at);

  // Step 2: Collect customer info (email/phone)
  // ... UI prompts for contact details ...

  // Step 3: Commit reservation to appointment
  const appointmentManager = new AppointmentManager(db);

  const appointment = await appointmentManager.commitReservation({
    reservationId: reservation.id,
    guestEmail: 'customer@example.com',
    guestPhone: '+1234567890',
    cancellationToken: uuidv4() // For guest cancellation
  });

  console.log('Appointment confirmed:', appointment.id);

} catch (error) {
  if (error.message.includes('no longer available')) {
    // Slot was taken by another user
    console.error('Time slot unavailable');
  }
}
```

### Manual Appointment Creation (Owner/Staff)

```typescript
const appointmentManager = new AppointmentManager(db);

const appointment = await appointmentManager.createManualAppointment({
  businessId: 'biz-uuid',
  serviceId: 'service-uuid',
  slotStart: new Date('2025-01-15T14:00:00Z'),
  slotEnd: new Date('2025-01-15T15:00:00Z'),
  customerId: 'customer-uuid', // Optional
  guestEmail: 'customer@example.com',
  idempotencyKey: uuidv4(),
  actorId: 'staff-user-uuid'
});
```

### Updating Appointment with Optimistic Locking

```typescript
const appointmentManager = new AppointmentManager(db);

try {
  const appointment = await appointmentManager.getAppointment('appt-uuid');

  const updated = await appointmentManager.updateAppointment({
    appointmentId: appointment.id,
    slotStart: new Date('2025-01-15T15:00:00Z'),
    slotEnd: new Date('2025-01-15T16:00:00Z'),
    actorId: 'staff-uuid',
    expectedVersion: appointment.version // Critical: must match current version
  });

  console.log('Updated to version:', updated.version);

} catch (error) {
  if (error.code === 'CONFLICT') {
    // Another user modified the appointment
    console.error('Conflict detected, current version:', error.currentVersion);
    // UI should reload and retry
  }
}
```

### Checking Available Capacity

```typescript
const reservationManager = new ReservationManager(db);

const available = await reservationManager.getAvailableCapacity(
  'biz-uuid',
  'service-uuid',
  new Date('2025-01-15T10:00:00Z'),
  new Date('2025-01-15T11:00:00Z')
);

console.log(`${available} slots available`);
```

## API Routes

### POST /api/booking/reserve
Create a reservation for a time slot.

**Request:**
```json
{
  "businessId": "uuid",
  "serviceId": "uuid",
  "slotStart": "2025-01-15T10:00:00Z",
  "slotEnd": "2025-01-15T11:00:00Z",
  "idempotencyKey": "client-generated-uuid",
  "ttlMinutes": 15
}
```

**Response (200):**
```json
{
  "success": true,
  "reservation": {
    "id": "uuid",
    "expiresAt": "2025-01-15T10:15:00Z",
    "slotStart": "2025-01-15T10:00:00Z",
    "slotEnd": "2025-01-15T11:00:00Z"
  }
}
```

**Response (409 - Slot Unavailable):**
```json
{
  "success": false,
  "error": "The selected time slot is no longer available"
}
```

### POST /api/booking/commit
Convert reservation to confirmed appointment.

**Request:**
```json
{
  "reservationId": "uuid",
  "guestEmail": "customer@example.com",
  "guestPhone": "+1234567890"
}
```

**Response (200):**
```json
{
  "success": true,
  "appointment": {
    "id": "uuid",
    "businessId": "uuid",
    "serviceId": "uuid",
    "slotStart": "2025-01-15T10:00:00Z",
    "slotEnd": "2025-01-15T11:00:00Z",
    "status": "confirmed",
    "cancellationToken": "uuid"
  }
}
```

### GET /api/booking/capacity
Check available capacity for a time slot.

**Query Parameters:**
- `businessId`: Business UUID
- `serviceId`: Service UUID
- `slotStart`: ISO 8601 datetime
- `slotEnd`: ISO 8601 datetime

**Response (200):**
```json
{
  "success": true,
  "available": 3,
  "slotStart": "2025-01-15T10:00:00Z",
  "slotEnd": "2025-01-15T11:00:00Z"
}
```

## Background Jobs

### Cleanup Cron Job
Configure in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/cleanup-reservations",
    "schedule": "*/5 * * * *"
  }]
}
```

Or call manually:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://your-app.vercel.app/api/cron/cleanup-reservations
```

## Concurrency Test Scenarios

### Test 1: Concurrent Reservations
Simulate 100 clients attempting to book the same slot simultaneously:
```typescript
const promises = Array.from({ length: 100 }, (_, i) =>
  reservationManager.createReservation({
    businessId,
    serviceId,
    slotStart,
    slotEnd,
    idempotencyKey: `test-${i}` // Unique keys
  })
);

const results = await Promise.allSettled(promises);
const successful = results.filter(r => r.status === 'fulfilled').length;

// Should equal maxSimultaneousBookings
console.assert(
  successful === maxSimultaneousBookings,
  'Overbooking detected!'
);
```

### Test 2: Idempotency
Same idempotency key should return same reservation:
```typescript
const key = uuidv4();

const res1 = await reservationManager.createReservation({ /* ... */ idempotencyKey: key });
const res2 = await reservationManager.createReservation({ /* ... */ idempotencyKey: key });

console.assert(res1.id === res2.id, 'Idempotency failed!');
```

### Test 3: Optimistic Locking
Concurrent updates should detect conflicts:
```typescript
const appt = await appointmentManager.getAppointment(id);

// Two users try to update simultaneously
const update1 = appointmentManager.updateAppointment({
  appointmentId: id,
  status: 'completed',
  expectedVersion: appt.version,
  actorId: 'user1'
});

const update2 = appointmentManager.updateAppointment({
  appointmentId: id,
  status: 'canceled',
  expectedVersion: appt.version,
  actorId: 'user2'
});

const results = await Promise.allSettled([update1, update2]);

// One should succeed, one should fail with CONFLICT
const conflicts = results.filter(r =>
  r.status === 'rejected' && r.reason.code === 'CONFLICT'
);
console.assert(conflicts.length === 1, 'Conflict detection failed!');
```

### Test 4: Reservation Expiry
Expired reservations should be rejected:
```typescript
const reservation = await reservationManager.createReservation({
  /* ... */
  ttlMinutes: 0.1 // 6 seconds
});

// Wait for expiry
await new Promise(resolve => setTimeout(resolve, 7000));

// Should fail
await expect(
  appointmentManager.commitReservation({ reservationId: reservation.id, /* ... */ })
).rejects.toThrow('expired');
```

## Error Handling

### Reservation Errors
- `"The selected time slot is no longer available"` - Slot at capacity
- `"Reservation not found or expired"` - TTL expired before commit

### Appointment Errors
- `"Appointment has been modified by another user"` - Optimistic lock conflict
- `"No available capacity for the new time slot"` - Reschedule target is full

### Recovery Strategies
1. **Slot Unavailable**: Show user next available slots
2. **Reservation Expired**: Restart booking flow with new reservation
3. **Update Conflict**: Reload current state and prompt user to retry
4. **Idempotency**: Safe to retry on network failure - same key returns same result

## Database Schema Requirements

Ensure these tables exist (created by migrations):

```sql
CREATE TABLE reservations (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL,
  service_id UUID NOT NULL,
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reservations_expiry ON reservations(expires_at);
CREATE INDEX idx_reservations_slot ON reservations(business_id, service_id, slot_start, slot_end);

CREATE TABLE appointments (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL,
  service_id UUID NOT NULL,
  customer_id UUID,
  guest_email VARCHAR(255),
  guest_phone VARCHAR(50),
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  reservation_id UUID,
  cancellation_token UUID,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_appointments_slot ON appointments(business_id, service_id, slot_start, slot_end)
  WHERE deleted_at IS NULL AND status = 'confirmed';
```

## Performance Considerations

- **Indexes**: Critical for slot overlap queries
- **Cleanup frequency**: Run every 1-5 minutes to prevent table bloat
- **TTL duration**: Balance between user experience (longer) and slot availability (shorter)
- **Connection pooling**: Use Neon's connection pooling for high concurrency