# Step 7u: Customer Email Notifications with Resend and React Email

## Overview

This document describes the implementation of customer email notifications for booking events using Resend and React Email. This system sends transactional emails to customers for bookings, cancellations, reschedules, and reminders.

**Status:** Completed
**Date:** 2025-10-14

---

## Architecture

### Email Notification Flow

1. **Customer Action** (booking/cancellation/reschedule)
2. **API Endpoint** calls `CustomerNotificationService`
3. **Email Service** renders React Email template
4. **Resend API** sends email
5. **Email Logs** record delivery status in `notification_logs` table

### System Separation

- **In-app notifications** (Step 7t): `NotificationService` → `notification_logs` table → notification center UI (for business owners)
- **Email notifications** (Step 7u): `CustomerNotificationService` → Resend API → customer inbox

**Both systems coexist and serve different purposes.**

---

## Database Changes

### Migration 020: Add template_name to notification_logs

**File:** `src/db/migrations/020_add_template_name_to_notification_logs.sql`

```sql
ALTER TABLE notification_logs
ADD COLUMN IF NOT EXISTS template_name TEXT;

CREATE INDEX IF NOT EXISTS notification_logs_template_name_idx
ON notification_logs(template_name);
```

**Purpose:** Track which email template was used for each notification delivery.

---

## Dependencies

### Installed Packages

```json
{
  "dependencies": {
    "resend": "^6.1.2",
    "@react-email/components": "^0.5.6",
    "@react-email/render": "^1.3.2"
  }
}
```

### Environment Variables

```env
# Required
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=Rivo <noreply@rhivo.app>

# Optional
NEXT_PUBLIC_APP_URL=https://rhivo.app
```

---

## Email Templates

All templates are built with React Email and follow Rivo's functional minimalism design (teal/green colors, clean layout, mobile-responsive).

### 1. Booking Confirmation

**File:** `src/lib/email/templates/BookingConfirmation.tsx`

**Sent when:** Customer completes booking
**Includes:**
- Service details
- Appointment date/time
- Booking ID
- Price
- Business contact info
- Cancellation link
- Reschedule link

**TODO:** Add calendar attachment (.ics file)

### 2. Cancellation Confirmation

**File:** `src/lib/email/templates/CancellationConfirmation.tsx`

**Sent when:** Customer or guest cancels appointment
**Includes:**
- Cancelled appointment details
- Original date/time
- Booking ID
- Rebooking link
- Business contact info

### 3. Reschedule Confirmation

**File:** `src/lib/email/templates/RescheduleConfirmation.tsx`

**Sent when:** Customer or owner reschedules appointment
**Includes:**
- Old appointment time (strikethrough)
- New appointment time (highlighted in green)
- Service details
- Booking ID
- Cancellation/reschedule links

**TODO:** Add updated calendar attachment (.ics file)

### 4. Appointment Reminder

**File:** `src/lib/email/templates/AppointmentReminder.tsx`

**Sent when:** 24 hours before appointment (requires cron job - not yet implemented)
**Includes:**
- Appointment details
- Business location and contact
- Parking instructions (if available)
- Preparation instructions (if available)
- Cancellation/reschedule links
- Unsubscribe link

**TODO:** Implement cron job to send reminders automatically
**TODO:** Add unsubscribe mechanism (requires customer_preferences table)

---

## Core Services

### EmailService

**File:** `src/lib/email/email-service.ts`

**Purpose:** Handles actual email sending via Resend with retry logic

**Features:**
- Sends emails via Resend API
- Implements exponential backoff retry (3 attempts)
- Logs all delivery attempts to `notification_logs`
- Non-blocking (doesn't throw on failure)

**Key Methods:**
- `sendEmail()` - Send email with retry logic
- `logEmailDelivery()` - Log to notification_logs table

### CustomerNotificationService

**File:** `src/lib/email/customer-notification-service.ts`

**Purpose:** High-level service for sending customer notifications

**Features:**
- Fetches appointment details from database
- Handles both guest and authenticated customer cases
- Renders email templates with appropriate data
- Formats dates, times, and prices
- Generates cancellation/reschedule links

**Key Methods:**
- `sendBookingConfirmation()` - Send confirmation after booking
- `sendCancellationConfirmation()` - Send after cancellation
- `sendRescheduleConfirmation()` - Send after reschedule
- `sendAppointmentReminder()` - Send reminder (TODO: cron job)

---

## Integration Points

### 1. Booking Commit Flow

**File:** `src/app/api/booking/commit/route.ts`

```typescript
// After successful booking
customerNotificationService
  .sendBookingConfirmation(appointmentData)
  .catch((error) => {
    console.error('Failed to send booking confirmation email:', error);
    // Don't block booking on email failure
  });
```

### 2. Guest Cancellation

**File:** `app/api/booking/guest-appointment/[booking_id]/cancel/route.ts`

```typescript
// After cancellation
customerNotificationService
  .sendCancellationConfirmation(appointmentData)
  .catch((error) => {
    console.error('Failed to send cancellation confirmation email:', error);
    // Don't block cancellation on email failure
  });
```

### 3. Customer Reschedule

**File:** `app/api/customer/appointments/[id]/reschedule/route.ts`

```typescript
// Queue in-app notification (step 7t - notification center)
notificationService.queueRescheduleNotification(...);

// Send email (step 7u - customer inbox)
customerNotificationService
  .sendRescheduleConfirmation(appointmentData, oldStart, oldEnd)
  .catch((error) => {
    console.error('Failed to send reschedule confirmation email:', error);
    // Don't block reschedule on email failure
  });
```

---

## Data Consistency

### Guest vs Account Bookings

The system handles both cases transparently:

**Guest Bookings:**
```typescript
{
  customerId: null,
  guestEmail: 'guest@example.com',
  guestName: 'John Doe'
}
```

**Account Bookings:**
```typescript
{
  customerId: 'uuid-here',
  guestEmail: null,  // Email fetched from users table
  guestName: null    // Name fetched from users table
}
```

The `CustomerNotificationService` automatically resolves the correct email and name using database joins.

### Email Delivery Logging

All email delivery attempts are logged to `notification_logs`:

```sql
INSERT INTO notification_logs (
  id,
  appointment_id,
  recipient_email,
  channel,            -- 'email'
  template_name,      -- e.g., 'appointment_confirmed'
  status,             -- 'sent' or 'failed'
  attempts,           -- Retry count
  error_message,      -- If failed
  last_attempt_at,
  created_at
) VALUES (...);
```

---

## Error Handling

### Non-Blocking Design

**Email failures never block booking operations.**

All email sending is wrapped in `.catch()` handlers that log errors but don't throw:

```typescript
customerNotificationService
  .sendBookingConfirmation(appointmentData)
  .catch((error) => {
    console.error('Failed to send email:', error);
    // Booking still succeeds
  });
```

### Retry Logic

The `EmailService` implements automatic retry with exponential backoff:

```typescript
Attempt 1: Immediate
Attempt 2: Wait 1 second
Attempt 3: Wait 2 seconds
Max retries: 3
```

Transient failures (rate limits, temporary API errors) are retried automatically.

---

## Testing

### Manual Testing

1. **Set up Resend API key:**
   ```bash
   export RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

2. **Create a booking via API:**
   ```bash
   curl -X POST http://localhost:3000/api/booking/commit \
     -H "Content-Type: application/json" \
     -d '{
       "reservationId": "reservation-uuid",
       "guestEmail": "test@example.com",
       "guestPhone": "+1234567890",
       "guestName": "Test User"
     }'
   ```

3. **Check email inbox** for confirmation email

4. **Check database logs:**
   ```sql
   SELECT * FROM notification_logs
   WHERE recipient_email = 'test@example.com'
   ORDER BY created_at DESC;
   ```

### Development Mode

In development, you can use Resend's test mode:
- Emails are sent to Resend dashboard
- No actual email delivery
- Full template rendering and logging

---

## TODOs and Future Enhancements

### High Priority

- [ ] **Calendar attachments (.ics files)** - Add to confirmation and reschedule emails
- [ ] **Appointment reminder cron job** - Implement automated 24h reminders
- [ ] **Unsubscribe mechanism** - Create customer_preferences table for email preferences

### Medium Priority

- [ ] **Email delivery webhooks** - Implement webhook endpoint to receive delivery/open/click events from Resend
- [ ] **Email template preview** - Create admin page to preview all templates with test data
- [ ] **Multi-language support** - Translate email templates based on business locale

### Low Priority

- [ ] **Email analytics** - Track open rates, click rates per template
- [ ] **A/B testing** - Test different subject lines and CTAs
- [ ] **Rich text formatting** - Add support for business-specific email customization

---

## Monitoring and Observability

### Key Metrics

Monitor these in production:

1. **Email delivery rate:**
   ```sql
   SELECT
     template_name,
     COUNT(*) as total,
     SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
     SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
   FROM notification_logs
   WHERE channel = 'email'
     AND created_at > NOW() - INTERVAL '24 hours'
   GROUP BY template_name;
   ```

2. **Retry frequency:**
   ```sql
   SELECT attempts, COUNT(*)
   FROM notification_logs
   WHERE channel = 'email'
   GROUP BY attempts
   ORDER BY attempts;
   ```

3. **Failure reasons:**
   ```sql
   SELECT error_message, COUNT(*)
   FROM notification_logs
   WHERE status = 'failed'
   GROUP BY error_message
   ORDER BY COUNT(*) DESC
   LIMIT 10;
   ```

### Alerts

Set up alerts for:
- Email delivery rate drops below 95%
- More than 10 failed emails in 5 minutes
- Resend API rate limit errors

---

## Security Considerations

1. **No credentials in client code** - Resend API key is server-side only
2. **Token validation** - Cancellation/reschedule links use secure tokens
3. **Email validation** - All email addresses validated before sending
4. **Rate limiting** - Resend enforces rate limits (check your plan)
5. **GDPR compliance** - TODO: Add unsubscribe mechanism

---

## Related Documentation

- [Step 7t: Business Owner Notification Center](./STEP_7T_OWNER_NOTIFICATIONS.md) - In-app notifications
- [Step 7v: Business Owner Email Notifications](./STEP_7V_OWNER_EMAIL_NOTIFICATIONS.md) - Owner emails (TODO)
- [Database Schema](./DATABASE_SCHEMA.md) - notification_logs table
- [Style Guide](./style-guide.md) - Branding guidelines for emails

---

## Acceptance Criteria

✅ Customers receive professional, branded email confirmations immediately after booking
✅ Cancellation and reschedule actions trigger appropriate email notifications
✅ Emails render correctly on desktop and mobile email clients
✅ Email delivery is logged and failures are retried automatically
✅ System handles both guest and authenticated customer cases
✅ Email failures do not block booking operations
✅ All templates follow Rhivo branding (teal/green, minimal design)

⏳ Reminder emails (requires cron job)
⏳ Calendar attachments (.ics files)
⏳ Unsubscribe mechanism

---

**Implementation Complete:** All core customer email notifications are functional. TODOs are marked for future enhancements.
