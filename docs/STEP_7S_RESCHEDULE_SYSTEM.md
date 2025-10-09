# Step 7s: Unified Appointment Rescheduling System

**Status:** ✅ Complete
**Last Updated:** 2025-10-09
**Priority:** High

---

## Overview

This document describes the unified appointment rescheduling system that allows both authenticated customers (via customer dashboard) and guests (future: via booking management page) to reschedule their confirmed appointments. The system validates slot availability, prevents double-bookings, and notifies business owners of changes.

### Design Philosophy: Consistency & Reliability

**Core Principles:**
- Unified API for customer and guest rescheduling
- Real-time slot availability validation using existing slot-generator logic
- Atomic transaction handling to prevent race conditions
- Optimistic locking to detect concurrent modifications
- Comprehensive notification system (owner in-app + customer email)
- Clear error messages for validation failures

---

## Features Implemented

### 1. Unified Reschedule API Endpoint

**Endpoint:** `POST /api/customer/appointments/[id]/reschedule`

**Authentication:** JWT (Bearer token) for customers

**Purpose:** Reschedule a confirmed appointment to a new time slot with full validation.

**Request Body:**
```json
{
  "newSlotStart": "2025-10-16T10:00:00Z",
  "newSlotEnd": "2025-10-16T11:00:00Z"
}
```

**Validation Steps:**
1. Verify JWT and customer ownership
2. Check appointment status is `confirmed`
3. Validate new time is in the future
4. Validate service duration matches
5. Check slot availability using slot-generator
6. Verify new slot respects business hours, capacity, and booking limits
7. Optimistic locking check (updated_at timestamp)

**Atomic Operations:**
1. Update appointment start/end times
2. Create audit log entry
3. Send owner notification
4. Queue customer email

### 2. Customer Dashboard Reschedule UI

**Component:** `RescheduleModal.tsx`

**Features:**
- Date picker with min/max date constraints (today to +60 days)
- Real-time slot availability fetching
- Visual time slot selector
- Current appointment summary
- New appointment preview
- Loading and error states
- Confirmation before rescheduling

**UX Flow:**
1. Customer clicks "Reschedule" on appointment card
2. Modal opens with current appointment details
3. Customer selects new date
4. Available slots load for that date
5. Customer selects new time slot
6. Preview shows new appointment time
7. Customer confirms reschedule
8. Success message + dashboard refresh

### 3. Owner Notification System

**Service:** `OwnerNotificationService`

**Purpose:** Create in-app notifications for business owners when customers reschedule or cancel appointments.

**Notification Types:**
- `booking_rescheduled`: Customer rescheduled appointment
- `booking_canceled`: Customer canceled appointment
- `booking_created`: New booking made
- `no_show_marked`: Customer marked as no-show
- `appointment_completed`: Appointment marked complete

**Data Stored:**
- Business ID
- User ID (owner)
- Notification type
- Title and message
- Related appointment ID
- Read status (boolean)
- Timestamp

**Multi-Owner Support:**
- Queries `business_owners` junction table
- Creates notification for each owner of the business

### 4. Customer Email Notifications

**Service:** `NotificationService`

**Purpose:** Queue email (and optional SMS) notifications to customers for appointment changes.

**Notification Templates:**
- `appointment_rescheduled`: Rescheduled confirmation
- `appointment_cancelled`: Cancellation confirmation
- `appointment_confirmed`: New booking confirmation

**Queueing System:**
- Notifications saved to `notification_logs` table
- Status: `pending` → processed by background worker
- Includes retry logic and delivery tracking

---

## API Specification

### POST /api/customer/appointments/[id]/reschedule

**Purpose:** Reschedule a confirmed appointment to a new time slot.

**Authentication:** Bearer token (JWT)

**Request Body:**
```json
{
  "newSlotStart": "2025-10-16T10:00:00Z",
  "newSlotEnd": "2025-10-16T11:00:00Z"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Appointment rescheduled successfully",
  "appointment": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "bookingId": "RIVO-A3K-9F2-7Q1",
    "newSlotStart": "2025-10-16T10:00:00Z",
    "newSlotEnd": "2025-10-16T11:00:00Z"
  }
}
```

**Error Responses:**

**401 Unauthorized:**
```json
{
  "error": "Missing or invalid authorization header"
}
```

**403 Forbidden:**
```json
{
  "error": "You do not have permission to reschedule this appointment"
}
```

**400 Bad Request:**
```json
{
  "error": "Cannot reschedule appointment with status: canceled"
}
```

```json
{
  "error": "Cannot reschedule to a time in the past"
}
```

```json
{
  "error": "Duration mismatch. Expected 60 minutes, got 45 minutes"
}
```

```json
{
  "error": "Requested time slot is fully booked"
}
```

**404 Not Found:**
```json
{
  "error": "Appointment not found"
}
```

**409 Conflict:**
```json
{
  "error": "Appointment was modified by another operation. Please refresh and try again."
}
```

---

## Database Schema

### No New Tables Required

The system reuses existing tables:

**appointments:**
- `slot_start`, `slot_end`: Updated to new times
- `updated_at`: Used for optimistic locking

**audit_logs:**
- Action: `'rescheduled'`
- `old_state`: Contains previous start/end times
- `new_state`: Contains new start/end times
- `actor_id`: Customer user ID

**notifications:** (existing table)
- Stores in-app notifications for business owners
- Fields: `business_id`, `user_id`, `type`, `title`, `message`, `appointment_id`, `read`, `created_at`

**notification_logs:** (existing table)
- Queues customer email/SMS notifications
- Fields: `appointment_id`, `recipient_email`, `channel`, `template_name`, `status`, `attempts`

---

## Slot Availability Validation

### Integration with Slot Generator

The reschedule endpoint reuses the existing `generateTimeSlots()` function from `slot-generator.ts` to ensure consistency with the booking flow.

**Validation Process:**
1. Fetch existing appointments for the target day (excluding current appointment)
2. Fetch active reservations (not expired)
3. Generate all available slots for the target date using `generateTimeSlots()`
4. Find the requested slot in the generated list
5. Verify slot exists and `available: true`
6. If unavailable, return `reason` (e.g., "Fully booked", "Outside business hours")

**Benefits:**
- Same validation logic as initial booking
- Respects all business rules (hours, capacity, buffers, advance booking limits)
- Handles multi-hour appointments correctly
- Prevents double-bookings at 5-minute grain level

**Edge Cases Handled:**
- Service duration spanning multiple display slots
- Buffer times before/after service
- Max simultaneous bookings capacity
- Business closed days and exceptions
- Advance booking limits
- Minimum advance booking time

---

## Optimistic Locking

### Preventing Concurrent Modification Conflicts

The reschedule endpoint uses optimistic locking via the `updated_at` timestamp to detect if an appointment was modified by another operation (e.g., owner rescheduled from dashboard).

**Implementation:**
```sql
UPDATE appointments
SET
  slot_start = ${newSlotStart},
  slot_end = ${newSlotEnd},
  updated_at = NOW()
WHERE id = ${appointmentId}
  AND updated_at = ${appointment.updated_at}
RETURNING id
```

**Behavior:**
- If `RETURNING` returns 0 rows → someone else modified the appointment
- Return 409 Conflict error with message to refresh and retry
- Customer sees clear error and can reload to see current state

---

## Notification System Architecture

### Owner In-App Notifications

**Flow:**
1. Customer reschedules appointment
2. `OwnerNotificationService.notifyOwnerOfReschedule()` called
3. Query `business_owners` junction table for all owners
4. Create notification record for each owner
5. Owners see notification in dashboard (future: notification badge, list)

**Notification Message Format:**
```
Title: Appointment Rescheduled
Message: John Doe rescheduled booking RIVO-A3K-9F2-7Q1 from Oct 15 at 10:00 AM to Oct 16 at 2:00 PM
```

**Database Entry:**
```json
{
  "id": "uuid",
  "business_id": "uuid",
  "user_id": "owner-uuid",
  "type": "booking_rescheduled",
  "title": "Appointment Rescheduled",
  "message": "John Doe rescheduled booking RIVO-A3K-9F2-7Q1...",
  "appointment_id": "uuid",
  "read": false,
  "created_at": "2025-10-09T12:00:00Z"
}
```

### Customer Email Notifications

**Flow:**
1. Customer reschedules appointment
2. `NotificationService.queueRescheduleNotification()` called
3. Notification queued to `notification_logs` with status `pending`
4. Background worker processes queue (future: sends email via SendGrid/Resend)
5. Status updated to `sent` or `failed` with retry logic

**Email Contents (future implementation):**
- Subject: "Your appointment has been rescheduled"
- New appointment date/time
- Business name and contact info
- Service details
- Cancellation link
- .ics calendar attachment (future)

---

## User Flows

### Flow 1: Customer Reschedules Appointment

```
Customer navigates to /customer/dashboard
  → Sees list of upcoming appointments
  → Clicks "Reschedule" on an appointment
  → RescheduleModal opens
  → Current appointment details displayed
  → Customer selects new date from date picker
  → Available slots load for that date (API call to /api/booking/slots)
  → Customer clicks on a time slot
  → Preview shows new appointment time
  → Customer clicks "Confirm Reschedule"
  → POST /api/customer/appointments/[id]/reschedule
  → Validation checks (ownership, status, slot availability, optimistic lock)
  → If valid:
    → Update appointment times
    → Create audit log
    → Send owner notification
    → Queue customer email
    → Return success
  → Modal shows success message
  → Dashboard refreshes with updated appointment
```

### Flow 2: Validation Failure Scenarios

**Scenario A: Slot No Longer Available**
```
Customer selects slot at 2:00 PM
  → Another customer books same slot 1 second earlier
  → Customer clicks "Confirm Reschedule"
  → API validates slot availability
  → Slot is now fully booked
  → Return 400 error: "Requested time slot is fully booked"
  → Modal shows error message
  → Customer selects different slot
```

**Scenario B: Concurrent Modification**
```
Customer opens reschedule modal
  → Appointment updated_at: "2025-10-09T12:00:00Z"
  → Owner reschedules same appointment from dashboard
  → Appointment updated_at: "2025-10-09T12:01:00Z"
  → Customer submits reschedule
  → Optimistic lock check fails (updated_at mismatch)
  → Return 409 error: "Appointment was modified. Please refresh."
  → Customer refreshes dashboard and sees new time
```

### Flow 3: Owner Receives Notification

```
Customer reschedules appointment
  → API creates notification for all business owners
  → Owner dashboard (future) shows notification badge
  → Owner clicks notification center
  → Sees: "John Doe rescheduled booking RIVO-A3K-9F2-7Q1 from..."
  → Owner clicks notification
  → Navigates to appointment details or calendar view
  → Notification marked as read
```

---

## Frontend Implementation

### RescheduleModal Component

**File:** `app/customer/dashboard/components/RescheduleModal.tsx`

**Props:**
```typescript
interface RescheduleModalProps {
  appointmentId: string;
  bookingId: string;
  businessName: string;
  subdomain: string;
  serviceName: string;
  serviceId: string;
  currentStartTime: string;
  currentEndTime: string;
  duration: number;
  onClose: () => void;
  onSuccess: () => void;
}
```

**State Management:**
```typescript
const [selectedDate, setSelectedDate] = useState<string>('');
const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
const [loading, setLoading] = useState(false);
const [loadingSlots, setLoadingSlots] = useState(false);
const [error, setError] = useState<string | null>(null);
```

**Key Features:**
- Date picker with min/max constraints (today to +60 days)
- Automatically fetches slots when date changes
- Filters out unavailable slots
- Disables current time slot (shows "current" label)
- Displays slot capacity and availability
- Shows preview of new appointment before confirming
- Loading states for slot fetching and rescheduling
- Error handling with user-friendly messages
- Responsive grid layout for time slots

**UI Components:**
- Header with close button
- Current appointment summary (gray background)
- Date input (HTML5 date picker)
- Time slot grid (3-4 columns responsive)
- Selected slot preview (teal background)
- Footer with Cancel and Confirm buttons
- Modal backdrop with click-outside-to-close

### Customer Dashboard Integration

**File:** `app/customer/dashboard/page.tsx`

**Changes:**
1. Added `RescheduleModal` import
2. Added `reschedulingAppointment` state
3. Added `handleRescheduleAppointment()` function
4. Enabled "Reschedule" button (was disabled)
5. Conditionally render modal when `reschedulingAppointment` is set
6. Refresh appointments list on successful reschedule

**Reschedule Button:**
```tsx
<button
  onClick={() => handleRescheduleAppointment(appointment)}
  className="px-4 py-2 border border-teal-300 text-teal-700 rounded-lg hover:bg-teal-50 transition text-sm font-medium"
>
  Reschedule
</button>
```

---

## Backend Implementation

### Reschedule Endpoint

**File:** `app/api/customer/appointments/[id]/reschedule/route.ts`

**Key Logic Flow:**
1. Parse and validate request body
2. Verify JWT and customer ownership
3. Fetch appointment with business, service, and customer details
4. Validate appointment status, future time, duration match
5. Load tenant config and find service
6. Fetch existing appointments and reservations
7. Generate available slots using slot-generator
8. Validate requested slot is available
9. Check optimistic lock (updated_at)
10. Update appointment times atomically
11. Create audit log entry
12. Send owner notification (non-blocking)
13. Queue customer email (non-blocking)
14. Return success response

**Error Handling:**
- All validation errors return specific error messages
- Non-blocking notifications (failures logged, don't fail request)
- Optimistic locking prevents concurrent modification issues
- Comprehensive try-catch for unexpected errors

### Owner Notification Service

**File:** `src/lib/notifications/owner-notification-service.ts`

**Class:** `OwnerNotificationService`

**Methods:**
- `createNotification()`: Base method to create notification for all owners
- `notifyOwnerOfReschedule()`: Specific method for reschedule events
- `notifyOwnerOfCancellation()`: Specific method for cancellation events
- `notifyOwnerOfNewBooking()`: Specific method for new booking events

**Multi-Owner Support:**
```typescript
const owners = await this.db`
  SELECT user_id
  FROM business_owners
  WHERE business_id = ${businessId}
`;

for (const owner of owners) {
  // Create notification for each owner
}
```

### Customer Notification Service

**File:** `src/lib/notifications/notification-service.ts` (existing)

**Updated Methods:**
- `queueRescheduleNotification()`: Queue email/SMS for rescheduled appointment
- `queueCancellationNotification()`: Queue email/SMS for canceled appointment

**Queueing Logic:**
```typescript
await this.db`
  INSERT INTO notification_logs (
    id,
    appointment_id,
    recipient_email,
    channel,
    template_name,
    status,
    attempts,
    created_at
  ) VALUES (...)
`;
```

---

## Testing Checklist

### Manual Testing

**Prerequisites:**
- [ ] Customer account created and logged in
- [ ] Test appointments created (confirmed status)
- [ ] Business has available slots for next 7 days

**Reschedule Modal Tests:**
- [ ] Click "Reschedule" opens modal
- [ ] Current appointment details display correctly
- [ ] Date picker shows correct min/max dates (today to +60 days)
- [ ] Changing date fetches available slots
- [ ] Only available slots are shown
- [ ] Current time slot is disabled with "(current)" label
- [ ] Selecting slot shows preview
- [ ] Close button closes modal
- [ ] Click outside modal closes it

**Reschedule API Tests:**
- [ ] Reschedule to available slot succeeds
- [ ] Reschedule to same slot returns error
- [ ] Reschedule to past time returns 400 error
- [ ] Reschedule to fully booked slot returns 400 error
- [ ] Reschedule canceled appointment returns 400 error
- [ ] Reschedule without auth token returns 401 error
- [ ] Reschedule another customer's appointment returns 403 error
- [ ] Concurrent reschedule triggers optimistic lock (409 error)
- [ ] Appointment times updated correctly
- [ ] Audit log entry created with correct old/new state

**Notification Tests:**
- [ ] Owner notification created in `notifications` table
- [ ] Notification created for all owners (if multi-owner business)
- [ ] Notification title and message format correct
- [ ] Customer email queued to `notification_logs` table
- [ ] Notification status is `pending`

**UI/UX Tests:**
- [ ] Success message shown after reschedule
- [ ] Dashboard refreshes with updated appointment
- [ ] Updated appointment shows new date/time
- [ ] Error messages display correctly
- [ ] Loading states show during API calls
- [ ] Button disabled during reschedule operation

### Automated Testing (TODO)

```typescript
describe('Appointment Rescheduling API', () => {
  it('allows customer to reschedule to available slot', async () => {});
  it('validates slot availability before rescheduling', async () => {});
  it('rejects reschedule to past time', async () => {});
  it('rejects reschedule to fully booked slot', async () => {});
  it('prevents concurrent modifications with optimistic locking', async () => {});
  it('creates audit log entry with old and new times', async () => {});
  it('sends owner notification on reschedule', async () => {});
  it('queues customer email notification', async () => {});
  it('rejects reschedule of canceled appointment', async () => {});
  it('requires customer ownership to reschedule', async () => {});
});

describe('RescheduleModal Component', () => {
  it('displays current appointment details', () => {});
  it('fetches available slots when date changes', () => {});
  it('shows only available slots', () => {});
  it('disables current time slot', () => {});
  it('shows preview of new appointment', () => {});
  it('calls API on confirm', () => {});
  it('refreshes dashboard on success', () => {});
  it('displays error messages', () => {});
});

describe('Owner Notification Service', () => {
  it('creates notification for all business owners', async () => {});
  it('formats reschedule notification correctly', async () => {});
  it('formats cancellation notification correctly', async () => {});
  it('handles businesses with no owners gracefully', async () => {});
});
```

---

## Security Considerations

### Authentication & Authorization
- ✅ JWT-based authentication required
- ✅ Customer ownership verification
- ✅ Cannot reschedule other customers' appointments
- ✅ Cannot reschedule already-canceled appointments

### Data Integrity
- ✅ Optimistic locking prevents concurrent modifications
- ✅ Slot availability validated using same logic as booking
- ✅ Atomic update with audit trail
- ✅ Duration validation ensures no data tampering

### Input Validation
- ✅ Date format validation (ISO 8601)
- ✅ Future time check
- ✅ Duration mismatch detection
- ✅ Slot existence and availability check

### Error Handling
- ✅ Specific error messages for each failure mode
- ✅ Non-blocking notifications (failures logged, don't fail request)
- ✅ Try-catch for unexpected errors

---

## Performance Considerations

### API Performance
- Slot generation reuses existing optimized algorithm
- Single DB query for appointments (filtered by date range)
- Single DB query for reservations (filtered by date range)
- Optimistic locking avoids explicit transaction locks

### UI Performance
- Debounced slot fetching on date change (future improvement)
- Lazy loading of modal component
- Minimal re-renders with proper state management

### Scalability
- Notification creation is non-blocking
- Email queueing is asynchronous (processed by worker)
- Owner notifications scale with number of owners (typically 1-3)

---

## Future Enhancements

### Guest Reschedule Support (Step 7q Integration)
- [ ] Add guest token authentication to reschedule endpoint
- [ ] Create reschedule UI at `/book/manage/[booking_id]`
- [ ] Unified logic for both customer and guest reschedule

### Cancellation Policy Enforcement
- [ ] Add `cancellationPolicy` to tenant config (e.g., 24h notice)
- [ ] Validate reschedule against policy deadline
- [ ] Show deadline to customer in dashboard
- [ ] Block reschedule if past deadline

### Email Notification Implementation
- [ ] Implement email sending worker/cron job
- [ ] Create email templates for reschedule confirmation
- [ ] Include .ics calendar attachment
- [ ] Add unsubscribe link

### Calendar Integration
- [ ] Generate .ics file for rescheduled appointment
- [ ] Include in email notification
- [ ] Support Google Calendar sync
- [ ] Support Outlook sync

### Multi-Step Reschedule
- [ ] Allow changing service during reschedule
- [ ] Show price difference if service changed
- [ ] Support rescheduling recurring appointments (future feature)

### Real-Time Slot Updates
- [ ] WebSocket or SSE for real-time slot availability
- [ ] Auto-refresh slots when other customers book
- [ ] Show "Someone just booked this slot" warning

---

## Related Documentation

- **Step 7r:** Customer Dashboard with Booking Management (STEP_7R_CUSTOMER_DASHBOARD.md)
- **Step 7p:** Customer Authentication System (STEP_7P_CUSTOMER_AUTH_REVISED.md)
- **Step 7q:** Guest Booking Management (STEP_7Q_GUEST_BOOKING_MANAGEMENT.md)
- **Step 7f:** Flexible Service Duration and Time Slot Handling (STEP_7F_FLEXIBLE_DURATION.md)
- **Slot Generator:** Time Slot Generation Algorithm (src/lib/booking/slot-generator.ts)
- **Notification Service:** Notification System (src/lib/notifications/notification-service.ts)

---

## Acceptance Criteria

### Must Have (Completed)
- [x] Unified reschedule API endpoint created
- [x] Customer dashboard reschedule UI modal implemented
- [x] Slot availability validation using slot-generator
- [x] Optimistic locking to prevent concurrent modifications
- [x] Audit log entry created on reschedule
- [x] Owner in-app notification sent
- [x] Customer email notification queued
- [x] Error handling for all validation failures
- [x] Multi-owner support (notifications for all owners)
- [x] JWT authentication required
- [x] Customer ownership verification

### Should Have (Future Work)
- [ ] Guest reschedule support (via guest token)
- [ ] Cancellation/reschedule policy enforcement
- [ ] Email template implementation and sending
- [ ] .ics calendar attachment generation
- [ ] Owner dashboard notification center UI
- [ ] Real-time notification badge

### Nice to Have (Future)
- [ ] WebSocket for real-time slot updates
- [ ] Calendar integration (Google/Outlook)
- [ ] SMS notifications for reschedule
- [ ] Service change during reschedule
- [ ] Recurring appointment reschedule

---

## File Structure

```
app/
├── customer/
│   └── dashboard/
│       ├── page.tsx                          # Customer dashboard (UPDATED)
│       └── components/
│           └── RescheduleModal.tsx           # Reschedule modal (NEW)
└── api/
    └── customer/
        └── appointments/
            └── [id]/
                ├── cancel/
                │   └── route.ts              # Cancel endpoint (UPDATED with notifications)
                └── reschedule/
                    └── route.ts              # Reschedule endpoint (NEW)

src/
└── lib/
    ├── booking/
    │   └── slot-generator.ts                 # Slot generation (reused)
    └── notifications/
        ├── notification-service.ts           # Customer email notifications (existing)
        └── owner-notification-service.ts     # Owner in-app notifications (NEW)

docs/
└── STEP_7S_RESCHEDULE_SYSTEM.md             # This document (NEW)
```

---

## Deployment Notes

### Environment Variables
No new environment variables required. Uses existing:
- `DATABASE_URL`: NeonDB connection string
- `JWT_SECRET`: JWT signing secret

### Database Migrations
No new migrations required. Uses existing schema:
- `appointments` table (slot_start, slot_end, updated_at)
- `audit_logs` table
- `notifications` table
- `notification_logs` table
- `business_owners` junction table

### Testing in Production
1. Create customer account and log in
2. Create test appointment (confirmed status)
3. Navigate to customer dashboard
4. Click "Reschedule" on appointment
5. Select new date and time slot
6. Confirm reschedule
7. Verify appointment updated in dashboard
8. Check `audit_logs` table for reschedule entry
9. Check `notifications` table for owner notification
10. Check `notification_logs` table for customer email queue

---

**End of Document**
