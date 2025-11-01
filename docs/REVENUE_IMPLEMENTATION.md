# Revenue System Implementation Summary

## ✅ Completed: Phase 1 - Core Subscription System (Mock Mode)

This implementation provides the **complete foundation** for Rhivo's B2B SaaS freemium model, with all feature gating in place but using a **contact sales modal** instead of Stripe payments until bureaucratic requirements (VAT, e-invoicing) are completed.

---

## 🗄️ Database Schema (COMPLETED)

### Migrations Created:
- **029_subscription_system.sql** - Adds subscription fields to businesses table
- **030_subscription_plans.sql** - Creates subscription plans configuration table

### New Fields in `businesses` table:
```sql
subscription_tier          TEXT (free/basic/pro/enterprise) DEFAULT 'free'
max_staff_members          INTEGER DEFAULT 1
max_locations              INTEGER DEFAULT 1
sms_quota                  INTEGER DEFAULT 0
sms_used_this_month        INTEGER DEFAULT 0
sms_reset_date             DATE
branding_enabled           BOOLEAN DEFAULT false
analytics_enabled          BOOLEAN DEFAULT false
remove_watermark           BOOLEAN DEFAULT false
api_access_enabled         BOOLEAN DEFAULT false
custom_domain              TEXT
stripe_customer_id         TEXT
stripe_subscription_id     TEXT
subscription_status        TEXT DEFAULT 'none'
trial_ends_at              TIMESTAMPTZ
subscription_started_at    TIMESTAMPTZ
subscription_canceled_at   TIMESTAMPTZ
billing_email              TEXT
vat_number                 TEXT (for Partita IVA)
```

### Subscription Plans Table:
Stores configuration for all 4 tiers:
- **Free (Starter)**: €0, 1 staff, 1 location, 0 SMS
- **Basic (Professional)**: €19/month (€190/year), 5 staff, 100 SMS
- **Pro (Growth)**: €49/month (€490/year), 15 staff, 3 locations, 500 SMS
- **Enterprise**: Custom pricing, unlimited everything

---

## 🔐 Feature Gating System (COMPLETED)

### Core Library: `src/lib/subscription/feature-gates.ts`

**Key Functions:**
- `getBusinessFeatures(businessId)` - Get all features for a business
- `hasFeature(businessId, feature)` - Check if business has access to a feature
- `checkFeatureAccess(businessId, feature)` - Returns access status + upgrade info
- `canAddStaff(businessId)` - Check staff limits
- `canSendSMS(businessId)` - Check SMS quota
- `getPricingTiers()` - Get all pricing tiers for display

**Feature Flags:**
```typescript
interface SubscriptionFeatures {
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
  maxStaff: number;
  maxLocations: number;
  smsQuota: number;
  brandingEnabled: boolean;
  analyticsLevel: 'none' | 'basic' | 'advanced';
  removeWatermark: boolean;
  apiAccess: boolean;
  exportData: boolean;
  customerDatabase: boolean;
  automatedReminders: boolean;
  multiLocation: boolean;
  customDomain: boolean;
  whiteLabel: boolean;
}
```

---

## 🚧 API Endpoint Gating (COMPLETED)

Feature gates added to:
- ✅ `/api/insights/revenue/route.ts` - Analytics locked behind `analyticsLevel` check
- ✅ `/api/insights/bookings/route.ts` - Analytics locked
- ✅ `/api/insights/services/route.ts` - Analytics locked

**Response when locked (403):**
```json
{
  "error": "Feature not available",
  "message": "Analytics and insights requires the Professional plan or higher",
  "currentTier": "free",
  "suggestedTier": "basic",
  "upgradeRequired": true
}
```

---

## 🎨 UI Components (COMPLETED)

### 1. Upgrade Modal
**File:** `src/components/subscription/UpgradeModal.tsx`

- Shows when user tries to access locked features
- Displays current tier, suggested tier, and pricing
- **Mock implementation**: "Contact Sales Team" button instead of Stripe checkout
- Success state: "We'll be in touch" confirmation

**Usage:**
```tsx
<UpgradeModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  currentTier="free"
  suggestedTier="basic"
  featureName="Analytics and insights"
/>
```

### 2. Locked Feature Component
**File:** `src/components/subscription/LockedFeature.tsx`

- Visual placeholder for locked features
- Blur effect + lock icon
- Upgrade CTA button
- Shows current vs required tier

**Usage:**
```tsx
<LockedFeature
  featureName="Advanced Analytics"
  description="Track customer retention, CLV, and more"
  currentTier="free"
  suggestedTier="pro"
/>
```

### 3. Powered by Rhivo Badge
**File:** `src/components/subscription/PoweredByBadge.tsx`

- Shows on free tier booking pages
- Removed on Basic+ plans (remove_watermark flag)
- Two versions: API-checking and simple prop-based

**Usage:**
```tsx
<PoweredByBadgeSimple show={tier === 'free'} />
```

### 4. useUpgrade Hook
**File:** `src/hooks/useUpgrade.tsx`

Simplifies showing upgrade modals in components:
```tsx
const { showUpgrade, UpgradeModal } = useUpgrade({ currentTier: 'free' });

// Later...
<button onClick={() => showUpgrade({
  suggestedTier: 'basic',
  featureName: 'Custom Branding'
})}>
  Upgrade
</button>

<UpgradeModal />
```

---

## 💰 Pricing Page (COMPLETED)

**File:** `app/[locale]/pricing/page.tsx`

**Features:**
- Responsive pricing cards for all 4 tiers
- "Most Popular" badge on Professional tier
- Annual billing discount (17%) prominently displayed
- Feature comparison table
- FAQ section
- CTA footer with sign-up and contact buttons

**URL:** `/pricing`

**CTA Actions:**
- Free tier → `/auth/signup`
- Basic/Pro → `mailto:team@zonda.one` (mock)
- Enterprise → `mailto:team@zonda.one`

---

## 🎯 How to Use the System

### 1. **Check Feature Access in Code**
```typescript
import { checkFeatureAccess } from '@/lib/subscription/feature-gates';

const featureCheck = await checkFeatureAccess(businessId, 'analyticsLevel');
if (!featureCheck.hasAccess) {
  // Show upgrade modal or locked component
  return <LockedFeature {...featureCheck} />;
}
```

### 2. **Gate API Endpoints**
```typescript
import { checkFeatureAccess } from '@/lib/subscription/feature-gates';

export async function GET(request: NextRequest) {
  const featureCheck = await checkFeatureAccess(businessId, 'exportData');
  if (!featureCheck.hasAccess) {
    return NextResponse.json({
      error: 'Feature not available',
      ...featureCheck,
    }, { status: 403 });
  }

  // Feature available, proceed...
}
```

### 3. **Show Upgrade Prompts**
```tsx
const { showUpgrade, UpgradeModal } = useUpgrade({ currentTier });

<button onClick={() => showUpgrade({
  suggestedTier: 'pro',
  featureName: 'Multi-location Support',
  message: 'Manage multiple locations with the Growth plan'
})}>
  Add Location
</button>

<UpgradeModal />
```

---

## 📋 What's Left to Implement

### ⏳ TODO: Stripe Integration (Blocked by Bureaucracy)

**Required before Stripe:**
1. ✅ Italian VAT registration (Partita IVA)
2. ✅ E-invoicing service setup (Fatture in Cloud or Aruba)
3. ✅ Stripe account setup with Italian tax configuration
4. ✅ Create Stripe products for each tier
5. ✅ Legal: Terms of Service, Privacy Policy updates

**When ready, implement:**
- [ ] `/api/billing/create-subscription` - Create Stripe subscription
- [ ] `/api/billing/cancel-subscription` - Cancel subscription
- [ ] `/api/billing/portal` - Redirect to Stripe customer portal
- [ ] `/api/webhooks/stripe` - Handle subscription events
- [ ] Replace `mailto:` links with Stripe checkout

**Files to create (see revenue.xml for implementation details):**
- `app/api/billing/create-subscription/route.ts`
- `app/api/billing/cancel-subscription/route.ts`
- `app/api/billing/portal/route.ts`
- `app/api/webhooks/stripe/route.ts`

---

## 🚀 Next Steps to Test

### 1. **Test Feature Gates**
```bash
# All businesses default to free tier
# Analytics endpoints should return 403

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/insights/revenue?businessId=xxx"

# Expected: 403 with upgradeRequired: true
```

### 2. **Manually Upgrade a Business (for testing)**
```sql
UPDATE businesses
SET subscription_tier = 'basic',
    max_staff_members = 5,
    sms_quota = 100,
    branding_enabled = true,
    analytics_enabled = true,
    remove_watermark = true
WHERE id = 'YOUR_BUSINESS_ID';
```

### 3. **Test the Pricing Page**
Visit: `http://localhost:3000/pricing`

### 4. **Test Upgrade Modals**
- Try accessing `/dashboard/insights` on a free tier account
- Should show locked feature component
- Click upgrade → Contact sales modal appears

---

## 🎉 Summary

You now have a **fully functional freemium subscription system** with:
- ✅ Database schema for 4-tier model
- ✅ Feature gating on API endpoints
- ✅ UI components for locked features and upgrades
- ✅ Public pricing page
- ✅ "Powered by Rhivo" badge for free tier
- ✅ Contact sales flow (mock Stripe)

**All that remains is Stripe integration once bureaucracy is complete.**

The system is designed to:
1. Let free users explore the product
2. Show clear value of paid tiers
3. Make upgrading easy (currently via email, later Stripe)
4. Scale with business growth (staff, locations, features)

---

## 📧 Contact for Upgrades (Current Mock Flow)

All upgrade CTAs currently point to:
- **Email:** team@zonda.one
- **Modal:** Shows "Contact Sales Team" button
- **Success:** "We'll be in touch!" confirmation

Once Stripe is integrated, these will redirect to checkout flows.

---

## 🔗 Key Files Created

```
Database:
├── src/db/migrations/029_subscription_system.sql
└── src/db/migrations/030_subscription_plans.sql

Core Logic:
├── src/lib/subscription/feature-gates.ts
└── src/hooks/useUpgrade.tsx

UI Components:
├── src/components/subscription/UpgradeModal.tsx
├── src/components/subscription/LockedFeature.tsx
└── src/components/subscription/PoweredByBadge.tsx

Pages:
└── app/[locale]/pricing/page.tsx

Updated API Endpoints:
├── app/api/insights/revenue/route.ts
├── app/api/insights/bookings/route.ts
└── app/api/insights/services/route.ts
```

---

**Ready to monetize! 💰**
