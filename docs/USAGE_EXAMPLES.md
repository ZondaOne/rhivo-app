# Revenue System - Usage Examples

## Example 1: Lock Analytics Page for Free Tier

**File:** `app/[locale]/dashboard/insights/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { LockedFeature } from '@/components/subscription/LockedFeature';
import { BookingsChart } from '@/components/dashboard/insights/BookingsChart';
import { RevenueChart } from '@/components/dashboard/insights/RevenueChart';

function InsightsContent() {
  const { user } = useAuth();
  const { selectedBusinessId } = useBusiness();
  const [hasAnalytics, setHasAnalytics] = useState<boolean | null>(null);
  const [currentTier, setCurrentTier] = useState('free');

  useEffect(() => {
    const checkAccess = async () => {
      if (!selectedBusinessId) return;

      try {
        const response = await fetch(`/api/business/info?id=${selectedBusinessId}`);
        const data = await response.json();

        setCurrentTier(data.business.subscription_tier || 'free');
        setHasAnalytics(data.business.analytics_enabled || false);
      } catch (error) {
        console.error('Failed to check analytics access:', error);
        setHasAnalytics(false);
      }
    };

    checkAccess();
  }, [selectedBusinessId]);

  // Loading state
  if (hasAnalytics === null) {
    return <div>Loading...</div>;
  }

  // Show locked feature for free tier
  if (!hasAnalytics) {
    return (
      <div className="p-8">
        <LockedFeature
          featureName="Analytics Dashboard"
          description="Track revenue, bookings, customer trends, and service performance with detailed analytics."
          currentTier={currentTier}
          suggestedTier="basic"
          icon="📊"
        />
      </div>
    );
  }

  // Show analytics for paid tiers
  return (
    <div>
      <BookingsChart />
      <RevenueChart />
    </div>
  );
}
```

---

## Example 2: Staff Member Limit Enforcement

**File:** `app/[locale]/dashboard/settings/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { canAddStaff } from '@/lib/subscription/feature-gates';
import { useUpgrade } from '@/hooks/useUpgrade';
import { useBusiness } from '@/contexts/BusinessContext';

function StaffSettings() {
  const { selectedBusinessId, selectedBusiness } = useBusiness();
  const { showUpgrade, UpgradeModal } = useUpgrade({
    currentTier: selectedBusiness?.subscription_tier || 'free'
  });

  const handleAddStaff = async () => {
    const staffCheck = await canAddStaff(selectedBusinessId);

    if (!staffCheck.allowed) {
      showUpgrade({
        suggestedTier: staffCheck.maxAllowed === 1 ? 'basic' : 'pro',
        message: staffCheck.reason,
      });
      return;
    }

    // Proceed with adding staff
    // ... your staff creation logic
  };

  return (
    <div>
      <h2>Staff Members ({staffCheck.currentCount}/{staffCheck.maxAllowed})</h2>

      <button onClick={handleAddStaff}>
        Add Staff Member
      </button>

      <UpgradeModal />
    </div>
  );
}
```

---

## Example 3: Export Data Feature Gate

**File:** `app/api/appointments/export/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { checkFeatureAccess } from '@/lib/subscription/feature-gates';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  const payload = verifyToken(token);

  const businessId = request.nextUrl.searchParams.get('businessId');

  // Check if business can export data
  const featureCheck = await checkFeatureAccess(businessId, 'exportData');

  if (!featureCheck.hasAccess) {
    return NextResponse.json({
      error: 'Export feature not available',
      message: featureCheck.upgradeMessage,
      currentTier: featureCheck.currentTier,
      suggestedTier: featureCheck.suggestedTier,
      upgradeRequired: true,
    }, { status: 403 });
  }

  // Generate CSV export
  const appointments = await fetchAppointments(businessId);
  const csv = generateCSV(appointments);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="appointments.csv"'
    }
  });
}
```

---

## Example 4: Custom Branding Settings

**File:** `app/[locale]/dashboard/settings/branding/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { checkFeatureAccess } from '@/lib/subscription/feature-gates';
import { LockedFeature } from '@/components/subscription/LockedFeature';

function BrandingSettings() {
  const { selectedBusinessId, selectedBusiness } = useBusiness();
  const [canCustomize, setCanCustomize] = useState<boolean | null>(null);

  useEffect(() => {
    const checkBranding = async () => {
      const check = await checkFeatureAccess(selectedBusinessId, 'brandingEnabled');
      setCanCustomize(check.hasAccess);
    };
    checkBranding();
  }, [selectedBusinessId]);

  if (canCustomize === false) {
    return (
      <LockedFeature
        featureName="Custom Branding"
        description="Customize colors, upload your logo, and remove Rhivo branding from your booking page."
        currentTier={selectedBusiness?.subscription_tier || 'free'}
        suggestedTier="basic"
        icon="🎨"
      />
    );
  }

  return (
    <div>
      {/* Branding customization UI */}
      <ColorPicker />
      <LogoUploader />
    </div>
  );
}
```

---

## Example 5: SMS Quota Check

**File:** `app/api/notifications/send-sms/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { canSendSMS, incrementSMSUsage } from '@/lib/subscription/feature-gates';

export async function POST(request: NextRequest) {
  const { businessId, phoneNumber, message } = await request.json();

  // Check SMS quota
  const smsCheck = await canSendSMS(businessId);

  if (!smsCheck.allowed) {
    return NextResponse.json({
      error: 'SMS quota exceeded',
      message: smsCheck.reason,
      remaining: smsCheck.remaining,
      quota: smsCheck.quota,
      upgradeRequired: true,
      suggestedTier: smsCheck.quota < 100 ? 'basic' : 'pro'
    }, { status: 403 });
  }

  // Send SMS
  await sendSMS(phoneNumber, message);

  // Increment usage
  await incrementSMSUsage(businessId);

  return NextResponse.json({
    success: true,
    remaining: smsCheck.remaining - 1
  });
}
```

---

## Example 6: Booking Page with Watermark

**File:** `app/[locale]/book/[subdomain]/page.tsx`

```tsx
import { PoweredByBadgeSimple } from '@/components/subscription/PoweredByBadge';
import { getDbClient } from '@/db/client';

export default async function BookingPage({ params }: { params: { subdomain: string } }) {
  const sql = getDbClient();

  const [business] = await sql`
    SELECT subscription_tier, remove_watermark
    FROM businesses
    WHERE subdomain = ${params.subdomain}
  `;

  const showWatermark = !business.remove_watermark; // free tier shows watermark

  return (
    <div className="min-h-screen flex flex-col">
      {/* Booking form */}
      <div className="flex-1">
        <BookingForm business={business} />
      </div>

      {/* Watermark badge for free tier */}
      <PoweredByBadgeSimple show={showWatermark} />
    </div>
  );
}
```

---

## Example 7: Inline Upgrade Prompt

**File:** `app/[locale]/dashboard/page.tsx`

```tsx
'use client';

import { useUpgrade } from '@/hooks/useUpgrade';
import { useBusiness } from '@/contexts/BusinessContext';

function Dashboard() {
  const { selectedBusiness } = useBusiness();
  const { showUpgrade, UpgradeModal } = useUpgrade({
    currentTier: selectedBusiness?.subscription_tier || 'free'
  });

  const isFreeTier = selectedBusiness?.subscription_tier === 'free';

  return (
    <div>
      {/* Show upgrade banner for free tier */}
      {isFreeTier && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl mb-8">
          <h3 className="text-xl font-bold mb-2">Unlock More Features</h3>
          <p className="mb-4">
            Upgrade to Professional to get custom branding, analytics, and support for up to 5 staff members.
          </p>
          <button
            onClick={() => showUpgrade({ suggestedTier: 'basic' })}
            className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50"
          >
            View Plans
          </button>
        </div>
      )}

      {/* Dashboard content */}
      <DashboardStats />

      <UpgradeModal />
    </div>
  );
}
```

---

## Example 8: Multi-location Check

**File:** `app/[locale]/dashboard/locations/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { getBusinessFeatures } from '@/lib/subscription/feature-gates';
import { useUpgrade } from '@/hooks/useUpgrade';

function LocationsPage() {
  const { selectedBusinessId, selectedBusiness } = useBusiness();
  const [locationCount, setLocationCount] = useState(1);
  const [maxLocations, setMaxLocations] = useState(1);
  const { showUpgrade, UpgradeModal } = useUpgrade({
    currentTier: selectedBusiness?.subscription_tier || 'free'
  });

  useEffect(() => {
    const fetchLimits = async () => {
      const features = await getBusinessFeatures(selectedBusinessId);
      setMaxLocations(features.maxLocations);
    };
    fetchLimits();
  }, [selectedBusinessId]);

  const handleAddLocation = () => {
    if (locationCount >= maxLocations) {
      showUpgrade({
        suggestedTier: 'pro',
        featureName: 'Multi-location Support',
        message: 'Manage up to 3 locations with the Growth plan'
      });
      return;
    }

    // Add location logic
  };

  return (
    <div>
      <h2>Locations ({locationCount}/{maxLocations})</h2>

      <button onClick={handleAddLocation}>
        Add Location
      </button>

      <UpgradeModal />
    </div>
  );
}
```

---

## Testing Checklist

### 1. Test Free Tier Restrictions
- [ ] Analytics page shows locked component
- [ ] Can't add more than 1 staff member
- [ ] Export data returns 403
- [ ] Branding settings show locked component
- [ ] "Powered by Rhivo" badge appears on booking page

### 2. Test Basic Tier Features
```sql
-- Upgrade a test business to Basic
UPDATE businesses
SET subscription_tier = 'basic',
    max_staff_members = 5,
    sms_quota = 100,
    branding_enabled = true,
    analytics_enabled = true,
    remove_watermark = true,
    subscription_status = 'active'
WHERE subdomain = 'test-business';
```

Then verify:
- [ ] Analytics page is accessible
- [ ] Can add up to 5 staff members
- [ ] Can export data
- [ ] Branding settings are accessible
- [ ] No "Powered by Rhivo" badge

### 3. Test Upgrade Modals
- [ ] Click "Upgrade" shows modal
- [ ] Modal displays correct tier information
- [ ] "Contact Sales Team" button works
- [ ] Success state appears after clicking

### 4. Test Pricing Page
- [ ] Visit `/pricing`
- [ ] All 4 tiers display correctly
- [ ] Annual discount (17%) shown
- [ ] CTA buttons link to correct actions

---

## Quick Start Commands

```bash
# Run migrations
npm run migrate:up

# Check migration status
npm run migrate:status

# Start dev server
npm run dev

# Visit pricing page
open http://localhost:3000/pricing

# Test with curl
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/insights/revenue?businessId=xxx"
```

---

That's it! Your revenue system is fully implemented and ready to use. 🎉
