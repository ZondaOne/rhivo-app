# Monitoring & Alerting Setup Guide

This guide walks you through setting up error tracking, uptime monitoring, and email alerts for critical issues.

## 🎯 What You'll Get

- **Error Tracking**: Automatic capture of all errors with full stack traces
- **Email Alerts**: Instant notifications for critical database errors and booking failures
- **Uptime Monitoring**: Alerts when your app goes down
- **Performance Monitoring**: Track slow database queries and API response times

**Cost: $0/month** (using free tiers)

---

## 📊 Part 1: Sentry Error Tracking Setup

Sentry will automatically capture errors and send you email alerts for critical issues.

### Step 1: Create Sentry Account

1. Go to [sentry.io](https://sentry.io/signup/)
2. Sign up for free (no credit card required)
3. Free tier includes:
   - 5,000 errors/month
   - 50 replays/month
   - Email alerts
   - 30 day retention

### Step 2: Create a Project

1. Click **"Create Project"**
2. Select **"Next.js"** as the platform
3. Set alert frequency: **"Alert me on every new issue"**
4. Name your project: `rivo-app` (or your app name)
5. Click **"Create Project"**

### Step 3: Get Your DSN

After creating the project, you'll see a DSN (Data Source Name) like:
```
https://abc123def456@o123456.ingest.sentry.io/789012
```

Copy this DSN - you'll need it in the next step.

### Step 4: Configure Environment Variables

Add these to your `.env` file (and to Netlify/Vercel environment variables):

```bash
# Required for error tracking
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn-here@o123456.ingest.sentry.io/789012

# Required for source map uploads (optional but recommended)
SENTRY_ORG=your-org-name
SENTRY_PROJECT=rivo-app

# Optional: Only needed if you want to upload source maps for better stack traces
# Get from: Settings → Developer Settings → Auth Tokens
# SENTRY_AUTH_TOKEN=your-auth-token-here
```

### Step 5: Configure Email Alerts

1. In Sentry, go to **Settings → Alerts**
2. Click **"Create Alert Rule"**
3. Select **"Issues"**
4. Configure:
   - **When**: An event is first seen
   - **If**: `event.tags[critical] equals "true"`
   - **Then**: Send notification to email
5. Click **"Save Rule"**

This will send emails ONLY for critical errors (database failures, booking errors), not validation errors.

### Step 6: Set Up Additional Alerts (Optional)

Create another alert for high error rates:

1. Create new alert rule
2. **When**: `events`
3. **If**: `count()` is above `10` in `1 minute`
4. **Then**: Send notification to email

This alerts you if there's a sudden spike in errors.

---

## 🔍 Part 2: BetterUptime Setup

BetterUptime monitors your app's availability and alerts you when it goes down.

### Step 1: Create BetterUptime Account

1. Go to [betteruptime.com](https://betteruptime.com/)
2. Sign up for free (no credit card required)
3. Free tier includes:
   - 3 monitors
   - 3-minute check interval
   - Email/SMS alerts
   - 90-day data retention

### Step 2: Add Your First Monitor

1. Click **"Create Monitor"**
2. Select **"HTTP(S)"**
3. Configure:
   - **URL**: `https://your-app.netlify.app/api/health`
   - **Name**: `Rivo App - Main Health Check`
   - **Check interval**: `3 minutes`
   - **Request timeout**: `30 seconds`
4. Click **"Create Monitor"**

### Step 3: Configure Expected Response

1. In monitor settings, click **"Advanced"**
2. Set:
   - **Expected status code**: `200`
   - **Expected response time**: `< 3000ms`
3. Save changes

### Step 4: Set Up Alert Recipients

1. Go to **"On-call Scheduling"**
2. Click **"Add recipient"**
3. Add your email address
4. Enable **"Immediate alerts"** (no escalation delay)
5. Save

### Step 5: Add Additional Monitors (Optional)

If you have monitors remaining, add:

**Monitor 2: Database-specific health check**
- URL: `https://your-app.netlify.app/api/health/reservations`
- Name: `Rivo App - Reservation System`

**Monitor 3: Critical API endpoint**
- URL: `https://your-app.netlify.app/api/booking/slots?subdomain=test&date=2025-01-01&serviceId=test`
- Name: `Rivo App - Booking API`

---

## 📧 Email Notification Examples

### Critical Database Error Email

When a database connection fails, you'll receive an email like:

**Subject**: [Sentry] DatabaseError: connection refused

**Body**:
```
Error: connect ECONNREFUSED
Type: database_connection
Severity: critical

Business: Blue's Barber (ID: 123)
Service: Haircut (ID: 456)
Customer: john@example.com

Query: SELECT * FROM reservations WHERE business_id = ...
Timestamp: 2025-01-15T10:30:45Z

Stack Trace:
  at getDbClient (src/db/client.ts:25)
  at reserveSlot (src/lib/booking/reservation-manager.ts:112)
  ...
```

### Booking Failure Email

When a booking operation fails:

**Subject**: [Sentry] BookingError: Failed to create reservation

**Body**:
```
Error: Failed to create reservation
Type: booking_system_failure
Severity: critical

Business: Blue's Barber
Service: Haircut & Beard Trim
Customer: customer@example.com
Time Slot: 2025-01-20 14:00-15:00

Additional Context:
  reservationId: res_abc123
  timestamp: 2025-01-15T10:35:22Z
```

### Uptime Alert Email (BetterUptime)

When your app goes down:

**Subject**: 🔴 Rivo App - Main Health Check is DOWN

**Body**:
```
Monitor: Rivo App - Main Health Check
Status: DOWN
URL: https://your-app.netlify.app/api/health

Error: HTTP 503 Service Unavailable
Response time: 1,245ms
Started: 2025-01-15 10:40 UTC

Incident details: https://betteruptime.com/incidents/...
```

---

## 🧪 Testing Your Setup

### Test 1: Verify Sentry is Working

Run this command to trigger a test error:

```bash
curl https://your-app.netlify.app/api/sentry-test-error
```

You should receive an email from Sentry within 1-2 minutes.

### Test 2: Verify Health Check

```bash
curl https://your-app.netlify.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:45:00Z",
  "responseTime": 234,
  "checks": {
    "database": { "status": "healthy", "responseTime": 145 },
    "database_pool": { "status": "healthy", "responseTime": 12 },
    "reservation_cleanup": { "status": "healthy", "responseTime": 8 }
  }
}
```

### Test 3: Verify BetterUptime

Wait 3-5 minutes after adding the monitor. BetterUptime should:
1. Show green checkmark next to monitor
2. Display recent response times
3. Show 100% uptime

---

## 🎯 What Errors Trigger Alerts

### ✅ Will Send Email Alert

- Database connection errors
- Database timeout errors (> 10 seconds)
- Database pool exhausted
- Booking system failures
- Payment processing errors (if implemented)
- App downtime (no response or 503 errors)

### ❌ Will NOT Send Email Alert

- Validation errors (invalid input)
- 404 Not Found errors
- Authentication failures (wrong password)
- Rate limit errors
- Client-side errors (unless critical)

---

## 📊 Monitoring Dashboard

### Sentry Dashboard

Access at: `https://sentry.io/organizations/your-org/issues/`

Shows:
- Recent errors grouped by type
- Error frequency trends
- Affected users
- Performance metrics
- Session replays (for debugging)

### BetterUptime Dashboard

Access at: `https://betteruptime.com/team/monitors`

Shows:
- Uptime percentage (target: 99.9%)
- Response time trends
- Incident history
- Status page (shareable with customers)

---

## 🔧 Advanced Configuration

### Customize Error Filtering

To ignore specific errors in Sentry, add to `sentry.server.config.ts`:

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  beforeSend(event, hint) {
    // Ignore specific errors
    if (event.exception?.values?.[0]?.value?.includes('Invalid email format')) {
      return null; // Don't send to Sentry
    }
    return event;
  },
});
```

### Add User Context

To track which users experience errors:

```typescript
import * as Sentry from "@sentry/nextjs";

// In your auth middleware
Sentry.setUser({
  id: user.id,
  email: user.email,
  businessId: user.businessId,
});
```

### Monitor Specific Functions

For critical functions, add manual tracking:

```typescript
import { reportBookingFailure } from '@/lib/monitoring/critical-errors';

try {
  await createReservation(data);
} catch (error) {
  reportBookingFailure(error, {
    businessId: data.businessId,
    businessName: business.name,
    serviceId: data.serviceId,
    serviceName: service.name,
    customerEmail: data.customerEmail,
    timestamp: new Date().toISOString(),
  });
  throw error;
}
```

---

## 💰 Cost Breakdown

| Service | Free Tier | Paid (if needed) |
|---------|-----------|------------------|
| Sentry | 5K errors/month | $26/month for 50K |
| BetterUptime | 3 monitors | $18/month for 10 monitors |
| **Total** | **$0/month** | **$44/month** |

For most small-to-medium apps, the free tier is more than sufficient.

---

## ✅ Checklist

- [ ] Created Sentry account
- [ ] Added `NEXT_PUBLIC_SENTRY_DSN` to environment variables
- [ ] Configured email alerts in Sentry
- [ ] Created BetterUptime account
- [ ] Added health check monitor
- [ ] Tested health endpoint
- [ ] Verified receiving test alert
- [ ] Added monitoring info to team documentation

---

## 🆘 Troubleshooting

### Not Receiving Sentry Emails?

1. Check spam folder
2. Verify email in Sentry Settings → Account → Emails
3. Check alert rules: Settings → Alerts
4. Ensure `critical` tag is set in alert rule

### BetterUptime Shows Down But App Works?

1. Check if health endpoint returns 200
2. Verify Netlify deployment succeeded
3. Check if middleware is blocking `/api/health`
4. Increase timeout in BetterUptime settings

### Too Many Alert Emails?

1. Adjust Sentry alert rules to require `critical` tag
2. Increase error threshold (e.g., 20 errors in 5 minutes)
3. Set up quiet hours in BetterUptime

---

## 📚 Additional Resources

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [BetterUptime API](https://betteruptime.com/docs/api)
- [Health Check Best Practices](https://docs.microsoft.com/en-us/azure/architecture/patterns/health-endpoint-monitoring)

---

**Last Updated**: 2025-01-15
**Maintained By**: Development Team
