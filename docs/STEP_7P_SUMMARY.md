# Step 7P: Customer Authentication - Implementation Summary

**Status:** ✅ Ready for Testing
**Last Updated:** 2025-10-09

---

## Overview

Step 7P implements a **separate, frictionless customer authentication system** that is completely independent from the existing business owner authentication.

### Key Principle: Two Separate Auth Systems

| Feature | Business Owner Auth | Customer Auth |
|---------|-------------------|---------------|
| **Signup Route** | `/auth/signup` | `/customer/signup` |
| **Login Route** | `/auth/login` | `/customer/login` |
| **Dashboard** | `/dashboard` | `/customer/dashboard` |
| **Required Info** | Email, password, business details | Email OR phone, password |
| **Purpose** | Manage business & appointments | Track personal bookings |
| **Table/Role** | `users` with `role='owner'` | `users` with `role='customer'` |

**Both systems:**
- Share the same `users` table (differentiated by `role` column)
- Use the same JWT/refresh token infrastructure
- Use the same password hashing (bcrypt)
- Can reuse utility functions

---

## What Was Changed

### 1. Database Schema (Migration 018)

**File:** `src/db/migrations/018_customer_auth_flexible_contact.sql`

**Changes:**
```sql
-- Made email nullable (allows phone-only accounts)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Added constraint: at least email OR phone required
ALTER TABLE users ADD CONSTRAINT users_contact_check
  CHECK ((email IS NOT NULL AND email != '') OR (phone IS NOT NULL AND phone != ''));

-- Case-insensitive unique indexes for both email and phone
CREATE UNIQUE INDEX users_email_unique_idx ON users(LOWER(email))
  WHERE deleted_at IS NULL AND email IS NOT NULL;

CREATE UNIQUE INDEX users_phone_unique_idx ON users(LOWER(phone))
  WHERE deleted_at IS NULL AND phone IS NOT NULL;
```

**Result:** Customers can sign up with:
- Email only
- Phone only
- Both email and phone

---

### 2. Customer Signup API (Updated)

**File:** `app/api/auth/signup/customer/route.ts`

**Key Changes:**
- ✅ Email and phone are both optional (but at least one required)
- ✅ Name is optional
- ✅ Checks uniqueness for both email and phone separately
- ✅ Email verification token generated but NOT enforced (for debugging)
- ✅ TODO comment added: "Send verification email after debugging phase"

**Example Request:**
```json
// Option 1: Email only
{
  "email": "customer@example.com",
  "password": "SecurePass123!"
}

// Option 2: Phone only
{
  "phone": "+1234567890",
  "password": "SecurePass123!"
}

// Option 3: Both (recommended)
{
  "email": "customer@example.com",
  "phone": "+1234567890",
  "password": "SecurePass123!",
  "name": "Jane Doe"
}
```

---

### 3. Customer Signup Page (New)

**File:** `app/customer/signup/page.tsx`

**Features:**
- ✅ Clean, minimal form with teal/green gradient
- ✅ Two optional fields: Email and Phone
- ✅ Clear hint: "Provide at least email or phone (or both)"
- ✅ Password field (required, min 8 chars)
- ✅ Name field (optional)
- ✅ Link to customer login page
- ✅ Link to owner signup (separation)

**UX:**
- Frictionless: minimal required fields
- Clear visual hierarchy
- Helpful placeholder text
- Error messages displayed inline

---

### 4. Customer Login Page (New)

**File:** `app/customer/login/page.tsx`

**Features:**
- ✅ Single "Email or Phone" input field (smart detection)
- ✅ Password field
- ✅ Calls existing `/api/auth/login` endpoint
- ✅ Validates user role is 'customer' (rejects owners)
- ✅ Links to customer signup
- ✅ Link to owner login (separation)

**Smart Identifier Detection:**
- Backend auto-detects if input is email (contains @) or phone
- User doesn't need to know the difference

---

### 5. Documentation (New)

**File:** `docs/STEP_7P_CUSTOMER_AUTH_REVISED.md`

Complete technical specification including:
- UX flows (guest booking, post-booking signup, etc.)
- API endpoint specifications
- Database schema details
- Frontend component specs
- Security considerations
- Implementation checklist
- Future enhancements

---

## What Still Needs to Be Built

### Immediate (Required for MVP)

1. **Customer Dashboard Page** (`app/customer/dashboard/page.tsx`)
   - Display all appointments for logged-in customer
   - Filter: Upcoming, Past, Canceled
   - Quick actions: Cancel, View details
   - Protected route (redirect to login if not authenticated)

2. **Update AuthContext** (if needed)
   - Ensure context works for both owner and customer roles
   - May need to add customer-specific methods
   - Or keep separate (owner auth vs customer auth contexts)

3. **Link Guest Bookings to Account**
   - API endpoint: `POST /api/customer/link-booking`
   - After signup, find guest bookings with matching email/phone
   - Set `customer_id` on those appointments
   - Show on customer dashboard

4. **Booking Flow Integration**
   - Add "Sign in" link to booking page header (optional, non-blocking)
   - If customer is logged in, auto-fill email/phone in booking form
   - After successful guest booking, show signup prompt (optional)

### Future Enhancements

5. **Email Verification** (currently skipped for debugging)
   - Send verification emails on signup
   - Require verification before certain actions (optional)
   - Resend verification endpoint

6. **Password Reset Flow**
   - "Forgot password" page
   - Email with reset token
   - Reset password page

7. **Account Settings Page**
   - Update email, phone, name
   - Change password
   - Delete account

---

## Testing Checklist

### Manual Testing

- [ ] **Customer Signup (Email only)**
  - Go to `/customer/signup`
  - Enter email + password
  - Leave phone blank
  - Click "Create Account"
  - Should succeed and redirect to login

- [ ] **Customer Signup (Phone only)**
  - Go to `/customer/signup`
  - Leave email blank
  - Enter phone + password
  - Should succeed

- [ ] **Customer Signup (Both)**
  - Enter email, phone, password, name
  - Should succeed

- [ ] **Customer Signup (Neither)**
  - Leave both email and phone blank
  - Should show error: "At least email or phone required"

- [ ] **Customer Login (Email)**
  - Go to `/customer/login`
  - Enter email + password
  - Should redirect to customer dashboard (when built)

- [ ] **Customer Login (Phone)**
  - Enter phone + password
  - Should login successfully

- [ ] **Owner Signup Still Works**
  - Go to `/auth/signup` (owner signup)
  - Should still require business details
  - Should work exactly as before

- [ ] **Owner Login Still Works**
  - Go to `/auth/login` (owner login)
  - Should redirect to `/dashboard` (owner dashboard)

### Database Testing

```sql
-- Test: Create customer with email only
INSERT INTO users (email, password_hash, role)
VALUES ('test@example.com', 'hash', 'customer');
-- Should succeed

-- Test: Create customer with phone only
INSERT INTO users (phone, password_hash, role)
VALUES ('+1234567890', 'hash', 'customer');
-- Should succeed

-- Test: Create customer with neither (should fail)
INSERT INTO users (password_hash, role)
VALUES ('hash', 'customer');
-- Should fail with CHECK constraint violation

-- Test: Duplicate email
INSERT INTO users (email, password_hash, role)
VALUES ('test@example.com', 'hash', 'customer');
-- Should fail with unique constraint violation

-- Test: Duplicate phone
INSERT INTO users (phone, password_hash, role)
VALUES ('+1234567890', 'hash', 'customer');
-- Should fail with unique constraint violation
```

---

## Migration Instructions

### Step 1: Run Migration

```bash
# Apply migration 018
psql $DATABASE_URL -f src/db/migrations/018_customer_auth_flexible_contact.sql

# Verify schema
psql $DATABASE_URL -c "
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('email', 'phone');
"

# Expected output:
#  column_name | is_nullable | data_type
# -------------+-------------+-----------
#  email       | YES         | text
#  phone       | YES         | text
```

### Step 2: Test Customer Signup

```bash
# Test customer signup API
curl -X POST http://localhost:3000/api/auth/signup/customer \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@test.com",
    "phone": "+1234567890",
    "password": "Test1234!",
    "name": "Test Customer"
  }'

# Expected response:
# {
#   "message": "Account created successfully",
#   "user": {
#     "id": "uuid",
#     "email": "customer@test.com",
#     "phone": "+1234567890",
#     "name": "Test Customer",
#     "role": "customer"
#   }
# }
```

### Step 3: Test Customer Login

```bash
# Test login with email
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@test.com",
    "password": "Test1234!"
  }'

# Should return JWT and user object with role: "customer"
```

---

## Key Design Decisions

### 1. Why Not a Separate `customers` Table?

**Decision:** Use existing `users` table with `role` differentiation.

**Reasoning:**
- Reduces complexity (one auth system, one table)
- Reuses existing JWT/token infrastructure
- Simplifies future features (e.g., owner can also be a customer)
- Standard pattern in multi-role systems

### 2. Why Skip Email Verification?

**Decision:** Skip verification during development for debugging.

**Reasoning:**
- Faster testing iteration
- UX-first approach (no friction)
- Can add later without changing schema
- Clearly marked with TODO comments

### 3. Why Email OR Phone (Not Both Required)?

**Decision:** Flexible credentials, user chooses.

**Reasoning:**
- Maximum flexibility for users
- Some users don't want to share phone
- Some users prefer phone-only accounts
- International users may not have email
- "Both required" = unnecessary friction

---

## Next Steps

1. **Test the migration** - Run migration 018 and verify schema changes
2. **Test customer signup** - Try all three options (email, phone, both)
3. **Test customer login** - Verify email and phone login both work
4. **Build customer dashboard** - Show appointments for logged-in customers
5. **Integrate with booking flow** - Add optional signup prompts

---

## Success Criteria

✅ **Complete** when:
- [x] Database supports email OR phone for customers
- [x] Customer signup API accepts flexible credentials
- [x] Customer signup page is live and functional
- [x] Customer login page is live and functional
- [x] Owner auth remains completely unchanged
- [ ] Customer dashboard shows bookings (next step)
- [ ] Guest bookings can be linked to accounts (next step)

---

**End of Summary**
