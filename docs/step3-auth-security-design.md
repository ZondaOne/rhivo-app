# Step 3: Auth and Security Design

## Objectives
- Define separate authentication flows for business owners and customers
- Specify token lifecycle and ephemeral token provisioning
- Map JWT claims to Row-Level Security (RLS) policies
- Design guest booking token mechanism
- Ensure minimal privilege access for frontend-driven database operations

---

## 1. Authentication Flows

### 1.1 Owner Authentication Flow

**Use case**: Business owners and staff managing appointments, services, and business configuration.

**Flow**:
1. **Signup**:
   - Owner navigates to `app.rhivo.app/signup`
   - Provides: email, password, business name, business contact info (address, phone), timezone
   - System validates input and creates:
     - `user` record (role: `owner`, email verified = false)
     - `business` record linked to user
     - Sends email verification link with short-lived token (24h TTL)
   - User clicks verification link → email verified, account activated

2. **Login**:
   - Owner navigates to `app.rhivo.app/login`
   - Provides: email, password
   - System validates credentials
   - Issues JWT with claims:
     ```json
     {
       "sub": "user_uuid",
       "role": "owner",
       "business_id": "business_uuid",
       "exp": 3600,
       "iat": <timestamp>
     }
     ```
   - JWT valid for 1 hour; refresh token valid for 30 days (stored in httpOnly cookie)

3. **Token Refresh**:
   - Before JWT expires, client calls `/auth/refresh` with refresh token
   - System validates refresh token, issues new JWT
   - Refresh token rotated on each use (detect replay attacks)

4. **MFA (optional phase 2)**:
   - TOTP or SMS-based second factor after password validation

**Security notes**:
- Password: bcrypt with cost factor 12
- Email verification required before dashboard access
- Refresh tokens stored hashed in DB with device fingerprint
- Logout invalidates refresh token immediately

---

### 1.2 Customer Authentication Flow

**Use case**: Returning customers managing their appointments.

**Flow**:
1. **Optional Signup**:
   - Customer navigates to `<tenant>.rhivo.app` and selects "Create Account" (optional)
   - Provides: email, password, phone (optional), name
   - System creates `user` record (role: `customer`)
   - Sends email verification link (24h TTL)
   - After verification, customer can log in to view/manage bookings

2. **Login**:
   - Customer provides: email, password
   - System validates credentials
   - Issues JWT with claims:
     ```json
     {
       "sub": "user_uuid",
       "role": "customer",
       "email": "user@example.com",
       "exp": 3600,
       "iat": <timestamp>
     }
     ```
   - JWT valid for 1 hour; refresh token valid for 30 days

3. **Guest Booking (no account required)**:
   - See section 1.3 below

**Security notes**:
- Customers scoped to their own appointments only (enforced via RLS)
- No cross-tenant access possible

---

### 1.3 Guest Booking Token Design

**Use case**: Allow booking without creating an account; issue a short-lived token tied to a single appointment.

**Flow**:
1. Guest completes booking form (email, phone if required, name)
2. System creates:
   - Lightweight `customer` record (role: `guest`, no password)
   - `appointment` record linked to customer
   - **Guest token**: secure random string (32 bytes, base64url encoded), stored hashed in `appointment.guest_token_hash`
3. Confirmation email sent with:
   - Appointment details
   - Cancellation link: `https://<tenant>.rhivo.app/cancel/<appointment_id>?token=<guest_token>`
   - Reschedule link: `https://<tenant>.rhivo.app/reschedule/<appointment_id>?token=<guest_token>`
4. When guest clicks link:
   - System validates `appointment_id` + `guest_token` hash match
   - If valid, allow cancellation or reschedule (single-use or time-limited, e.g., 48h before appointment)
   - After action, token invalidated (set `guest_token_hash` to null)

**Token TTL**:
- Token valid until appointment time + 24 hours (for post-appointment feedback/actions)
- Expired tokens return 403 Forbidden

**Security notes**:
- Token is single-use for destructive actions (cancel)
- Token stored hashed (SHA-256)
- Rate limit validation endpoint to prevent brute force (10 attempts per IP per hour)

---

## 2. Token Lifecycle and Management

### 2.1 JWT Structure

**Owner JWT payload**:
```json
{
  "sub": "user_uuid",
  "role": "owner",
  "business_id": "business_uuid",
  "permissions": ["read:appointments", "write:appointments", "admin:business"],
  "exp": <timestamp>,
  "iat": <timestamp>,
  "jti": "unique_token_id"
}
```

**Customer JWT payload**:
```json
{
  "sub": "user_uuid",
  "role": "customer",
  "email": "user@example.com",
  "exp": <timestamp>,
  "iat": <timestamp>,
  "jti": "unique_token_id"
}
```

**Guest token (not JWT)**:
- Opaque random token (32 bytes), tied to single appointment
- Passed as query param, validated against hashed value in DB

### 2.2 Token Issuance Mechanism

**Option A: Serverless Auth Function (Recommended)**
- Minimal trusted function (e.g., Vercel Edge Function, Cloudflare Worker)
- Validates credentials against DB
- Issues signed JWT with private key (RS256 or HS256)
- Returns JWT + refresh token to client
- **Why**: Keep signing keys server-side; frontend never sees secrets

**Option B: Frontend-driven with NeonDB JWT Extension (If Available)**
- Use Neon's native JWT issuance (if supported)
- Frontend calls auth endpoint with credentials
- Neon validates and issues JWT scoped to user
- **Risk**: Depends on Neon's auth capabilities; less control over claims

**Chosen approach**: Option A (serverless function for auth issuance)

### 2.3 Token Refresh Strategy

- Access token (JWT): 1 hour TTL
- Refresh token: 30 days TTL, stored in httpOnly secure cookie
- Refresh endpoint: `/auth/refresh`
  - Validates refresh token (check hash in DB, not revoked, not expired)
  - Issues new JWT
  - Rotates refresh token (delete old, issue new)
  - Detect replay: if old refresh token used again, revoke all sessions for user

### 2.4 Token Revocation

**Scenarios**:
- User logs out: delete refresh token from DB
- Password change: revoke all refresh tokens for user
- Security incident: admin revokes all tokens for user

**Implementation**:
- Maintain `refresh_tokens` table:
  ```
  id, user_id, token_hash, device_fingerprint, issued_at, expires_at, revoked_at
  ```
- On logout or revocation, set `revoked_at` timestamp
- JWT validation checks `jti` against revocation list (cache in Redis/memory for 1h)

---

## 3. Row-Level Security (RLS) Claim Mapping

### 3.1 RLS Policies Overview

NeonDB (Postgres) RLS policies enforce data isolation. JWT claims are extracted and used in policies.

**Policy goals**:
- Owners can only access appointments/services for their `business_id`
- Customers can only access their own appointments (by `customer_id` or email)
- Guests can access only via valid guest token (no direct DB query; mediated by app logic)
- No cross-tenant data leakage

### 3.2 RLS Policy Examples

**Policy: Owners access appointments**
```sql
CREATE POLICY owner_appointments_policy ON appointments
  FOR ALL
  USING (
    business_id = current_setting('jwt.claims.business_id')::uuid
    AND current_setting('jwt.claims.role') = 'owner'
  );
```

**Policy: Customers access their appointments**
```sql
CREATE POLICY customer_appointments_policy ON appointments
  FOR SELECT
  USING (
    customer_id = current_setting('jwt.claims.sub')::uuid
    AND current_setting('jwt.claims.role') = 'customer'
  );
```

**Policy: Owners manage their business data**
```sql
CREATE POLICY owner_business_policy ON businesses
  FOR ALL
  USING (
    id = current_setting('jwt.claims.business_id')::uuid
    AND current_setting('jwt.claims.role') = 'owner'
  );
```

**Policy: Public read for services (booking page)**
```sql
CREATE POLICY public_services_policy ON services
  FOR SELECT
  USING (true);  -- All users can read services for booking UI
```

**Policy: Prevent writes from public/customers to business config**
```sql
CREATE POLICY customer_no_write_business ON businesses
  FOR INSERT, UPDATE, DELETE
  USING (false)  -- Customers cannot modify business data
  WITH CHECK (false);
```

### 3.3 JWT Claims to RLS Mapping

| JWT Claim       | RLS Setting Variable             | Usage                                  |
|-----------------|----------------------------------|----------------------------------------|
| `sub`           | `jwt.claims.sub`                 | User UUID for ownership checks         |
| `role`          | `jwt.claims.role`                | Role-based policy activation           |
| `business_id`   | `jwt.claims.business_id`         | Tenant isolation for owners            |
| `email`         | `jwt.claims.email`               | Fallback for customer identification   |

**Setting claims in Postgres session**:
When frontend connects to NeonDB, it must set session variables:
```sql
SET LOCAL jwt.claims.sub = '<user_uuid>';
SET LOCAL jwt.claims.role = '<role>';
SET LOCAL jwt.claims.business_id = '<business_uuid>';
```

**Frontend driver integration**:
- Use connection pool with transaction-scoped setting injection
- Example (pseudocode):
  ```js
  const db = neon(connectionString);
  await db.transaction(async (tx) => {
    await tx.execute(`SET LOCAL jwt.claims.sub = '${claims.sub}'`);
    await tx.execute(`SET LOCAL jwt.claims.role = '${claims.role}'`);
    await tx.execute(`SET LOCAL jwt.claims.business_id = '${claims.business_id}'`);
    // Now execute queries; RLS policies enforce isolation
    const appointments = await tx.query('SELECT * FROM appointments');
  });
  ```

---

## 4. Minimal Privilege for Frontend DB Operations

### 4.1 Database Roles

Create separate Postgres roles with minimal privileges:

**Role: `rhivo_owner`**
- Grants: SELECT, INSERT, UPDATE, DELETE on `appointments`, `services`, `categories`, `businesses`, `reservation_tokens`
- No DROP, ALTER, or admin privileges
- Enforced by RLS policies (business_id match)

**Role: `rhivo_customer`**
- Grants: SELECT, INSERT on `appointments` (own appointments only via RLS)
- SELECT on `services`, `categories`, `availability` (read-only for booking UI)
- No UPDATE or DELETE (except via application-mediated cancel flow)

**Role: `rhivo_public`**
- Grants: SELECT on `services`, `categories`, `businesses` (public booking page data)
- INSERT on `reservation_tokens` (temporary slot holds)
- INSERT on `appointments` (guest bookings)
- No UPDATE or DELETE
- No access to `users`, `audit_log`, `notification_log`

**Role assignment**:
- Frontend connections use ephemeral tokens tied to role
- Token provider (serverless auth function) issues Neon-compatible credentials with role claim

### 4.2 Ephemeral Token Provisioning

**Challenge**: Frontend needs DB credentials without embedding long-lived secrets.

**Solution: Token Exchange Service**

1. **Auth function issues short-lived DB token**:
   - After user login, auth function calls Neon API (if supported) or internal token service
   - Request: "Issue DB token for role `rhivo_owner`, scoped to `business_id=<uuid>`, TTL=1h"
   - Response: Neon connection string with ephemeral credentials

2. **Frontend stores token**:
   - Token stored in memory (not localStorage; XSS risk)
   - Used for DB connection pool initialization
   - Refreshed alongside JWT refresh

3. **Fallback: Trusted Proxy**:
   - If Neon does not support ephemeral tokens, use serverless function as DB proxy:
     - Frontend calls `/api/query` with JWT
     - Proxy validates JWT, extracts claims, sets RLS session vars, executes query
     - Proxy holds long-lived DB credentials (never exposed to frontend)
   - **Trade-off**: Adds latency, but preserves security

**Chosen approach**: Trusted proxy for critical operations (reservation commits, booking finalization); direct frontend access for read-only queries (services, availability).

---

## 5. Security Controls Checklist

### 5.1 Authentication
- [ ] Passwords hashed with bcrypt (cost 12)
- [ ] Email verification required for owner accounts
- [ ] Refresh token rotation on each use
- [ ] Logout invalidates refresh tokens immediately
- [ ] Rate limiting on login endpoint (5 attempts per 15 min per IP)
- [ ] Guest tokens hashed (SHA-256) and single-use

### 5.2 Authorization
- [ ] RLS policies enforce tenant isolation
- [ ] JWT claims validated and set in DB session
- [ ] Minimal role privileges defined
- [ ] No direct DB credentials in frontend code
- [ ] Ephemeral tokens or trusted proxy for DB access

### 5.3 Transport & Storage
- [ ] TLS 1.3 for all connections (HTTPS only)
- [ ] httpOnly, secure cookies for refresh tokens
- [ ] JWT stored in memory (not localStorage)
- [ ] CSP headers prevent XSS: `default-src 'self'; script-src 'self'`
- [ ] CORS restricted to `*.rhivo.app` domains

### 5.4 Audit & Monitoring
- [ ] Audit log records all appointment state changes (actor, timestamp)
- [ ] Failed login attempts logged (detect brute force)
- [ ] RLS policy violations logged and alerted
- [ ] Token refresh anomalies (excessive refreshes) trigger alerts

---

## 6. Acceptance Criteria

### 6.1 Owner Authentication
- [ ] Owner can sign up, verify email, and log in to dashboard
- [ ] Owner JWT contains correct `business_id` claim
- [ ] Owner can only access appointments for their business (RLS enforced)
- [ ] Logout revokes refresh token; subsequent requests fail

### 6.2 Customer Authentication
- [ ] Customer can optionally create account and log in
- [ ] Customer JWT allows access only to their appointments
- [ ] Customer cannot read other customers' data (RLS enforced)

### 6.3 Guest Booking
- [ ] Guest can book without account
- [ ] Guest receives email with cancellation/reschedule link
- [ ] Token validates correctly and allows single-use action
- [ ] Expired or invalid tokens return 403 Forbidden
- [ ] Brute force attempts rate-limited

### 6.4 Security Invariants
- [ ] No plaintext passwords in DB
- [ ] No long-lived DB credentials in frontend code
- [ ] No cross-tenant data leakage in stress tests (100 concurrent users, mixed tenants)
- [ ] Token refresh replay detected and sessions revoked
- [ ] RLS policies tested and prevent unauthorized queries

---

## 7. Risks and Mitigations

| Risk                                      | Impact | Mitigation                                                                 |
|-------------------------------------------|--------|---------------------------------------------------------------------------|
| JWT signing key leaked                    | High   | Rotate keys immediately; detect via anomaly monitoring; short TTL limits damage |
| RLS policy misconfiguration               | High   | Automated tests for each policy; peer review before deploy; canary release |
| Guest token brute force                   | Medium | Rate limiting (10 attempts/hour/IP); token entropy (32 bytes = 2^256 space) |
| Refresh token stolen (XSS)                | High   | httpOnly cookies prevent JS access; CSP headers block inline scripts       |
| Frontend credentials exposed              | High   | Never embed long-lived creds; use ephemeral tokens or trusted proxy       |
| Neon DB direct access from compromised UI | High   | RLS policies as last line of defense; monitor query patterns for anomalies |

---

## 8. Implementation Checklist

### Phase 1: Core Auth (Week 1-2)
- [ ] Implement owner signup/login with email verification
- [ ] Implement JWT issuance (serverless function)
- [ ] Implement refresh token rotation
- [ ] Create DB roles (`rhivo_owner`, `rhivo_customer`, `rhivo_public`)
- [ ] Write RLS policies for `appointments`, `businesses`, `services`
- [ ] Test RLS policies in isolation

### Phase 2: Customer & Guest Auth (Week 2-3)
- [ ] Implement customer signup/login
- [ ] Implement guest booking token generation and validation
- [ ] Build cancellation/reschedule endpoints with token verification
- [ ] Add rate limiting to token validation endpoint

### Phase 3: Ephemeral Tokens (Week 3-4)
- [ ] Implement trusted proxy for critical DB operations
- [ ] Integrate frontend with token refresh flow
- [ ] Test token expiration and refresh edge cases

### Phase 4: Audit & Monitoring (Week 4)
- [ ] Implement audit log for auth events (login, logout, token refresh)
- [ ] Add monitoring for RLS violations and failed auth attempts
- [ ] Stress test: 100 concurrent logins, verify no cross-tenant leakage

---

## 9. Deliverables Summary

**Auth Spec**:
- Owner, customer, and guest authentication flows documented
- Token lifecycle (issuance, refresh, revocation) defined
- Guest token design with TTL and single-use semantics

**Token Issuance Flow**:
- Serverless auth function issues JWTs
- Ephemeral DB tokens via trusted proxy for sensitive operations
- Frontend never stores long-lived credentials

**RLS Claim Matrix**:
- JWT claims mapped to Postgres session variables
- RLS policies enforce tenant isolation and role-based access
- Public, customer, and owner roles defined with minimal privileges

**Acceptance**:
- Separation of roles (owner/customer/guest) documented and implemented
- Secure token lifecycle prevents replay attacks and cross-tenant access
- RLS policies tested and validated under concurrency