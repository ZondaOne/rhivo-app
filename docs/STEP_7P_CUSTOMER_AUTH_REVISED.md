# Step 7p: Customer Authentication System (REVISED - UX First)

**Status:** 🔄 In Progress - Revised for Frictionless UX
**Last Updated:** 2025-10-09
**Priority:** High

---

## Overview

This document describes a **frictionless, UX-first customer authentication system** that prioritizes ease of use while enabling customers to create accounts, manage their bookings, and build a relationship with the platform.

### Design Philosophy: Friction-less First

**Core Principle:** Never block a booking with authentication. Make signup optional, fast, and rewarding.

- **Guest-first approach:** All bookings can be made as guest (existing guest booking system)
- **Post-booking account creation:** Offer account creation AFTER successful booking
- **Flexible credentials:** Accept email OR phone OR both (user chooses)
- **Progressive enhancement:** Gradually add features that incentivize accounts
- **No verification blockers:** Skip email/phone verification during signup for debugging (add later)

---

## Key Changes from Original Step 7p

### What's Different

| Original | Revised UX-First Approach |
|----------|---------------------------|
| Separate customer table | Use existing `users` table with `role='customer'` |
| Email + password required | Email OR phone (at least one required) |
| Mandatory signup before booking | Optional signup (guest booking default) |
| Email verification required | ⚠️ Skip verification for now (debugging), add later |
| Social login (complex) | Start simple: email/phone + password only |
| Pre-booking signup flow | Post-booking signup incentive |

### What Stays the Same

- ✅ JWT-based authentication (reuse existing owner auth system)
- ✅ Secure password hashing (bcrypt)
- ✅ Rate limiting for protection
- ✅ Refresh token system (30-day sessions)
- ✅ Customer dashboard to view bookings

---

## User Flows

### Flow 1: Guest Booking (Primary Path - No Friction)

```
Customer visits booking page
  → Selects service & time
  → Provides email OR phone (required for booking)
  → Books appointment (guest)
  → Receives confirmation with Booking ID
  → [OPTIONAL] "Create account to track all bookings" prompt
```

**Result:** Booking completed with ZERO authentication friction.

### Flow 2: Post-Booking Account Creation (Incentivized)

```
After successful guest booking
  → Show value proposition card:
     "Track all your bookings in one place"
     "Get appointment reminders"
     "Faster rebooking next time"
  → [CREATE ACCOUNT] button (optional, dismissible)
  → If clicked: Simple modal/form
     - Pre-filled email/phone from booking
     - Add password (only new field)
     - Optional: Add missing credential (email if only phone, phone if only email)
  → Account created instantly (no verification for debugging)
  → Redirect to customer dashboard with existing booking visible
```

**Result:** Low-friction upgrade from guest to account holder.

### Flow 3: Returning Customer Signup (Before Booking)

```
Customer visits booking page
  → Clicks "Sign in or create account" (subtle link, not blocking)
  → Modal opens with tabs: [Sign In] [Sign Up]
  → Sign Up tab:
     - Email OR phone (user chooses, can add both)
     - Password
     - Name (optional for better UX)
  → Account created instantly
  → Returns to booking flow with pre-filled contact info
```

**Result:** Opt-in signup for users who want accounts from the start.

### Flow 4: Customer Login

```
Customer with existing account
  → Visits booking page or customer dashboard
  → Clicks "Sign in"
  → Enters email/phone + password
  → Authenticated
  → Booking flow auto-fills contact info
  → Past bookings visible in dashboard
```

---

## Database Schema

### Using Existing `users` Table

No new `customers` table needed. Use existing `users` table with `role = 'customer'`.

#### Required Schema Changes

**Modified columns in `users` table:**

```sql
-- Make email optional (allow phone-only accounts)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Add constraint: at least email OR phone must be present
ALTER TABLE users ADD CONSTRAINT users_contact_check
  CHECK (email IS NOT NULL OR phone IS NOT NULL);

-- Ensure unique constraint allows null emails (for phone-only accounts)
DROP INDEX IF EXISTS users_email_unique_idx;
CREATE UNIQUE INDEX users_email_unique_idx ON users(LOWER(email))
  WHERE deleted_at IS NULL AND email IS NOT NULL;

-- Add unique constraint for phone (phone-only accounts must be unique)
CREATE UNIQUE INDEX users_phone_unique_idx ON users(LOWER(phone))
  WHERE deleted_at IS NULL AND phone IS NOT NULL;
```

**Existing columns used:**

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| `id` | UUID | NO | Primary key |
| `email` | TEXT | YES | Email (optional, can be NULL if phone provided) |
| `phone` | TEXT | YES | Phone (optional, can be NULL if email provided) |
| `name` | TEXT | YES | Customer name (optional) |
| `role` | user_role | NO | Set to `'customer'` |
| `password_hash` | TEXT | YES | Bcrypt hash (NULL for OAuth/magic link users) |
| `email_verified` | BOOLEAN | NO | Default FALSE, skip verification for debugging |
| `email_verification_token` | TEXT | YES | For future verification (not enforced now) |
| `email_verification_expires_at` | TIMESTAMPTZ | YES | Token expiry |
| `created_at` | TIMESTAMPTZ | NO | Account creation time |
| `deleted_at` | TIMESTAMPTZ | YES | Soft delete support |

**Migration file:** `src/db/migrations/018_customer_auth_flexible_contact.sql`

---

## API Endpoints

### 1. Customer Signup

**Endpoint:** `POST /api/auth/signup/customer`

**Purpose:** Create customer account with flexible credentials (email OR phone).

**Request Body (Flexible Options):**

```json
// Option 1: Email only
{
  "email": "customer@example.com",
  "password": "SecurePass123!",
  "name": "Jane Doe"  // optional
}

// Option 2: Phone only
{
  "phone": "+1234567890",
  "password": "SecurePass123!",
  "name": "Jane Doe"  // optional
}

// Option 3: Both (best UX)
{
  "email": "customer@example.com",
  "phone": "+1234567890",
  "password": "SecurePass123!",
  "name": "Jane Doe"  // optional
}
```

**Validation Rules:**

- At least one of `email` or `phone` MUST be provided
- If `email` provided, must be valid email format
- If `phone` provided, must be valid E.164 format (recommended, not enforced)
- Password must meet strength requirements (8+ chars, uppercase, lowercase, number)
- Name is optional but recommended

**Response (Success):**

```json
{
  "success": true,
  "message": "Account created successfully",
  "accessToken": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "customer@example.com",
    "phone": "+1234567890",
    "name": "Jane Doe",
    "role": "customer",
    "emailVerified": false
  }
}
```

**Sets Cookie:** `refresh_token` (httpOnly, secure, 30d)

**Notes:**
- ⚠️ Email verification skipped for debugging (TODO: add later)
- User is immediately logged in after signup
- Returns JWT access token for immediate use
- No verification email sent (comment in code: `// TODO: Send verification email after debugging phase`)

**Error Responses:**

```json
// Missing both email and phone
{
  "error": "At least one contact method (email or phone) is required",
  "status": 400
}

// Email already registered
{
  "error": "Email already registered",
  "status": 400
}

// Phone already registered
{
  "error": "Phone number already registered",
  "status": 400
}

// Weak password
{
  "error": "Password does not meet requirements",
  "details": ["Must contain at least one uppercase letter"],
  "status": 400
}
```

---

### 2. Customer Login (Flexible Identifier)

**Endpoint:** `POST /api/auth/login`

**Purpose:** Login with email OR phone + password.

**Request Body:**

```json
// Login with email
{
  "identifier": "customer@example.com",
  "password": "SecurePass123!"
}

// Login with phone
{
  "identifier": "+1234567890",
  "password": "SecurePass123!"
}
```

**Backend Logic:**

```typescript
// Detect if identifier is email or phone
const isEmail = identifier.includes('@');
const user = isEmail
  ? await findUserByEmail(identifier)
  : await findUserByPhone(identifier);
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "customer@example.com",
    "phone": "+1234567890",
    "name": "Jane Doe",
    "role": "customer"
  }
}
```

**Sets Cookie:** `refresh_token`

---

### 3. Link Guest Booking to Account

**Endpoint:** `POST /api/customer/link-booking`

**Purpose:** After post-booking signup, link existing guest booking to new account.

**Request Body:**

```json
{
  "bookingId": "RIVO-A3K-9F2-7Q1",
  "guestEmail": "customer@example.com"  // or guestPhone
}
```

**Authorization:** Requires valid customer JWT

**Response:**

```json
{
  "success": true,
  "message": "Booking linked to your account",
  "appointment": {
    "id": "uuid",
    "bookingId": "RIVO-A3K-9F2-7Q1",
    "startTime": "2025-10-15T10:00:00Z",
    "serviceName": "Swedish Massage"
  }
}
```

**Backend Logic:**

1. Verify JWT (customer must be authenticated)
2. Find appointment by `bookingId`
3. Verify `guest_email` or `guest_phone` matches request
4. Update appointment: set `customer_id = <authenticated_user_id>`
5. Clear guest fields: `guest_email = NULL`, `guest_phone = NULL` (data moved to user record)
6. Create audit log entry

---

### 4. Customer Dashboard

**Endpoint:** `GET /api/customer/appointments`

**Purpose:** Get all appointments for authenticated customer.

**Authorization:** Requires valid customer JWT

**Query Parameters:**
- `status` (optional): Filter by appointment status
- `upcoming` (optional): Boolean to show only future appointments

**Response:**

```json
{
  "success": true,
  "appointments": [
    {
      "id": "uuid",
      "bookingId": "RIVO-A3K-9F2-7Q1",
      "businessName": "Wellness Spa",
      "serviceName": "Swedish Massage",
      "startTime": "2025-10-15T10:00:00Z",
      "endTime": "2025-10-15T11:00:00Z",
      "status": "confirmed",
      "price": 8000
    }
  ],
  "total": 1
}
```

---

## Frontend Components

### 1. Customer Signup Modal (Frictionless)

**File:** `app/components/auth/CustomerSignupModal.tsx`

**Features:**
- Lightweight modal (not full page)
- Tabs: [Sign In] [Sign Up]
- Smart field detection:
  - User types input → detect email vs phone format
  - Single "Email or Phone" field (smart parsing)
  - Alternative: Two separate optional fields
- Password field with strength indicator
- Optional name field
- Clear value proposition text
- Dismissible (X button, ESC key, click outside)

**UX Flow:**

```
[Modal opens]
  ┌─────────────────────────────────────┐
  │  Create Your Account                │
  │  Track bookings • Faster rebooking  │
  ├─────────────────────────────────────┤
  │  Email or Phone                     │
  │  [________________] (smart input)   │
  │                                     │
  │  Password                           │
  │  [________________]                 │
  │  ● ● ● ○ Strength: Medium          │
  │                                     │
  │  Name (optional)                    │
  │  [________________]                 │
  │                                     │
  │  [Create Account →]                 │
  │                                     │
  │  Already have account? Sign in      │
  └─────────────────────────────────────┘
```

---

### 2. Post-Booking Signup Prompt

**File:** `app/components/booking/PostBookingSignupPrompt.tsx`

**Appears:** After successful guest booking confirmation

**Design:**

```
┌──────────────────────────────────────────┐
│ ✓ Booking Confirmed!                     │
│ Booking ID: RIVO-A3K-9F2-7Q1            │
├──────────────────────────────────────────┤
│                                          │
│ 💡 Track all your bookings              │
│                                          │
│ Create a free account to:                │
│ • View booking history                   │
│ • Get appointment reminders              │
│ • Rebook with one click                  │
│                                          │
│ [Create Free Account →]  [Maybe Later]   │
│                                          │
│ Your email: customer@example.com         │
│ (already saved from booking)             │
└──────────────────────────────────────────┘
```

**Behavior:**
- Non-blocking (can dismiss)
- Pre-fills email/phone from booking
- Only asks for password (minimal friction)
- If dismissed, never blocks user experience
- Show again on next booking (cookie-based dismissal tracking)

---

### 3. Customer Dashboard Page

**File:** `app/customer/dashboard/page.tsx`

**Features:**
- Protected route (requires customer auth)
- List of all appointments (past and upcoming)
- Filters: Upcoming, Past, Canceled
- Quick actions: Cancel, Reschedule, View Details
- Account settings link

**Layout:**

```
┌────────────────────────────────────────┐
│ Your Bookings                          │
├────────────────────────────────────────┤
│ [Upcoming] [Past] [Canceled]           │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ Wellness Spa                       │ │
│ │ Swedish Massage • 60 min           │ │
│ │ Oct 15, 2025 at 10:00 AM          │ │
│ │ Booking ID: RIVO-A3K-9F2-7Q1      │ │
│ │ [Cancel] [Reschedule] [Details →] │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ Bella Salon                        │ │
│ │ Haircut • 45 min                   │ │
│ │ Oct 18, 2025 at 2:00 PM           │ │
│ │ Booking ID: RIVO-B7N-1K4-8M2      │ │
│ │ [Cancel] [Reschedule] [Details →] │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

---

### 4. Booking Flow Integration

**File:** `app/book/[subdomain]/page.tsx` (existing, modify)

**Changes Needed:**

1. **Add optional "Sign In" link** in header (non-blocking)
   ```tsx
   <header>
     <Logo />
     <span className="text-sm text-gray-600">
       Have an account? <button onClick={openSignInModal}>Sign in</button>
     </span>
   </header>
   ```

2. **Auto-fill contact info** if customer is logged in
   ```tsx
   const { user, isAuthenticated } = useAuth();

   const initialEmail = isAuthenticated && user?.email
     ? user.email
     : '';
   ```

3. **Skip contact input step** if authenticated (UX enhancement)
   ```tsx
   if (isAuthenticated) {
     // Skip straight to confirmation
     commitBooking({
       email: user.email,
       phone: user.phone,
       name: user.name,
     });
   }
   ```

---

## Implementation Checklist

### Phase 1: Database & Backend (Priority)

- [ ] **Migration 018:** Flexible contact schema
  - Make `users.email` nullable
  - Add `CHECK` constraint (email OR phone required)
  - Add unique indexes for email and phone
  - Test migration rollback

- [ ] **Update Customer Signup API** (`app/api/auth/signup/customer/route.ts`)
  - Accept flexible credentials (email OR phone OR both)
  - Validate at least one contact method provided
  - Check uniqueness for both email and phone
  - Skip email verification (add TODO comment)
  - Auto-login after signup (return JWT)

- [ ] **Update Login API** (`app/api/auth/login/route.ts`)
  - Accept `identifier` field (email or phone)
  - Auto-detect format (email vs phone)
  - Query by email OR phone
  - Existing JWT logic unchanged

- [ ] **New Endpoint:** Link Guest Booking
  - `POST /api/customer/link-booking`
  - Verify customer JWT
  - Match booking by ID + guest email/phone
  - Update `customer_id`, clear guest fields
  - Create audit log entry

- [ ] **New Endpoint:** Customer Appointments
  - `GET /api/customer/appointments`
  - Verify customer JWT
  - Query appointments where `customer_id = user.id`
  - Support filtering (upcoming, past, status)

### Phase 2: Frontend Components

- [ ] **CustomerSignupModal Component**
  - Lightweight modal with tabs
  - Smart email/phone input (or separate fields)
  - Password strength indicator
  - Optional name field
  - Form validation
  - Call signup API, handle JWT response

- [ ] **PostBookingSignupPrompt Component**
  - Value proposition card
  - Pre-fill email/phone from booking
  - Only request password
  - Call signup + link-booking APIs
  - Dismissible (cookie tracking)

- [ ] **Customer Dashboard Page**
  - Protected route (redirect if not authenticated)
  - Fetch and display appointments
  - Tabs: Upcoming, Past, Canceled
  - Action buttons: Cancel, Reschedule, View
  - Account settings link

- [ ] **Update Booking Flow**
  - Add "Sign in" link to header (optional, non-blocking)
  - Auto-fill contact info if authenticated
  - Show PostBookingSignupPrompt after guest booking
  - Skip contact step if authenticated

### Phase 3: Testing & Polish

- [ ] **Integration Tests**
  - Signup with email only
  - Signup with phone only
  - Signup with both email and phone
  - Login with email
  - Login with phone
  - Link guest booking to account
  - Fetch customer appointments

- [ ] **UX Testing**
  - Guest booking flow (no account)
  - Post-booking signup flow
  - Pre-booking signup flow
  - Customer dashboard usability
  - Mobile responsiveness

- [ ] **Security Audit**
  - Rate limiting on signup/login
  - Password strength enforcement
  - JWT expiration and refresh
  - Prevent email/phone enumeration
  - CSRF protection

### Phase 4: Future Enhancements (Post-Debugging)

- [ ] **Email Verification**
  - Send verification email on signup
  - Require verification before certain actions (optional)
  - Resend verification email endpoint

- [ ] **Phone Verification**
  - SMS verification codes
  - Verify phone before certain actions

- [ ] **OAuth / Social Login**
  - Google Sign-In
  - Apple Sign-In
  - Facebook Login (optional)

- [ ] **Magic Link Login**
  - Passwordless email login
  - SMS magic link login

---

## Security Considerations

### Password Security
- Bcrypt hashing (existing implementation, reuse)
- Minimum 8 characters, complexity requirements
- Rate limiting on login attempts (5 per 15 min)

### Token Security
- JWT access tokens (1h expiration)
- Refresh tokens (30d expiration, stored in httpOnly cookies)
- Token rotation on refresh
- Revocation support for compromised tokens

### Data Privacy
- Email and phone stored securely
- Guest bookings can be linked to accounts (user consent implied by signup)
- Soft deletes for GDPR compliance
- User can delete account (soft delete `users` record)

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/auth/signup/customer` | 5 attempts | 15 min |
| `POST /api/auth/login` | 5 attempts | 15 min |
| `POST /api/customer/link-booking` | 10 attempts | 60 min |

---

## Success Metrics

### UX Metrics (Track After Launch)
- **Guest booking completion rate:** Target 90%+
- **Post-booking signup conversion:** Target 15-25%
- **Pre-booking signup rate:** Target 5-10%
- **Signup abandonment rate:** Target <20%
- **Time to complete signup:** Target <30 seconds

### Technical Metrics
- **API response time:** <200ms for auth endpoints
- **JWT refresh success rate:** >99%
- **Failed login rate:** <5% (excluding bad credentials)

---

## Acceptance Criteria

### Must Have (MVP)
- [x] Database schema supports email OR phone (at least one required)
- [ ] Signup API accepts email OR phone OR both
- [ ] Login API accepts email or phone as identifier
- [ ] Guest bookings can be linked to customer accounts
- [ ] Customer dashboard shows all bookings (guest → linked + direct bookings)
- [ ] Email verification skipped for debugging (TODO comment added)
- [ ] Post-booking signup prompt appears after guest booking
- [ ] Booking flow auto-fills contact info for logged-in customers

### Should Have (Near Future)
- [ ] Email verification flow implemented (post-debugging)
- [ ] Phone verification flow implemented
- [ ] Password reset flow
- [ ] Account settings page (update email, phone, password)
- [ ] Delete account functionality

### Nice to Have (Future)
- [ ] OAuth social login (Google, Apple)
- [ ] Magic link passwordless login
- [ ] Two-factor authentication (2FA)
- [ ] Biometric login (mobile apps)

---

## Migration Script

### File: `src/db/migrations/018_customer_auth_flexible_contact.sql`

```sql
-- Migration 018: Customer auth with flexible contact methods
-- Allows customer accounts with email OR phone (at least one required)
-- Supports frictionless signup UX

BEGIN;

-- Make email nullable (allow phone-only accounts)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Add constraint: at least one contact method required
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_contact_check;
ALTER TABLE users ADD CONSTRAINT users_contact_check
  CHECK (
    (email IS NOT NULL AND email != '') OR
    (phone IS NOT NULL AND phone != '')
  );

-- Drop old unique email index (did not handle nulls properly)
DROP INDEX IF EXISTS users_email_unique_idx;

-- Recreate unique email index (allows NULLs, case-insensitive)
CREATE UNIQUE INDEX users_email_unique_idx ON users(LOWER(email))
  WHERE deleted_at IS NULL AND email IS NOT NULL;

-- Add unique phone index (allows NULLs, case-insensitive)
DROP INDEX IF EXISTS users_phone_unique_idx;
CREATE UNIQUE INDEX users_phone_unique_idx ON users(LOWER(phone))
  WHERE deleted_at IS NULL AND phone IS NOT NULL;

-- Add comment for documentation
COMMENT ON CONSTRAINT users_contact_check ON users IS
  'Ensures at least one contact method (email or phone) is provided for customer accounts';

COMMIT;
```

### Rollback Script

```sql
BEGIN;

-- Restore email as required (WARNING: may fail if phone-only accounts exist)
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- Remove contact check constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_contact_check;

-- Remove phone unique index
DROP INDEX IF EXISTS users_phone_unique_idx;

-- Restore original email unique index (simpler version)
DROP INDEX IF EXISTS users_email_unique_idx;
CREATE UNIQUE INDEX users_email_unique_idx ON users(email)
  WHERE deleted_at IS NULL;

COMMIT;
```

---

## References

- **Step 7q:** Guest Booking Management (existing guest booking system)
- **AUTH_IMPLEMENTATION.md:** Existing owner auth system (reuse JWT logic)
- **DATABASE_SCHEMA.md:** Users table schema
- **CUSTOMER_BOOKING_FLOW.md:** Public booking flow integration

---

**End of Document**
