# Separated Authentication Architecture

**Last Updated:** 2025-10-19
**Status:** ✅ Implemented

---

## Overview

Rhivo implements **completely separated authentication systems** for business owners and customers. This ensures that:

1. **Owners can only access the dashboard** (`/dashboard`) - for managing their business
2. **Customers can only access customer features** (`/customer/dashboard`, `/book/*`) - for managing their bookings
3. **No mixed accounts** - a user is either an owner OR a customer, never both
4. **No business association for customers** - customers do NOT have a `business_id`

---

## Authentication Flows

### Owner Authentication Flow

```
Owner Login (/auth/login)
  ↓
Login API (/api/auth/login)
  ↓
Check role === 'owner' or 'staff'
  ↓
Generate JWT with business_id
  ↓
Redirect to /dashboard
  ↓
Protected by ProtectedRoute (requireRole="owner")
```

**Key Points:**
- Owners MUST have a `business_id` in the database
- JWT token includes `business_id` claim
- Can only access `/dashboard` and owner-specific routes
- If an owner tries to login via `/customer/login`, they get an error

### Customer Authentication Flow

```
Customer Login (/customer/login)
  ↓
Login API (/api/auth/login)
  ↓
Check role === 'customer'
  ↓
Generate JWT WITHOUT business_id
  ↓
Redirect to /customer/dashboard
  ↓
Protected by ProtectedRoute (requireRole="customer")
```

**Key Points:**
- Customers do NOT have a `business_id` (it's NULL in database)
- JWT token does NOT include `business_id` claim
- Can only access `/customer/dashboard` and customer-specific routes
- If a customer tries to login via `/auth/login`, they get an error

---

## Protected Routes

### Client-Side Protection

All sensitive pages use the `<ProtectedRoute>` component:

```tsx
// Owner Dashboard
<ProtectedRoute requireRole="owner">
  <DashboardContent />
</ProtectedRoute>

// Customer Dashboard
<ProtectedRoute requireRole="customer">
  <CustomerDashboardContent />
</ProtectedRoute>
```

**How it works:**
1. Checks authentication status via `useAuth()`
2. Checks user role matches required role
3. Redirects to appropriate login page if not authenticated
4. Redirects to appropriate dashboard if wrong role

**Redirect Logic:**
- Owner trying to access customer route → Redirect to `/dashboard`
- Customer trying to access owner route → Redirect to `/customer/dashboard`
- Unauthenticated user trying to access owner route → Redirect to `/auth/login`
- Unauthenticated user trying to access customer route → Redirect to `/customer/login`

### API Protection

API endpoints use the `withAuth()` middleware:

```typescript
// Owner-only endpoint
export const GET = withAuth(
  async (request, context) => {
    // Handler
  },
  { requireRole: ['owner', 'staff'] }
);

// Customer-only endpoint
export const GET = withAuth(
  async (request, context) => {
    // Handler
  },
  { requireRole: ['customer'] }
);
```

---

## Login Pages

### Owner Login: `/auth/login`

- **Purpose:** Business owners and staff login
- **Accepts:** Email + password
- **Validates:** `role` must be `'owner'` or `'staff'`
- **Redirects to:** `/dashboard` (or `/auth/change-password` if required)
- **Link to customer login:** "Are you a customer? Sign in here" → `/customer/login`

### Customer Login: `/customer/login`

- **Purpose:** Customer login
- **Accepts:** Email or phone + password
- **Validates:** `role` must be `'customer'`
- **Redirects to:** `/customer/dashboard`
- **Link to owner login:** "Are you a business owner? Sign in here" → `/auth/login`

---

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT,  -- nullable for phone-only customers
  phone TEXT,  -- nullable for email-only customers
  name TEXT,
  role user_role NOT NULL,  -- 'owner', 'staff', or 'customer'
  business_id UUID,  -- NULL for customers, required for owners/staff
  password_hash TEXT,
  email_verified BOOLEAN DEFAULT false,
  requires_password_change BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT users_contact_check CHECK (email IS NOT NULL OR phone IS NOT NULL),
  CONSTRAINT users_role_business_check CHECK (
    (role = 'customer' AND business_id IS NULL) OR
    (role IN ('owner', 'staff') AND business_id IS NOT NULL)
  )
);
```

**Key Constraints:**
1. Customers MUST have `business_id = NULL`
2. Owners/staff MUST have a valid `business_id`
3. At least one contact method (email OR phone) required

---

## JWT Token Claims

### Owner/Staff Token

```json
{
  "sub": "user-uuid",
  "role": "owner",
  "business_id": "business-uuid",
  "email": "owner@example.com",
  "iat": 1234567890,
  "exp": 1234571490
}
```

### Customer Token

```json
{
  "sub": "user-uuid",
  "role": "customer",
  "email": "customer@example.com",
  "iat": 1234567890,
  "exp": 1234571490
}
```

**Note:** `business_id` is **excluded** from customer tokens.

---

## API Endpoint Changes

### Login Endpoint: `/api/auth/login`

**Changes:**
- Only includes `business_id` in JWT if `role !== 'customer'`
- Only includes `business_id` in response user object if `role !== 'customer'`

```typescript
// Generate tokens
const accessToken = generateAccessToken({
  sub: user.id,
  role: user.role,
  business_id: user.role !== 'customer' ? user.business_id : undefined,
  email: user.email,
});

// Response
{
  user: {
    id: user.id,
    email: user.email,
    role: user.role,
    ...(user.role !== 'customer' && { business_id: user.business_id }),
  }
}
```

### Refresh Endpoint: `/api/auth/refresh`

**Changes:**
- Same logic as login - excludes `business_id` for customers
- Ensures refreshed tokens maintain role separation

---

## Testing Scenarios

### ✅ Scenario 1: Owner Login → Dashboard

1. Owner logs in via `/auth/login`
2. JWT includes `business_id`
3. Redirected to `/dashboard`
4. Can access all owner features
5. **Cannot** access `/customer/dashboard` (redirected back to `/dashboard`)

### ✅ Scenario 2: Customer Login → Customer Dashboard

1. Customer logs in via `/customer/login`
2. JWT does NOT include `business_id`
3. Redirected to `/customer/dashboard`
4. Can view and manage their bookings
5. **Cannot** access `/dashboard` (redirected to `/customer/dashboard`)

### ✅ Scenario 3: Customer Tries Owner Login

1. Customer enters credentials at `/auth/login`
2. Login succeeds (credentials valid)
3. System detects `role === 'customer'`
4. Error message: "This login is for business owners only"
5. Auto-redirected to `/customer/login` after 2 seconds

### ✅ Scenario 4: Owner Tries Customer Login

1. Owner enters credentials at `/customer/login`
2. Login succeeds (credentials valid)
3. System detects `role === 'owner'`
4. Error message: "This login is for customers only"
5. Remains on customer login page

### ✅ Scenario 5: Customer Signup

1. Customer signs up via `/customer/signup`
2. Account created with:
   - `role = 'customer'`
   - `business_id = NULL`
   - Email OR phone (at least one required)
3. Guest bookings auto-linked if email/phone match
4. Can immediately login via `/customer/login`

### ✅ Scenario 6: Owner Signup

1. Owner signs up via `/auth/signup` or `/onboard`
2. Account created with:
   - `role = 'owner'`
   - `business_id = <newly created business>`
   - Email required
3. Can login via `/auth/login` after email verification

---

## Security Benefits

1. **No privilege escalation:** Customers can never access owner dashboard
2. **Clear separation of concerns:** Owner and customer code paths are isolated
3. **Token integrity:** JWTs only contain role-appropriate claims
4. **Database constraints:** PostgreSQL enforces role-business relationship
5. **Defense in depth:** Protection at client, server, and database levels

---

## Migration Impact

**No data loss:**
- Existing owner accounts continue to work (have `business_id`)
- Existing customer accounts continue to work (have `business_id = NULL`)

**Breaking changes:**
- None - auth logic is additive/protective only

---

## Future Enhancements

- [ ] Add 2FA for owner accounts
- [ ] Add social login (Google, Apple) for customers
- [ ] Add magic link login for customers (passwordless)
- [ ] Add session management UI (view/revoke active sessions)
- [ ] Add audit logs for role-based access attempts

---

## Troubleshooting

### Issue: "I can't access the dashboard after logging in"

**Solution:** Check your account role:
```sql
SELECT role, business_id FROM users WHERE email = 'your@email.com';
```

- If `role = 'customer'`, you should use `/customer/dashboard` instead
- If `role = 'owner'` but `business_id IS NULL`, contact support

### Issue: "Customer seeing mock business on dashboard"

**Cause:** Customer account incorrectly has a `business_id`

**Solution:**
```sql
-- Remove business_id from customer account
UPDATE users
SET business_id = NULL
WHERE role = 'customer' AND id = '<customer-user-id>';
```

### Issue: "Token doesn't include business_id"

**Expected behavior:**
- Owner/staff tokens **should** include `business_id`
- Customer tokens **should NOT** include `business_id`

**Verify:**
```typescript
// Decode JWT at https://jwt.io
// Owner token should have: { role: 'owner', business_id: '...' }
// Customer token should have: { role: 'customer' } (no business_id)
```

---

## Code References

- **Route Protection:** `src/components/auth/ProtectedRoute.tsx:1`
- **Owner Dashboard:** `app/dashboard/page.tsx:350`
- **Customer Dashboard:** `app/customer/dashboard/page.tsx:463`
- **Login Route:** `app/api/auth/login/route.ts:81`
- **Refresh Route:** `app/api/auth/refresh/route.ts:89`
- **Auth Middleware:** `src/middleware/auth.ts:1`

---

**End of Document**
