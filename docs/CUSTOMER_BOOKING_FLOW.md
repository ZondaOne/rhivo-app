# Customer Booking Flow Documentation

**Version:** 1.0.0
**Last Updated:** 2025-10-03
**Step 7:** Public Booking UX & Slot Generation

---

## Overview

The customer booking system provides a public-facing booking interface where customers can book appointments without authentication. Each business gets a unique booking page configured via YAML files, allowing for highly customizable branding, services, and availability.

---

## Architecture

### Subdomain Routing

Each business gets a unique subdomain for their booking page:

- **Production:** `{business-name}.rivo.app/book`
- **Development:** `/book/{business-name}` or `/book/[subdomain]?business={business-name}`

### Configuration System

Business configurations are stored in YAML files and loaded dynamically:

1. **YAML Schema** (`src/lib/config/tenant-schema.ts`)
   - Comprehensive Zod schema for validation
   - Type-safe configuration
   - Extensive validation rules

2. **Config Parser** (`src/lib/config/tenant-config-parser.ts`)
   - YAML parsing and validation
   - Error reporting with detailed messages
   - Warning generation for non-critical issues

3. **Config Loader** (`src/lib/config/config-loader.ts`)
   - In-memory caching (5 minute TTL)
   - Database fallback
   - File system loading

### Booking Flow

```
Customer Visit → Load Config → Select Category → Select Service → Choose Date → Choose Time → Reserve Slot → Provide Details → Commit Booking
```

---

## YAML Configuration

### File Location

YAML configs are stored in: `/config/tenants/{business-id}.yaml`

### Configuration Structure

```yaml
version: "1.0.0"

business:
  id: "business-slug"
  name: "Business Name"
  description: "Business description"
  timezone: "America/New_York"
  locale: "en-US"
  currency: "USD"

contact:
  address:
    street: "123 Main St"
    city: "City"
    state: "State"
    postalCode: "12345"
    country: "US"
  email: "contact@business.com"
  phone: "+1234567890"
  website: "https://business.com"

branding:
  primaryColor: "#14b8a6"
  secondaryColor: "#10b981"
  logoUrl: "https://example.com/logo.png"
  coverImageUrl: "https://example.com/cover.jpg"
  faviconUrl: "https://example.com/favicon.ico"

timeSlotDuration: 30  # Minutes

availability:
  - day: monday
    open: "09:00"
    close: "18:00"
    enabled: true
  # ... all 7 days required

availabilityExceptions:
  - date: "2025-12-25"
    reason: "Christmas Day"
    closed: true

categories:
  - id: "category-id"
    name: "Category Name"
    description: "Description"
    sortOrder: 0
    services:
      - id: "service-id"
        name: "Service Name"
        description: "Service description"
        duration: 60  # Minutes
        price: 5000   # Cents
        color: "#e91e63"
        sortOrder: 0
        enabled: true
        requiresDeposit: false
        depositAmount: 1000
        bufferBefore: 0
        bufferAfter: 15

bookingRequirements:
  requireEmail: true
  requirePhone: true
  requireName: true
  allowGuestBooking: true
  requireEmailVerification: false
  customFields: []

bookingLimits:
  maxSimultaneousBookings: 1
  advanceBookingDays: 30
  minAdvanceBookingMinutes: 60

cancellationPolicy:
  allowCancellation: true
  cancellationDeadlineHours: 24
  allowRescheduling: true
  rescheduleDeadlineHours: 12
  refundPolicy: "full"

notifications:
  sendConfirmationEmail: true
  sendReminderEmail: true
  reminderHoursBefore: 24
  ownerNotificationEmail: "owner@business.com"

features:
  enableOnlinePayments: false
  enableWaitlist: false
  enableReviews: false
```

### Required Fields

**Minimum required fields for a valid config:**

- `version` - Semver format (e.g., "1.0.0")
- `business.id` - Unique business identifier
- `business.name` - Display name
- `business.timezone` - IANA timezone
- `contact.*` - Full contact information
- `branding.primaryColor` - Hex color
- `branding.logoUrl` - Logo URL
- `timeSlotDuration` - Slot duration in minutes
- `availability` - All 7 days (can be disabled)
- `categories` - At least one category with services

### Validation Rules

1. **Service Duration Compatibility**
   - Service duration must be >= time slot duration
   - Service duration must be a multiple of time slot duration

2. **Time Validation**
   - Close time must be after open time
   - Times in 24-hour HH:MM format

3. **Unique Identifiers**
   - Service IDs must be unique across all categories
   - Category IDs must be unique

4. **Deposit Rules**
   - If deposit required, must specify deposit amount
   - Deposit amount cannot exceed price

---

## Booking Page Routes

### Customer Booking Page

**Route:** `/book/[subdomain]/page.tsx`

**Features:**
- Dynamic configuration loading
- Category and service selection
- Date and time slot selection
- Booking summary
- Contact information display

**Components:**
1. Header with business branding
2. Category selector (left column)
3. Service selector (left column)
4. Date/time picker (right column)
5. Booking summary
6. Contact & hours display

### API Endpoints

#### Get Tenant Configuration

```
GET /api/config/tenant?subdomain={subdomain}
```

**Response:**
```json
{
  "success": true,
  "config": { ... },
  "subdomain": "business-name"
}
```

#### Reserve Time Slot

```
POST /api/booking/reserve
```

**Request:**
```json
{
  "businessId": "uuid",
  "serviceId": "uuid",
  "startTime": "2025-10-05T14:00:00Z",
  "idempotencyKey": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "reservationId": "uuid",
  "expiresAt": "2025-10-05T14:10:00Z"
}
```

#### Commit Reservation

```
POST /api/booking/commit
```

**Request:**
```json
{
  "reservationId": "uuid",
  "guestEmail": "customer@example.com",
  "guestPhone": "+1234567890",
  "guestName": "Customer Name"
}
```

**Response:**
```json
{
  "success": true,
  "appointmentId": "uuid",
  "cancellationToken": "secure-token"
}
```

---

## Time Slot Generation Algorithm

### Overview

Time slots are generated based on:
1. Business availability (regular hours + exceptions)
2. Service duration
3. Time slot duration (interval)
4. Existing appointments
5. Existing reservations (not expired)
6. Buffer times (before/after service)

### Algorithm Steps

1. **Determine Available Days**
   - Check regular availability for day of week
   - Check exception dates (holidays, special hours)
   - Respect advance booking limits

2. **Generate Slot Windows**
   ```
   For each day in range:
     If day is available:
       start = open_time
       end = close_time
       while start + service_duration <= end:
         if slot_is_valid(start):
           add_slot(start)
         start += time_slot_duration
   ```

3. **Validate Each Slot**
   - Check minimum advance booking time
   - Check for overlapping appointments
   - Check reservation capacity
   - Check buffer times

4. **Account for Service Duration**
   - Service needs full duration available
   - Cannot span closing time
   - Cannot overlap with other bookings beyond capacity

### Example

**Business Hours:** 09:00 - 18:00
**Time Slot Duration:** 30 minutes
**Service Duration:** 60 minutes
**Max Simultaneous Bookings:** 1

**Generated Slots:**
- 09:00 (if no booking at 09:00-10:00)
- 09:30 (if no booking at 09:30-10:30)
- 10:00 (if no booking at 10:00-11:00)
- ...
- 17:00 (last slot, service ends at 18:00)

**NOT Generated:**
- 17:30 (service would end at 18:30, past closing)

---

## Guest Booking Flow

### Without Account

1. Customer selects service and time
2. System creates temporary reservation (5-10 min TTL)
3. Customer provides:
   - Email (required)
   - Phone (optional, based on config)
   - Name (required)
   - Custom fields (based on config)
4. System commits reservation to appointment
5. System generates:
   - Cancellation token (for URL-based cancellation)
   - Guest access token (short-lived, for viewing appointment)
6. Confirmation email sent with:
   - Appointment details
   - Cancellation link
   - iCal attachment

### With Account (Future)

1. Customer logs in
2. Selects service and time
3. System pre-fills customer details
4. One-click booking
5. Appointment appears in customer dashboard

---

## Configuration Loading Flow

### Priority Order

1. **In-Memory Cache** (5 minute TTL)
   - Fastest, reduces database load
   - Cleared on config updates

2. **YAML File** (via `config_yaml_path` in database)
   - Most flexible, allows hot-reloading
   - Validated on load

3. **Database Fallback**
   - Builds minimal config from DB tables
   - Used when YAML file is missing

### Fallback Configuration

If YAML is not found, system builds config from:
- `businesses` table
- `categories` table
- `services` table
- `availability` table

Default values used for missing fields.

---

## UI/UX Guidelines

### Design Principles

1. **Organic & Premium**
   - Teal/green color family (configurable)
   - Light theme with subtle gradients
   - Modern, clean typography
   - Ample whitespace

2. **Mobile-First**
   - Responsive grid layouts
   - Touch-friendly buttons
   - Clear hierarchy

3. **Accessibility**
   - WCAG AA compliance
   - Clear labels and instructions
   - Error messages with guidance

### Color System

Colors are fully configurable per tenant:
- Primary color (main CTAs, selections)
- Secondary color (accents, hover states)
- Service colors (visual distinction)

### Loading States

- Skeleton screens for initial load
- Spinners for API calls
- Disabled states with clear messaging

### Error States

- Graceful degradation
- Clear error messages
- Recovery suggestions
- Support contact information

---

## Validation & Error Handling

### YAML Validation

**On Config Load:**
1. Parse YAML syntax
2. Validate against Zod schema
3. Run additional business rules
4. Generate warnings for non-critical issues

**Validation Errors:**
```json
{
  "success": false,
  "errors": [
    "business.timezone: Invalid timezone. Must be a valid IANA timezone",
    "services.haircut: Duration (45min) is not a multiple of time slot duration (30min)"
  ],
  "warnings": [
    "monday: Opening time 05:00 is very early (before 6 AM)",
    "Advance booking allowed 200 days out. Consider limiting to 180 days or less."
  ]
}
```

### Runtime Validation

**Booking Request Validation:**
- Selected time is in future
- Selected time is within advance booking window
- Time slot is available (capacity check)
- Service still exists and is enabled
- Business is active and not suspended

---

## Performance Considerations

### Caching Strategy

1. **Config Cache**
   - In-memory, 5 minute TTL
   - Per-subdomain
   - Manual invalidation on updates

2. **Database Queries**
   - Indexed on `subdomain`
   - Indexed on `business_id + slot_start`
   - Use partial indexes for active records

3. **Slot Generation**
   - Generate 30 days at a time (max)
   - Client-side caching of slots
   - Lazy loading of additional date ranges

### Optimization Tips

1. Keep time slot duration >= 15 minutes
2. Limit advance booking to 180 days
3. Use database config fallback sparingly
4. Implement CDN caching for static assets

---

## Testing

### Test Scenarios

1. **Config Loading**
   - Valid YAML loads correctly
   - Invalid YAML shows clear errors
   - Missing YAML falls back to database
   - Cache invalidation works

2. **Slot Generation**
   - Respects business hours
   - Respects exceptions
   - Accounts for service duration
   - Prevents overbooking

3. **Booking Flow**
   - Guest can book without account
   - Required fields enforced
   - Custom fields work correctly
   - Cancellation link works

### Example Test Config

See `/config/tenants/example-salon.yaml` for a comprehensive test configuration with all features enabled.

---

## Deployment & Operations

### Adding a New Business

1. Create business in database
2. Create YAML config file in `/config/tenants/{business-id}.yaml`
3. Validate YAML locally
4. Update business record with `config_yaml_path`
5. Deploy and test booking page

### Updating Configuration

1. Edit YAML file
2. Validate changes (run validation script)
3. Check for breaking changes
4. Deploy updated file
5. Clear config cache (optional, auto-expires in 5 min)

### Monitoring

**Key Metrics:**
- Config load errors
- Config cache hit rate
- Booking conversion rate (visitors → bookings)
- Slot availability (% of slots booked)

**Alerts:**
- Config validation failures
- Missing YAML files
- Database fallback usage (indicates issue)

---

## Future Enhancements

### Planned Features

1. **Advanced Slot Generation**
   - Multi-day services
   - Staff assignment
   - Resource constraints

2. **Enhanced UX**
   - Interactive calendar widget
   - Real-time availability updates
   - Multi-step booking wizard

3. **Personalization**
   - Remember customer preferences
   - Smart defaults based on history
   - Recommended services

4. **Payment Integration**
   - Deposit collection
   - Full payment at booking
   - Multiple payment methods

5. **Internationalization**
   - Multi-language support
   - Currency conversion
   - Locale-specific formatting

---

## Support & Troubleshooting

### Common Issues

**Issue:** "Business Not Found"
**Solution:** Check subdomain spelling, verify business is active in database

**Issue:** "No Available Slots"
**Solution:** Check business hours, verify service duration compatibility, check advance booking limits

**Issue:** "Configuration Error"
**Solution:** Validate YAML syntax, check schema compliance, review validation errors

### Debug Endpoints

- `/api/config/tenant?subdomain=xxx` - View current config
- `/api/booking/capacity?businessId=xxx&serviceId=yyy&slotStart=zzz` - Check slot capacity
- `/debug/api` - Full API test suite

---

## Related Documentation

- [Database Schema](./DATABASE_SCHEMA.md)
- [Booking Transactions](./TRANSACTIONS_IMPLEMENTATION.md)
- [Authentication](./AUTH_IMPLEMENTATION.md)
- [Tenant Schema Reference](../src/lib/config/tenant-schema.ts)

---

**Last Updated:** 2025-10-03
**Maintained By:** Development Team
