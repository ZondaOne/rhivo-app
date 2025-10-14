# Step 7t: Business Owner Notification Center

**Status:** ✅ Complete
**Last Updated:** 2025-10-09
**Priority:** High

---

## Overview

The Business Owner Notification Center provides real-time in-app notifications to business owners about booking events (new bookings, cancellations, reschedules). This keeps owners informed of all customer actions without requiring email or SMS notifications.

### Design Philosophy: Real-Time Awareness

**Core Principles:**
- Real-time in-app notifications for all booking events
- Unread badge indicator for immediate visibility
- Multi-owner support (notifications for all business owners)
- Non-blocking notification delivery (failures don't affect booking operations)
- Clean, minimal UI integrated into the dashboard sidebar
- Automatic polling for updates (30-second intervals)

---

## Features Implemented

### 1. Database Schema

**Table:** `notifications`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `business_id` | UUID | Related business |
| `user_id` | UUID | Owner receiving notification |
| `type` | notification_type | Event type enum |
| `title` | TEXT | Notification title |
| `message` | TEXT | Notification message |
| `appointment_id` | UUID | Related appointment (nullable) |
| `read` | BOOLEAN | Read status (default: false) |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

**Notification Types (Enum):**
- `booking_created` - New booking made
- `booking_canceled` - Booking canceled by customer
- `booking_rescheduled` - Booking rescheduled by customer
- `no_show_marked` - Customer marked as no-show
- `appointment_completed` - Appointment marked complete

**Indexes:**
- `notifications_user_id_idx` - User's notifications
- `notifications_business_id_idx` - Business notifications
- `notifications_read_created_idx` - Read status + created date
- `notifications_user_unread_idx` - Unread notifications per user
- `notifications_appointment_id_idx` - Appointment-specific notifications

### 2. API Endpoints

#### GET /api/owner/notifications

Fetch notifications for authenticated owner.

**Query Parameters:**
- `limit` (number, default: 50) - Max notifications to return
- `offset` (number, default: 0) - Pagination offset
- `unread` (boolean) - Filter unread only

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "business_id": "uuid",
      "user_id": "uuid",
      "type": "booking_created",
      "title": "New Booking",
      "message": "John Doe booked Swedish Massage for Oct 15 at 10:00 AM (RIVO-ABC-123)",
      "appointment_id": "uuid",
      "read": false,
      "created_at": "2025-10-09T10:00:00Z",
      "business_name": "Wellness Spa",
      "business_subdomain": "wellness-spa"
    }
  ],
  "unreadCount": 5,
  "total": 20
}
```

#### PATCH /api/owner/notifications/[id]/read

Mark a single notification as read.

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

#### POST /api/owner/notifications/mark-all-read

Mark all unread notifications as read for the authenticated user.

**Response:**
```json
{
  "success": true,
  "message": "Marked 5 notification(s) as read",
  "count": 5
}
```

#### DELETE /api/owner/notifications/[id]

Delete a notification.

**Response:**
```json
{
  "success": true,
  "message": "Notification deleted"
}
```

### 3. Notification Center UI Component

**Location:** `src/components/dashboard/NotificationCenter.tsx`

**Features:**
- Bell icon in dashboard sidebar with unread count badge
- Dropdown panel with notification list (max height with scroll)
- Color-coded icons for different notification types
- Relative time display (e.g., "5m ago", "2h ago", "3d ago")
- Click notification to mark as read (auto-mark)
- Delete button on each notification
- "Mark all as read" button in header
- Empty state with icon and message
- Loading state with spinner
- Auto-refresh every 30 seconds
- Click outside to close dropdown

**Notification Type Icons:**
- **New Booking:** Teal background, plus icon
- **Cancellation:** Red background, X icon
- **Rescheduled:** Blue background, calendar icon
- **No Show:** Orange background, warning icon
- **Completed:** Green background, check icon

**UX Details:**
- Unread notifications have teal background tint
- Unread indicator dot (teal circle) on right side
- Badge shows "9+" for 10+ unread notifications
- Smooth transitions and hover effects
- Responsive design (adapts to narrow sidebar)

### 4. Owner Notification Service

**Location:** `src/lib/notifications/owner-notification-service.ts`

**Class:** `OwnerNotificationService`

**Methods:**

##### `createNotification(params)`
Base method to create notifications for all owners of a business.

**Parameters:**
```typescript
{
  businessId: string;
  appointmentId: string;
  type: OwnerNotificationType;
  title: string;
  message: string;
}
```

**Behavior:**
- Queries `business_owners` junction table for all owners
- Creates notification record for each owner
- Supports multi-owner businesses

##### `notifyOwnerOfNewBooking()`
Creates notification when customer makes a new booking.

**Message Format:**
```
Title: New Booking
Message: John Doe booked Swedish Massage for Oct 15 at 10:00 AM (RIVO-ABC-123)
```

##### `notifyOwnerOfCancellation()`
Creates notification when customer cancels appointment.

**Message Format:**
```
Title: Appointment Canceled
Message: John Doe canceled booking RIVO-ABC-123 scheduled for Oct 15 at 10:00 AM
```

##### `notifyOwnerOfReschedule()`
Creates notification when customer reschedules appointment.

**Message Format:**
```
Title: Appointment Rescheduled
Message: John Doe rescheduled booking RIVO-ABC-123 from Oct 15 at 10:00 AM to Oct 16 at 2:00 PM
```

### 5. Integration with Booking Events

Notifications are triggered at the following points:

**New Booking:**
- `POST /api/booking/commit` - After successful appointment creation
- Fetches service name from database
- Uses customer name or defaults to "A customer" for guests

**Cancellation:**
- `POST /api/customer/appointments/[id]/cancel` - Customer dashboard cancellation
- `POST /api/booking/guest-appointment/[booking_id]/cancel` - Guest cancellation
- Uses customer name from appointment record

**Rescheduling:**
- `POST /api/customer/appointments/[id]/reschedule` - Customer dashboard reschedule
- Includes old and new appointment times in message

**Error Handling:**
- All notification calls are wrapped in try-catch blocks
- Notification failures are logged but don't fail the parent operation
- This ensures booking operations always succeed even if notifications fail

---

## User Flows

### Flow 1: Owner Sees New Booking Notification

```
Customer books appointment
  → POST /api/booking/commit succeeds
  → Notification created for all business owners
  → Owner dashboard shows unread badge (1)
  → Owner clicks bell icon
  → Dropdown opens with notification list
  → Sees "New Booking: John Doe booked Swedish Massage..."
  → Notification has teal background (unread)
  → Owner clicks notification
  → Notification marked as read automatically
  → Background changes to white
  → Badge count decrements (0)
  → TODO: Navigate to appointment in calendar (future enhancement)
```

### Flow 2: Owner Marks All as Read

```
Owner has 5 unread notifications
  → Badge shows "5"
  → Owner clicks bell icon
  → Dropdown opens
  → Owner clicks "Mark all read" button
  → POST /api/owner/notifications/mark-all-read
  → All 5 notifications marked as read
  → Badge disappears
  → All notification backgrounds change to white
  → Unread dots removed
```

### Flow 3: Owner Deletes Notification

```
Owner opens notification center
  → Sees list of notifications
  → Hovers over notification
  → Delete button (X) appears on right
  → Owner clicks delete button
  → DELETE /api/owner/notifications/[id]
  → Notification removed from list
  → If it was unread, badge count decrements
```

### Flow 4: Multi-Owner Business

```
Business has 2 owners: Alice and Bob
  → Customer books appointment
  → OwnerNotificationService queries business_owners table
  → Finds both Alice and Bob as owners
  → Creates notification for Alice (user_id: alice-uuid)
  → Creates notification for Bob (user_id: bob-uuid)
  → Alice logs in to dashboard → sees badge "1"
  → Bob logs in to dashboard → sees badge "1"
  → Alice marks as read → Alice's badge disappears
  → Bob's badge still shows "1" (independent state)
```

---

## Security Considerations

### Authentication & Authorization
- ✅ JWT-based authentication required for all endpoints
- ✅ Owner role verification
- ✅ User can only access their own notifications
- ✅ Cannot read/delete other users' notifications

### Data Integrity
- ✅ Notifications tied to specific user_id
- ✅ Foreign key constraints ensure data consistency
- ✅ Soft delete for appointments doesn't break notifications (appointment_id nullable)

### Input Validation
- ✅ UUIDs validated via database constraints
- ✅ Enum types for notification_type prevent invalid values
- ✅ Title and message cannot be empty (CHECK constraints)

---

## Performance Considerations

### Database Performance
- Indexed queries for user_id and read status
- Partial index for unread notifications (WHERE read = FALSE)
- Limit/offset pagination for large notification lists

### UI Performance
- Polling every 30 seconds (configurable)
- Request debouncing for mark-as-read operations
- Optimistic UI updates (immediate feedback before API response)
- Lazy rendering of dropdown (not rendered until opened)

### Scalability
- Non-blocking notification creation (doesn't affect booking latency)
- Multi-owner support scales to 10-20 owners per business
- Notification cleanup strategy (future: archive old notifications)

---

## Future Enhancements

### Notification Preferences
- [ ] Allow owners to configure which events trigger notifications
- [ ] Email notification preferences (in-app + email, in-app only, etc.)
- [ ] SMS notification opt-in
- [ ] Notification frequency settings (immediate, daily digest)

### Enhanced Notification Types
- [ ] Low inventory alerts (if service has limited capacity)
- [ ] Customer review notifications
- [ ] Payment received notifications
- [ ] Staff availability conflicts
- [ ] Upcoming appointment reminders (24h before)

### Notification Center Improvements
- [ ] Filter notifications by type (bookings, cancellations, etc.)
- [ ] Search notifications by customer name or booking ID
- [ ] Archive notifications instead of delete
- [ ] Export notification history
- [ ] Real-time updates via WebSocket (instead of polling)

### Appointment Navigation
- [ ] Clicking notification navigates to appointment in calendar
- [ ] Scroll to and highlight appointment
- [ ] Open appointment details modal

### Push Notifications
- [ ] Browser push notifications (via Web Push API)
- [ ] Mobile app push notifications (when mobile app is built)
- [ ] Desktop notifications for critical events

### Notification Cleanup
- [ ] Auto-mark notifications older than 30 days as read
- [ ] Archive notifications older than 90 days
- [ ] Cron job for periodic cleanup

---

## Testing Checklist

### Manual Testing

**Notification Creation:**
- [x] New booking creates notification
- [x] Cancellation creates notification
- [x] Reschedule creates notification
- [x] Notification includes correct booking ID
- [x] Notification includes correct customer name
- [x] Notification includes correct appointment time
- [x] Multi-owner business creates notifications for all owners

**Notification Center UI:**
- [x] Bell icon appears in sidebar
- [x] Badge shows correct unread count
- [x] Badge shows "9+" for 10+ unread
- [x] Clicking bell opens dropdown
- [x] Clicking outside closes dropdown
- [x] Notifications list displays correctly
- [x] Relative time display works ("5m ago", etc.)
- [x] Icons match notification types
- [x] Unread notifications have teal background
- [x] Read notifications have white background
- [x] Empty state shows when no notifications

**API Endpoints:**
- [x] GET /api/owner/notifications returns user's notifications
- [x] GET with ?unread=true returns only unread
- [x] PATCH /api/owner/notifications/[id]/read marks as read
- [x] POST /api/owner/notifications/mark-all-read marks all
- [x] DELETE /api/owner/notifications/[id] deletes notification
- [x] Unauthorized requests return 401
- [x] Cannot access other users' notifications

**Integration:**
- [x] Booking commit triggers notification
- [x] Customer cancellation triggers notification
- [x] Guest cancellation triggers notification
- [x] Customer reschedule triggers notification
- [x] Notification failure doesn't break booking operations

### Automated Testing (TODO)

```typescript
describe('Owner Notification System', () => {
  it('creates notification for new booking', async () => {});
  it('creates notifications for all business owners', async () => {});
  it('marks notification as read', async () => {});
  it('marks all notifications as read', async () => {});
  it('deletes notification', async () => {});
  it('filters unread notifications', async () => {});
  it('paginates notification list', async () => {});
  it('prevents access to other users notifications', async () => {});
  it('handles notification creation failure gracefully', async () => {});
});

describe('Notification Center Component', () => {
  it('displays unread count badge', () => {});
  it('shows "9+" for 10+ unread', () => {});
  it('opens dropdown on bell click', () => {});
  it('closes dropdown on outside click', () => {});
  it('marks notification as read on click', () => {});
  it('deletes notification on delete button click', () => {});
  it('marks all as read on button click', () => {});
  it('polls for updates every 30 seconds', () => {});
  it('shows empty state when no notifications', () => {});
});
```

---

## Database Migration

**File:** `src/db/migrations/019_owner_notifications.sql`

**Changes:**
- Created `notification_type` enum
- Created `notifications` table with all fields and constraints
- Created 5 indexes for optimal query performance
- Added table and column comments

**Rollback Strategy:**
```sql
DROP INDEX IF EXISTS notifications_appointment_id_idx;
DROP INDEX IF EXISTS notifications_user_unread_idx;
DROP INDEX IF EXISTS notifications_read_created_idx;
DROP INDEX IF EXISTS notifications_business_id_idx;
DROP INDEX IF EXISTS notifications_user_id_idx;
DROP TABLE IF EXISTS notifications;
DROP TYPE IF EXISTS notification_type;
```

---

## Related Documentation

- **Step 7r:** Customer Dashboard with Booking Management (STEP_7R_CUSTOMER_DASHBOARD.md)
- **Step 7s:** Unified Appointment Rescheduling System (STEP_7S_RESCHEDULE_SYSTEM.md)
- **Step 7q:** Guest Booking Management (STEP_7Q_GUEST_BOOKING_MANAGEMENT.md)
- **Database Schema:** Complete database schema (DATABASE_SCHEMA.md)

---

## Deployment Notes

### Environment Variables
No new environment variables required.

### Database Migrations
Run migration 019:
```bash
npm run migrate:up
```

### Testing in Production
1. Log in as business owner
2. Open booking page for your business
3. Make a test booking (as customer or guest)
4. Check dashboard sidebar for notification badge
5. Click bell icon to see notification
6. Click notification to mark as read
7. Verify badge count decreases
8. Test "Mark all read" button
9. Test delete notification
10. Verify notifications table in database

---

## Acceptance Criteria

### Must Have (Completed)
- [x] Notifications table created with proper schema
- [x] API endpoints for fetch, mark as read, mark all read, delete
- [x] Notification center UI component in dashboard sidebar
- [x] Unread count badge with "9+" for 10+ unread
- [x] Auto-polling every 30 seconds
- [x] Click notification to mark as read
- [x] Delete individual notifications
- [x] Mark all as read functionality
- [x] Multi-owner support (notifications for all owners)
- [x] Integration with new booking events
- [x] Integration with cancellation events
- [x] Integration with reschedule events
- [x] Non-blocking notification creation
- [x] JWT authentication required
- [x] Owner role verification

### Should Have (Future Work)
- [ ] Notification preferences configuration
- [ ] Click notification to navigate to appointment
- [ ] Real-time updates via WebSocket
- [ ] Browser push notifications
- [ ] Notification history export
- [ ] Filter notifications by type
- [ ] Search notifications
- [ ] Email notifications for critical events

### Nice to Have (Future)
- [ ] SMS notifications
- [ ] Mobile push notifications
- [ ] Desktop notifications
- [ ] Notification templates customization
- [ ] Notification sound effects
- [ ] Daily digest emails

---

## File Structure

```
src/
├── db/
│   └── migrations/
│       └── 019_owner_notifications.sql        # NEW
├── lib/
│   └── notifications/
│       └── owner-notification-service.ts      # Existing (uses new table)
└── components/
    └── dashboard/
        └── NotificationCenter.tsx             # NEW

app/
├── dashboard/
│   └── page.tsx                               # UPDATED (integrated NotificationCenter)
└── api/
    ├── booking/
    │   ├── commit/
    │   │   └── route.ts                       # UPDATED (added notification trigger)
    │   └── guest-appointment/
    │       └── [booking_id]/
    │           └── cancel/
    │               └── route.ts               # UPDATED (added notification trigger)
    └── owner/
        └── notifications/
            ├── route.ts                       # NEW (GET)
            ├── mark-all-read/
            │   └── route.ts                   # NEW (POST)
            └── [id]/
                ├── route.ts                   # NEW (DELETE)
                └── read/
                    └── route.ts               # NEW (PATCH)

docs/
└── STEP_7T_NOTIFICATION_CENTER.md            # This document (NEW)
```

---

**End of Document**
