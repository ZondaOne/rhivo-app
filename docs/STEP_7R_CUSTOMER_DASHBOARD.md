# Step 7r: Customer Dashboard with Booking Management

**Status:** ✅ Complete
**Last Updated:** 2025-10-09
**Priority:** High

---

## Overview

This document describes the customer dashboard implementation that allows authenticated customers to view, manage, cancel, and reschedule their appointments. The dashboard provides a clean interface for customers to track their booking history and take actions on their appointments.

### Design Philosophy: Customer-Centric Experience

**Core Principles:**
- Simple, intuitive interface for viewing bookings
- Quick access to cancel and reschedule actions
- Clear status indicators and booking information
- Mobile-responsive design
- Secure JWT-based authentication

---

## Features Implemented

### 1. Customer Authentication
- JWT-based authentication (reuses existing auth system)
- Access token stored in localStorage
- Auto-redirect to login if token expired
- Separate customer login/signup pages

### 2. Appointments List View
- Filter tabs: Upcoming, Past, Canceled, All
- Color-coded service indicators
- Status badges (confirmed, canceled, completed, no_show)
- Booking ID display for reference
- Business name and service details
- Date/time and price display

### 3. Appointment Management
- **View Details:** Full appointment information
- **Cancel:** Cancel confirmed appointments with confirmation dialog
- **Reschedule:** Placeholder for future implementation (Step 7r task)
- **View Business:** Link to business booking page

### 4. Audit Logging
- All cancellation actions logged to `audit_logs` table
- Actor ID set to customer user ID
- Old state and new state captured as JSON

---

## API Endpoints

### 1. Get Customer Appointments

**Endpoint:** `GET /api/customer/appointments`

**Purpose:** Fetch all appointments for the authenticated customer with optional filtering.

**Authentication:** Bearer token (JWT) in `Authorization` header

**Query Parameters:**
- `status` (optional): Filter by appointment status (`confirmed`, `canceled`, `completed`, `no_show`)
- `upcoming` (optional): Boolean (`true`) to show only future appointments

**Request Example:**
```http
GET /api/customer/appointments?upcoming=true&status=confirmed
Authorization: Bearer eyJhbGc...
```

**Response (Success - 200):**
```json
{
  "success": true,
  "appointments": [
    {
      "id": "uuid",
      "bookingId": "RHIVO-A3K-9F2-7Q1",
      "businessName": "Wellness Spa",
      "subdomain": "wellness-spa",
      "serviceName": "Swedish Massage",
      "categoryName": "Massage Therapy",
      "startTime": "2025-10-15T10:00:00Z",
      "endTime": "2025-10-15T11:00:00Z",
      "duration": 60,
      "price": 8000,
      "status": "confirmed",
      "serviceColor": "#10b981",
      "createdAt": "2025-10-09T08:00:00Z"
    }
  ],
  "total": 1
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: User is not a customer
- `500 Internal Server Error`: Server error

**Security:**
- Verifies JWT token
- Checks user role is `customer`
- Only returns appointments where `customer_id` matches authenticated user

---

### 2. Get Appointment Details

**Endpoint:** `GET /api/customer/appointments/[id]`

**Purpose:** Get detailed information about a specific appointment.

**Authentication:** Bearer token (JWT)

**Request Example:**
```http
GET /api/customer/appointments/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer eyJhbGc...
```

**Response (Success - 200):**
```json
{
  "success": true,
  "appointment": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "bookingId": "RHIVO-A3K-9F2-7Q1",
    "startTime": "2025-10-15T10:00:00Z",
    "endTime": "2025-10-15T11:00:00Z",
    "status": "confirmed",
    "createdAt": "2025-10-09T08:00:00Z",
    "business": {
      "id": "uuid",
      "name": "Wellness Spa",
      "subdomain": "wellness-spa",
      "timezone": "America/New_York"
    },
    "service": {
      "id": "uuid",
      "name": "Swedish Massage",
      "categoryName": "Massage Therapy",
      "duration": 60,
      "price": 8000,
      "color": "#10b981"
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Customer doesn't own this appointment
- `404 Not Found`: Appointment not found
- `500 Internal Server Error`: Server error

---

### 3. Cancel Appointment

**Endpoint:** `POST /api/customer/appointments/[id]/cancel`

**Purpose:** Cancel a confirmed appointment. Creates audit log entry and releases the time slot.

**Authentication:** Bearer token (JWT)

**Request Example:**
```http
POST /api/customer/appointments/550e8400-e29b-41d4-a716-446655440000/cancel
Authorization: Bearer eyJhbGc...
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Appointment canceled successfully"
}
```

**Actions Performed:**
1. Verifies JWT and customer ownership
2. Checks appointment status is `confirmed`
3. Updates appointment status to `canceled`
4. Updates `updated_at` timestamp
5. Creates audit log entry with:
   - `action: 'canceled'`
   - `actor_id: <customer_id>`
   - `old_state: { status: 'confirmed', customer_id: '...' }`
   - `new_state: { status: 'canceled', canceled_by: 'customer', customer_id: '...' }`

**Error Responses:**
- `400 Bad Request`: Appointment cannot be canceled (wrong status)
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: Customer doesn't own this appointment
- `404 Not Found`: Appointment not found
- `500 Internal Server Error`: Server error

**TODO (Future Enhancements):**
- [ ] Check cancellation policy deadline (e.g., must cancel 24h in advance)
- [ ] Send notification email to customer (confirmation)
- [ ] Send notification email to business owner
- [ ] Release reservation slot (if applicable)

---

## Frontend Implementation

### Customer Dashboard Page

**File:** `app/customer/dashboard/page.tsx`

**Features:**
- **Protected Route:** Redirects to login if no access token found
- **Filter Tabs:** Switch between Upcoming, Past, Canceled, All
- **Loading States:** Skeleton/loading indicator while fetching
- **Empty States:** Helpful message when no appointments found
- **Error Handling:** Displays error messages with retry option
- **Action Buttons:** Cancel and Reschedule (reschedule disabled for now)
- **Sign Out:** Clear token and redirect to login

**Component Structure:**
```tsx
CustomerDashboardPage
├── Header (Title + Sign Out)
├── Filter Tabs (Upcoming, Past, Canceled, All)
├── Loading/Error/Empty States
└── Appointments List
    └── Appointment Card
        ├── Business Name + Status Badge
        ├── Service Name + Color Indicator
        ├── Date/Time + Booking ID
        ├── Price
        └── Action Buttons (Cancel, Reschedule, View Business)
```

**State Management:**
```tsx
const [appointments, setAppointments] = useState<Appointment[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [activeFilter, setActiveFilter] = useState<FilterTab>('upcoming');
const [cancelingId, setCancelingId] = useState<string | null>(null);
```

**Data Flow:**
1. On mount: Fetch appointments based on active filter
2. On filter change: Re-fetch appointments
3. On cancel: Confirm → API call → Refresh list
4. On token expiry: Redirect to login

---

### Customer Login Page

**File:** `app/customer/login/page.tsx`

**Features:**
- Email or phone input (flexible identifier)
- Password input
- Role verification (must be customer)
- **JWT Storage:** Stores `accessToken` in localStorage after login
- Auto-redirect to dashboard on success
- Error handling with user-friendly messages
- Links to signup and owner login

**Updated Login Flow:**
```typescript
// After successful login
if (data.user.role !== 'customer') {
  setError('This login is for customers only.');
  return;
}

// Store access token
localStorage.setItem('accessToken', data.accessToken);

// Redirect to dashboard
router.push('/customer/dashboard');
```

---

### Customer Signup Page

**File:** `app/customer/signup/page.tsx`

**Features:**
- Flexible contact input (email OR phone OR both)
- Password with strength requirements
- Optional name field
- **Auto-Login:** After successful signup, automatically logs in and redirects to dashboard
- Error handling and validation
- Links to login and owner signup

**Updated Signup Flow:**
```typescript
// After successful signup
const data = await signupResponse.json();

// Auto-login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({
    email: email || phone,
    password,
  }),
});

const loginData = await loginResponse.json();

if (loginResponse.ok && loginData.accessToken) {
  localStorage.setItem('accessToken', loginData.accessToken);
  router.push('/customer/dashboard');
}
```

---

## Database Schema

### Appointments Table (No Changes Required)

The existing `appointments` table already supports customer appointments:

| Column | Type | Purpose |
|--------|------|---------|
| `customer_id` | UUID | Foreign key to `users.id` (customer) |
| `status` | appointment_status | 'confirmed', 'canceled', 'completed', 'no_show' |
| `booking_id` | TEXT | Human-readable booking ID (RHIVO-XXX-XXX-XXX) |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### Audit Logs Table (No Changes Required)

The existing `audit_logs` table is used for tracking customer actions:

| Column | Type | Purpose |
|--------|------|---------|
| `appointment_id` | UUID | Related appointment |
| `actor_id` | UUID | Customer user ID (who canceled) |
| `action` | audit_action | 'canceled' |
| `old_state` | JSONB | Previous appointment state |
| `new_state` | JSONB | New appointment state with canceled_by info |
| `timestamp` | TIMESTAMPTZ | When action occurred |

---

## User Flows

### Flow 1: View Appointments

```
Customer navigates to /customer/dashboard
  → Check localStorage for accessToken
  → If missing: Redirect to /customer/login
  → If present: Fetch appointments from API
  → Display appointments grouped by filter (Upcoming, Past, Canceled)
  → Show loading state → Show appointments or empty state
```

### Flow 2: Cancel Appointment

```
Customer clicks "Cancel" button on appointment card
  → Confirmation dialog: "Are you sure?"
  → If confirmed:
    → POST /api/customer/appointments/[id]/cancel
    → Show loading state on button ("Canceling...")
    → On success:
      → Alert: "Appointment canceled successfully"
      → Refresh appointments list
    → On error:
      → Alert: Error message
      → Button returns to normal state
```

### Flow 3: Login Flow

```
Customer visits /customer/login
  → Enter email/phone + password
  → Submit form
  → POST /api/auth/login
  → On success:
    → Store accessToken in localStorage
    → Redirect to /customer/dashboard
  → On error:
    → Display error message
    → Allow retry
```

### Flow 4: Signup Flow (Auto-Login)

```
Customer visits /customer/signup
  → Enter contact info (email OR phone) + password
  → Submit form
  → POST /api/auth/signup/customer
  → On success:
    → Automatically call POST /api/auth/login
    → Store accessToken in localStorage
    → Redirect to /customer/dashboard (no manual login needed)
  → On error:
    → Display error message
```

---

## Security Considerations

### Authentication
- ✅ JWT-based authentication (1h expiration)
- ✅ Bearer token in Authorization header
- ✅ Token verification on every API request
- ✅ Role verification (must be customer)
- ✅ Auto-redirect to login on token expiry

### Authorization
- ✅ Customer can only view/cancel their own appointments
- ✅ Ownership check: `appointment.customer_id === payload.sub`
- ✅ Prevents cross-customer access

### Audit Trail
- ✅ All cancellations logged with actor_id
- ✅ Old state and new state captured
- ✅ Timestamp recorded
- ✅ Immutable audit log (no updates/deletes)

### Rate Limiting
- ⚠️ TODO: Add rate limiting on cancel endpoint
- ⚠️ TODO: Prevent abuse (e.g., 5 cancellations per hour)

---

## Testing Checklist

### Manual Testing

**Prerequisites:**
- [ ] Create test customer account via `/customer/signup`
- [ ] Create test appointments (via guest booking or owner dashboard)
- [ ] Link guest bookings to customer account (if needed)

**Dashboard Tests:**
- [ ] Navigate to `/customer/dashboard` without login → redirected to login
- [ ] Log in as customer → redirected to dashboard
- [ ] Dashboard shows appointments correctly
- [ ] Filter tabs work (Upcoming, Past, Canceled, All)
- [ ] Empty state shows when no appointments
- [ ] Loading state shows during fetch
- [ ] Error state shows on API failure

**Cancellation Tests:**
- [ ] Click "Cancel" on confirmed appointment → confirmation dialog appears
- [ ] Confirm cancellation → appointment status updates to "canceled"
- [ ] Canceled appointment moves to "Canceled" tab
- [ ] Audit log entry created with correct actor_id
- [ ] Cannot cancel already-canceled appointment
- [ ] Cannot cancel past appointment (button should be hidden)

**Authentication Tests:**
- [ ] Signup creates account and auto-logs in
- [ ] Login stores accessToken and redirects to dashboard
- [ ] Sign out clears token and redirects to login
- [ ] Expired token triggers redirect to login
- [ ] Invalid token returns 401 error

### Automated Testing (TODO)

```typescript
describe('Customer Dashboard API', () => {
  it('returns 401 without auth token', async () => {});
  it('returns customer appointments only', async () => {});
  it('filters by status correctly', async () => {});
  it('filters upcoming appointments correctly', async () => {});
  it('prevents access to other customer\'s appointments', async () => {});
});

describe('Appointment Cancellation', () => {
  it('cancels confirmed appointment successfully', async () => {});
  it('creates audit log entry on cancellation', async () => {});
  it('rejects cancellation of already-canceled appointment', async () => {});
  it('rejects cancellation of completed appointment', async () => {});
  it('requires customer ownership to cancel', async () => {});
});

describe('Customer Dashboard UI', () => {
  it('redirects to login when not authenticated', () => {});
  it('displays appointments in correct filtered view', () => {});
  it('shows confirmation dialog before canceling', () => {});
  it('updates UI after successful cancellation', () => {});
});
```

---

## Future Enhancements (Not Yet Implemented)

### Reschedule Functionality (TODO)
As specified in Step 7r task 5:
- [ ] Reuse booking flow logic for selecting new time
- [ ] Check slot availability for new time
- [ ] Create new reservation
- [ ] Update appointment start/end times
- [ ] Release old reservation slot
- [ ] Create audit log entry for reschedule
- [ ] Send notification to business owner

**Endpoint:** `POST /api/customer/appointments/[id]/reschedule`
**Request Body:**
```json
{
  "newSlotStart": "2025-10-16T10:00:00Z",
  "newSlotEnd": "2025-10-16T11:00:00Z"
}
```

### Business Owner Notifications (Step 7s)
- [ ] Email notification when customer cancels
- [ ] Email notification when customer reschedules
- [ ] In-app notification badge in owner dashboard
- [ ] Configurable notification preferences

### Cancellation Policy Enforcement
- [ ] Add `cancellation_policy` field to business YAML config
- [ ] Validate cancellation attempts against policy
- [ ] Show deadline to customer on dashboard
- [ ] Block cancellation if past deadline

### Customer Profile Management
- [ ] View/edit profile page
- [ ] Update email, phone, name
- [ ] Change password
- [ ] Delete account (soft delete)

### Appointment Reminders
- [ ] Email reminder 24h before appointment
- [ ] SMS reminder (optional)
- [ ] Push notifications (mobile app)

---

## File Structure

```
app/
├── customer/
│   ├── dashboard/
│   │   └── page.tsx            # Customer dashboard (NEW)
│   ├── login/
│   │   └── page.tsx            # Customer login (UPDATED)
│   └── signup/
│       └── page.tsx            # Customer signup (UPDATED)
└── api/
    └── customer/
        └── appointments/
            ├── route.ts        # GET list (NEW)
            └── [id]/
                ├── route.ts    # GET details (NEW)
                └── cancel/
                    └── route.ts # POST cancel (NEW)
```

---

## Acceptance Criteria

### Must Have (Completed)
- [x] Customer dashboard page created
- [x] API endpoint to fetch customer appointments
- [x] API endpoint to get appointment details
- [x] API endpoint to cancel appointments
- [x] Filter appointments by status (Upcoming, Past, Canceled)
- [x] Display appointments with booking ID, service, date, price
- [x] Cancel button with confirmation dialog
- [x] Audit log entry created on cancellation
- [x] JWT authentication required for all endpoints
- [x] Customer ownership verification on all operations
- [x] Auto-redirect to login if token missing/expired
- [x] Auto-login after customer signup
- [x] Store access token in localStorage

### Should Have (Incomplete - Future Work)
- [ ] Reschedule functionality (with slot availability check)
- [ ] Business owner notification on customer cancellation
- [ ] Customer notification email on cancellation
- [ ] Cancellation policy enforcement
- [ ] Rate limiting on cancel endpoint

### Nice to Have (Future)
- [ ] Calendar view of appointments
- [ ] Export appointments to PDF
- [ ] Favorite businesses list
- [ ] Booking history statistics
- [ ] Appointment reminders (email/SMS)

---

## Known Limitations

1. **Reschedule Not Implemented:** Reschedule button is disabled (placeholder). Will be implemented in future iteration per Step 7r task requirements.

2. **No Cancellation Policy Check:** Currently allows cancellation at any time. Should validate against business cancellation policy (e.g., 24h notice).

3. **No Notifications:** Business owners and customers are not notified via email/SMS when appointments are canceled. This will be implemented in Step 7s.

4. **localStorage for Tokens:** Access tokens stored in localStorage (not httpOnly cookies). This is acceptable for access tokens but consider httpOnly cookies for refresh tokens.

5. **No Rate Limiting:** Cancel endpoint should have rate limiting to prevent abuse (e.g., max 5 cancellations per hour).

6. **Client-Side Filtering:** "Past" appointments are filtered client-side. Should be done on backend for better performance with large datasets.

---

## Related Documentation

- **Step 7p:** Customer Authentication System (STEP_7P_CUSTOMER_AUTH_REVISED.md)
- **Step 7q:** Guest Booking Management (STEP_7Q_GUEST_BOOKING_MANAGEMENT.md)
- **Step 7s:** Business Owner Notification Center (TODO - not yet implemented)
- **AUTH_IMPLEMENTATION.md:** JWT and authentication system
- **DATABASE_SCHEMA.md:** Appointments and audit_logs tables

---

## Deployment Notes

### Environment Variables
No new environment variables required. Uses existing:
- `DATABASE_URL`: NeonDB connection string
- `JWT_SECRET`: JWT signing secret

### Database Migrations
No new migrations required. Uses existing schema:
- `appointments` table (customer_id column)
- `audit_logs` table
- `users` table (customer role)

### Testing in Production
1. Create test customer account
2. Book test appointment (as guest or authenticated)
3. Link guest booking if needed (TODO: implement link endpoint)
4. Log in to customer dashboard
5. Verify appointments display correctly
6. Test cancellation flow
7. Verify audit log entries

---

**End of Document**
