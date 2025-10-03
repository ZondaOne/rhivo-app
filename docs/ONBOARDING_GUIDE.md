# Business Onboarding Guide

Complete guide for onboarding new businesses to the Rivo platform.

---

## Overview

The business onboarding pipeline automates the entire setup process:

1. ✅ Parses and validates YAML configuration
2. ✅ Creates business record in database
3. ✅ Creates owner account with secure credentials
4. ✅ Imports categories and services from YAML
5. ✅ Sets up availability schedule
6. ✅ Links configuration to booking page
7. ✅ Sends welcome email with credentials

**Result:** A fully functional business with booking page ready to accept appointments.

---

## Quick Start

### Method 1: CLI Tool (Recommended for Production)

```bash
# Basic usage
npx tsx scripts/onboard-business.ts config/tenants/wellness-spa.yaml owner@business.com

# With owner name
npx tsx scripts/onboard-business.ts config/tenants/wellness-spa.yaml owner@business.com "Business Owner"
```

**Output:**
```
✅ Onboarding Successful!

🏢 Business Details:
   ID: wellness-spa
   Subdomain: wellness-spa

👤 Owner Account:
   Email: owner@business.com
   Temporary Password: Xy9#mK2$pL4@qR8v
   ⚠️  Owner must change password on first login!

🔗 URLs:
   📧 Email Verification: http://localhost:3000/auth/verify-email?token=...
   📅 Booking Page: http://localhost:3000/book/wellness-spa
   🏠 Dashboard: http://localhost:3000/auth/login
```

### Method 2: Web Interface (For Testing)

1. Navigate to `http://localhost:3000/admin/onboard`
2. Select YAML config file
3. Enter owner email
4. Click "Onboard Business"
5. Copy credentials from success screen

### Method 3: API Endpoint

```bash
curl -X POST http://localhost:3000/api/admin/onboard-business \
  -H "Content-Type: application/json" \
  -d '{
    "yamlFilePath": "config/tenants/wellness-spa.yaml",
    "ownerEmail": "owner@business.com",
    "ownerName": "Business Owner"
  }'
```

---

## YAML Configuration

### 1. Create YAML Config

Create a file in `config/tenants/{business-id}.yaml`:

```yaml
version: "1.0.0"

business:
  id: "my-business"
  name: "My Business Name"
  timezone: "America/New_York"
  # ... rest of config
```

See [example-salon.yaml](../config/tenants/example-salon.yaml) for complete example.

### 2. Validate Config

Before onboarding, validate your YAML:

```typescript
import { parseTenantConfigYAML } from '@/lib/config/tenant-config-parser';
import fs from 'fs/promises';

const yaml = await fs.readFile('config/tenants/my-business.yaml', 'utf-8');
const result = parseTenantConfigYAML(yaml);

if (!result.success) {
  console.error('Validation failed:', result.errors);
}
```

---

## Complete Workflow

### Step 1: Prepare YAML Configuration

Create or customize YAML file with:
- Business information
- Contact details
- Branding (colors, logo)
- Services and categories
- Availability schedule
- Booking rules

### Step 2: Run Onboarding

```bash
npx tsx scripts/onboard-business.ts \
  config/tenants/my-business.yaml \
  owner@mybusiness.com \
  "Owner Name"
```

### Step 3: Share Credentials with Owner

The system outputs:
- ✉️ Email verification link
- 🔑 Temporary password
- 🔗 Booking page URL
- 📱 Dashboard login URL

### Step 4: Owner First Login

Owner must:
1. Click email verification link
2. Login with temporary password
3. **Immediately change password**
4. Review business settings
5. Test booking flow

### Step 5: Go Live

1. Owner verifies all services are correct
2. Test booking page
3. Share booking URL with customers
4. Monitor dashboard for incoming bookings

---

## What Gets Created

### Database Records

**Business:**
```sql
INSERT INTO businesses (id, subdomain, name, timezone, config_yaml_path, status)
VALUES ('wellness-spa', 'wellness-spa', 'Tranquillo Spa', 'Europe/Rome', 'config/tenants/...', 'active');
```

**Owner:**
```sql
INSERT INTO users (email, role, business_id, password_hash, email_verification_token)
VALUES ('owner@spa.it', 'owner', 'wellness-spa', 'bcrypt_hash', 'verification_token');
```

**Categories & Services:**
```sql
-- From YAML categories array
INSERT INTO categories (business_id, name, sort_order) VALUES ...;
INSERT INTO services (business_id, category_id, name, duration_minutes, price_cents, ...) VALUES ...;
```

**Availability:**
```sql
-- From YAML availability array (all 7 days)
INSERT INTO availability (business_id, day_of_week, start_time, end_time, is_available) VALUES ...;

-- From YAML exceptions (holidays)
INSERT INTO availability (business_id, exception_date, is_available) VALUES ...;
```

### Generated Assets

- 🔐 Secure temporary password (16 characters, mixed case, numbers, symbols)
- 🎟️ Email verification token (32-byte cryptographic token)
- 🔗 Verification URL with token
- 📄 Welcome email template

---

## Testing the Complete Flow

### End-to-End Test

1. **Onboard Business:**
   ```bash
   npx tsx scripts/onboard-business.ts \
     config/tenants/wellness-spa.yaml \
     test@example.com
   ```

2. **Verify Email:**
   - Copy verification URL from output
   - Open in browser
   - Should see "Email verified" message

3. **Login as Owner:**
   - Go to `/auth/login`
   - Use email + temporary password
   - Should be prompted to change password

4. **View Dashboard:**
   - After password change, redirected to dashboard
   - Should see business name in header
   - Calendar should be empty (no appointments yet)

5. **Make Test Booking:**
   - Go to booking page: `/book/{subdomain}`
   - Select service and time
   - Complete guest booking
   - Return to dashboard - appointment should appear!

---

## Verification Checklist

After onboarding, verify:

- [ ] Business exists in database
- [ ] Owner account created
- [ ] Email verification works
- [ ] Login with temp password works
- [ ] Password change required
- [ ] Dashboard loads correctly
- [ ] Business name displays correctly
- [ ] Booking page loads
- [ ] Categories show correctly
- [ ] Services have correct prices
- [ ] Availability calendar works
- [ ] Test booking succeeds
- [ ] Appointment appears in dashboard
- [ ] Config changes reflect on booking page

---

## Troubleshooting

### Issue: "Business already exists"

**Cause:** Subdomain collision
**Solution:**
```sql
-- Check existing businesses
SELECT id, subdomain FROM businesses WHERE subdomain = 'wellness-spa';

-- If needed, delete and retry
UPDATE businesses SET deleted_at = NOW() WHERE subdomain = 'wellness-spa';
```

### Issue: "Owner email already exists"

**Cause:** Email already registered
**Solution:**
```sql
-- Check user
SELECT id, email, role FROM users WHERE email = 'owner@business.com';

-- Use different email or delete existing
UPDATE users SET deleted_at = NOW() WHERE email = 'owner@business.com';
```

### Issue: "YAML validation failed"

**Cause:** Invalid configuration
**Solution:**
1. Check YAML syntax
2. Review error messages
3. Fix validation issues
4. Retry onboarding

Common validation errors:
- Missing required fields
- Invalid time format (must be HH:MM)
- Service duration not multiple of time slot
- Invalid timezone
- Duplicate service IDs

### Issue: "Booking page shows 'Business Not Found'"

**Cause:** Config not loaded or subdomain mismatch
**Solution:**
1. Check `config_yaml_path` in database
2. Verify YAML file exists at that path
3. Clear config cache
4. Check subdomain in URL matches business ID

---

## Advanced Usage

### Bulk Onboarding

Create script to onboard multiple businesses:

```typescript
const businesses = [
  {
    yaml: 'config/tenants/business-1.yaml',
    owner: 'owner1@email.com',
    name: 'Owner 1',
  },
  {
    yaml: 'config/tenants/business-2.yaml',
    owner: 'owner2@email.com',
    name: 'Owner 2',
  },
];

for (const biz of businesses) {
  const result = await onboardBusiness({
    yamlFilePath: biz.yaml,
    ownerEmail: biz.owner,
    ownerName: biz.name,
  });

  console.log(`${biz.owner}: ${result.success ? '✅' : '❌'}`);
}
```

### Custom Welcome Email

Override default email template:

```typescript
import { onboardBusiness } from '@/lib/onboarding/business-onboarding';

const result = await onboardBusiness({ ... });

if (result.success) {
  await sendCustomWelcomeEmail(
    result.ownerId,
    result.temporaryPassword,
    result.verificationUrl
  );
}
```

### Production Deployment

For production, add:

1. **Admin Authentication** (endpoint currently unprotected)
2. **Rate Limiting** (prevent abuse)
3. **Audit Logging** (track who onboards what)
4. **Email Service** (replace console.log with real emails)
5. **Monitoring** (alert on failures)

---

## Security Considerations

### Password Security

- ✅ Temporary passwords are 16+ characters
- ✅ Include mixed case, numbers, symbols
- ✅ Hashed with bcrypt (cost factor 12)
- ✅ Forced change on first login
- ✅ Not stored in plain text

### Email Verification

- ✅ Cryptographically secure tokens (32 bytes)
- ✅ Tokens hashed before storage
- ✅ 24-hour expiration
- ✅ Single-use tokens

### API Security

⚠️ **TODO:** Add authentication to `/api/admin/onboard-business`

Currently anyone can call this endpoint. Add:
```typescript
const { isAdmin } = await verifyAdminToken(request);
if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

---

## Support

For issues or questions:
- Check [troubleshooting section](#troubleshooting)
- Review [YAML validation errors](#issue-yaml-validation-failed)
- Test on `/admin/onboard` page first
- Check database directly if needed

---

## Related Documentation

- [Customer Booking Flow](./CUSTOMER_BOOKING_FLOW.md)
- [YAML Config Schema](../src/lib/config/tenant-schema.ts)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Authentication Guide](./AUTH_IMPLEMENTATION.md)
