# Timezone Handling in Rhivo Booking System

## Overview

The Rhivo booking system is designed to handle appointments correctly regardless of where the server, business, or customer are located. This document explains the timezone handling strategy and best practices.

## Core Principles

### 1. **Database Storage: Always UTC**
- All timestamps in the database are stored in UTC using PostgreSQL's `timestamptz` type
- This ensures portability and avoids ambiguity
- Example: `slot_start TIMESTAMPTZ NOT NULL`

### 2. **Business Timezone is Source of Truth**
- Every business has a `timezone` field in their YAML config (IANA timezone format: `Europe/Rome`, `America/New_York`)
- Business hours and availability are defined in the business's local timezone
- Slot generation uses the business's timezone for day boundaries

### 3. **API Communication: ISO 8601 with Timezone**
- All API requests and responses use ISO 8601 format with timezone information
- Example: `2025-01-15T14:30:00+01:00` or `2025-01-15T13:30:00Z`
- Never send bare date strings without timezone context for datetime values

### 4. **Frontend Display: Business Timezone**
- The booking page displays all times in the business's timezone
- Appointment confirmations show times in the business's timezone with the timezone abbreviation
- Example: "Monday, January 15, 2025, 2:30 PM - 4:00 PM CET"

## Implementation Details

### Slot Generation

**Problem:** A business in Rome (GMT+1) defines hours as 09:00-18:00. The server is in UTC. When generating slots for "2025-01-15", should we use midnight UTC or midnight Rome time?

**Solution:**
```typescript
import { parseInTimezone, getEndOfDay } from '@/lib/utils/timezone';

const businessTimezone = config.business.timezone; // 'Europe/Rome'
const start = parseInTimezone('2025-01-15', businessTimezone);
// Result: 2025-01-15T00:00:00+01:00 (midnight Rome time) = 2025-01-14T23:00:00Z
const end = getEndOfDay(new Date('2025-01-15'), businessTimezone);
// Result: 2025-01-15T23:59:59+01:00 (Rome time) = 2025-01-15T22:59:59Z
```

This ensures that:
- The business's "09:00" opening time on Jan 15 Rome time is correctly interpreted
- Slots are generated within the correct 24-hour window in the business's timezone
- Day boundaries align with the business's local calendar

### Booking Flow

#### 1. **Customer Selects Date**
Frontend sends: `GET /api/booking/slots?startDate=2025-01-15`

Backend:
```typescript
const businessTimezone = config.business.timezone;
const start = parseInTimezone('2025-01-15', businessTimezone);
// Generate slots for Jan 15 in the business's timezone
```

#### 2. **Customer Selects Time Slot**
Frontend receives slot: `{ start: '2025-01-15T14:30:00+01:00', end: '2025-01-15T15:30:00+01:00' }`

Frontend displays: "2:30 PM" (formatted in business timezone)

#### 3. **Customer Confirms Booking**
Frontend sends: `POST /api/booking/reserve` with `startTime: '2025-01-15T14:30:00+01:00'`

Backend:
```typescript
const slotStart = new Date(data.startTime); // Correctly parses with timezone
// slotStart is now a Date object representing the exact UTC moment
// Database stores: 2025-01-15T13:30:00Z (UTC)
```

#### 4. **Appointment Confirmation**
Backend sends email: "Your appointment is on Monday, January 15, 2025 at 2:30 PM CET"

### Display in Dashboard

When the business owner views appointments in their dashboard:
```typescript
import { formatInTimezone, formatDateRange } from '@/lib/utils/timezone';

const appointmentStart = new Date(appointment.slot_start); // UTC from DB
const appointmentEnd = new Date(appointment.slot_end);
const businessTimezone = business.timezone;

const displayTime = formatDateRange(
  appointmentStart,
  appointmentEnd,
  businessTimezone
);
// Output: "Monday, January 15, 2025, 2:30 PM - 3:30 PM CET"
```

## Common Scenarios

### Scenario 1: Italian Business, Italian Customer
- Business: Rome (GMT+1)
- Customer: Milan (GMT+1)
- Server: AWS US-East (GMT-5)

Flow:
1. Customer requests slots for "2025-01-15"
2. Server interprets as Jan 15 Rome time (midnight = 2025-01-14T23:00:00Z)
3. Server generates slots: 09:00 Rome = 08:00 UTC
4. Customer sees 09:00 AM (their local time matches business)
5. Booking stored in DB: 08:00 UTC
6. Confirmation: "9:00 AM CET"

### Scenario 2: Italian Business, US Customer
- Business: Rome (GMT+1)
- Customer: New York (GMT-5)
- Server: AWS US-East (GMT-5)

Flow:
1. Customer requests slots for "2025-01-15"
2. Server interprets as Jan 15 Rome time
3. Customer's browser receives ISO times with Rome timezone
4. Customer sees times displayed in Rome timezone (by design - they're booking at a Rome business)
5. Booking confirmation clearly shows "9:00 AM CET" to avoid confusion

**Best Practice:** Show timezone abbreviation in booking confirmation to make it crystal clear.

### Scenario 3: Daylight Saving Time Transition
- Business: Rome
- Date: March 31, 2025 (DST starts in Europe)

At 2:00 AM on March 31, clocks jump to 3:00 AM.

Flow:
1. Booking made for "March 31, 2025, 2:30 AM" would be invalid (time doesn't exist)
2. Our timezone utilities handle this by using the IANA database
3. The `parseInTimezone` function accounts for DST transitions
4. Slots are never generated for the "missing" hour

## Testing Checklist

- [ ] **Basic Timezone Conversion**
  ```bash
  # Test booking in different timezones
  curl "/api/booking/slots?subdomain=test&serviceId=service1&startDate=2025-01-15"
  ```
  Verify: Slots align with business hours in business's timezone

- [ ] **Cross-Timezone Booking**
  - Set server timezone to UTC
  - Set business timezone to Europe/Rome
  - Create booking from US customer's perspective
  - Verify: Appointment stored with correct UTC time

- [ ] **Day Boundary Test**
  - Business hours: 08:00-20:00 Rome time
  - Request slots for Jan 15
  - Verify: Slots start at 08:00 Rome time (07:00 UTC), not 08:00 UTC

- [ ] **DST Transition**
  - Test bookings on DST transition dates
  - Verify: No slots generated for non-existent times
  - Verify: Correct offset used before/after transition

- [ ] **Display Consistency**
  - Create appointment
  - View in owner dashboard
  - View in customer dashboard
  - View in confirmation email
  - Verify: All show same time in business timezone with TZ abbreviation

## Troubleshooting

### Issue: Appointments appearing at wrong time in dashboard

**Cause:** Dashboard may be using server timezone instead of business timezone for display

**Fix:**
```typescript
// BAD - uses server timezone
new Date(appointment.slot_start).toLocaleString()

// GOOD - uses business timezone
formatInTimezone(new Date(appointment.slot_start), business.timezone, {
  hour: 'numeric',
  minute: '2-digit'
})
```

### Issue: Slots generated for wrong day

**Cause:** Date parsing without timezone context

**Fix:**
```typescript
// BAD - interprets in server timezone
new Date('2025-01-15T00:00:00')

// GOOD - interprets in business timezone
parseInTimezone('2025-01-15', config.business.timezone)
```

### Issue: Off-by-one-hour errors

**Cause:** DST transition or incorrect timezone offset

**Fix:**
- Always use IANA timezone database (via `Intl` API)
- Never hardcode timezone offsets
- Let the browser/Node.js handle DST transitions

## Utility Functions Reference

### `parseInTimezone(dateString, timezone)`
Parses a date string in a specific timezone context.

```typescript
parseInTimezone('2025-01-15', 'Europe/Rome')
// Returns: Date object representing midnight Rome time
```

### `formatInTimezone(date, timezone, options)`
Formats a Date object in a specific timezone.

```typescript
formatInTimezone(new Date(), 'Europe/Rome', {
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short'
})
// Returns: "2:30 PM CET"
```

### `getStartOfDay(date, timezone)`
Gets midnight on a specific date in a timezone.

### `getEndOfDay(date, timezone)`
Gets 23:59:59.999 on a specific date in a timezone.

### `formatDateRange(start, end, timezone)`
Formats a date range with proper timezone handling.

```typescript
formatDateRange(start, end, 'Europe/Rome')
// Returns: "Monday, January 15, 2025, 2:30 PM - 4:00 PM CET"
```

### `getDayNameInTimezone(date, timezone)`
Gets the day of week name in a specific timezone.

```typescript
getDayNameInTimezone(new Date('2025-01-15T23:00:00Z'), 'Europe/Rome')
// Returns: 'thursday' (even though it's Wednesday 11PM UTC)
```

## Migration Guide

If you have existing code that doesn't handle timezones correctly:

### Step 1: Identify Date Parsing
Look for:
```typescript
new Date('2025-01-15')
new Date(dateString + 'T00:00:00')
```

Replace with:
```typescript
parseInTimezone('2025-01-15', businessTimezone)
```

### Step 2: Identify Date Display
Look for:
```typescript
date.toLocaleString()
date.toLocaleDateString()
```

Replace with:
```typescript
formatInTimezone(date, businessTimezone, options)
```

### Step 3: Update API Calls
Ensure all API calls pass ISO 8601 strings with timezone info:
```typescript
// GOOD
{ startTime: '2025-01-15T14:30:00+01:00' }

// BAD
{ startTime: '2025-01-15 14:30:00' }
```

## Best Practices

1. **Never use server's local timezone** - Always explicit timezone
2. **Always show timezone in user-facing displays** - Include abbreviation (CET, EST, etc.)
3. **Use ISO 8601 for API communication** - Includes timezone offset
4. **Store UTC in database** - Use `timestamptz` type
5. **Test with multiple timezones** - Don't assume server and business match
6. **Handle DST transitions** - Use IANA timezone database
7. **Document timezone assumptions** - Comment in code where timezone matters

## Resources

- [IANA Time Zone Database](https://www.iana.org/time-zones)
- [ISO 8601 Standard](https://en.wikipedia.org/wiki/ISO_8601)
- [MDN: Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
- [Moment Timezone (for complex cases)](https://momentjs.com/timezone/)

## Summary

The key to correct timezone handling is:
1. **Store in UTC** (database)
2. **Communicate with full timezone info** (API)
3. **Display in business timezone** (UI)
4. **Never assume timezones match** (server vs business vs customer)

When in doubt, always specify the timezone explicitly and test with businesses in different timezones than your development environment.
