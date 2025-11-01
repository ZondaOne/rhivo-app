/**
 * Pricing Tiers Configuration
 * This file contains pricing data and doesn't require database access
 */

export interface SubscriptionFeatures {
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
  maxStaff: number;
  maxLocations: number;
  smsQuota: number;
  brandingEnabled: boolean;
  analyticsLevel: 'none' | 'basic' | 'advanced';
  removeWatermark: boolean;
  apiAccess: boolean;
  exportData: boolean;
  supportLevel: 'community' | 'email_48h' | 'email_24h' | 'phone_4h';
  customerDatabase: boolean;
  automatedReminders: boolean;
  multiLocation: boolean;
  customDomain: boolean;
  whiteLabel: boolean;
}

export const TIER_FEATURES: Record<string, SubscriptionFeatures> = {
  free: {
    tier: 'free',
    maxStaff: 1,
    maxLocations: 1,
    smsQuota: 0,
    brandingEnabled: false,
    analyticsLevel: 'none',
    removeWatermark: false,
    apiAccess: false,
    exportData: false,
    supportLevel: 'community',
    customerDatabase: false,
    automatedReminders: false,
    multiLocation: false,
    customDomain: false,
    whiteLabel: false,
  },
  basic: {
    tier: 'basic',
    maxStaff: 5,
    maxLocations: 1,
    smsQuota: 100,
    brandingEnabled: true,
    analyticsLevel: 'basic',
    removeWatermark: true,
    apiAccess: false,
    exportData: true,
    supportLevel: 'email_48h',
    customerDatabase: true,
    automatedReminders: true,
    multiLocation: false,
    customDomain: false,
    whiteLabel: false,
  },
  pro: {
    tier: 'pro',
    maxStaff: 15,
    maxLocations: 3,
    smsQuota: 500,
    brandingEnabled: true,
    analyticsLevel: 'advanced',
    removeWatermark: true,
    apiAccess: true,
    exportData: true,
    supportLevel: 'email_24h',
    customerDatabase: true,
    automatedReminders: true,
    multiLocation: true,
    customDomain: true,
    whiteLabel: false,
  },
  enterprise: {
    tier: 'enterprise',
    maxStaff: 999999,
    maxLocations: 999999,
    smsQuota: 999999,
    brandingEnabled: true,
    analyticsLevel: 'advanced',
    removeWatermark: true,
    apiAccess: true,
    exportData: true,
    supportLevel: 'phone_4h',
    customerDatabase: true,
    automatedReminders: true,
    multiLocation: true,
    customDomain: true,
    whiteLabel: true,
  },
};

/**
 * Get pricing for display
 */
export interface PricingTier {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  features: SubscriptionFeatures;
  popularFeatures: string[];
  featureKeys: string[]; // Translation keys for features
}

export function getPricingTiers(): PricingTier[] {
  return [
    {
      id: 'free',
      name: 'Starter',
      priceMonthly: 0,
      priceYearly: 0,
      features: TIER_FEATURES.free,
      popularFeatures: [
        'Unlimited bookings',
        '1 staff member',
        'QR code & booking page',
        'Email notifications',
        'Basic calendar',
      ],
      featureKeys: [
        'tiersFree.features.unlimitedBookings',
        'tiersFree.features.oneStaff',
        'tiersFree.features.qrCode',
        'tiersFree.features.emailNotifications',
        'tiersFree.features.basicCalendar',
      ],
    },
    {
      id: 'basic',
      name: 'Professional',
      priceMonthly: 19,
      priceYearly: 190,
      features: TIER_FEATURES.basic,
      popularFeatures: [
        'Up to 5 staff members',
        'Custom branding',
        'Basic analytics',
        'Customer database',
        '100 SMS/month',
        'Email support',
      ],
      featureKeys: [
        'tiersBasic.features.upTo5Staff',
        'tiersBasic.features.customBranding',
        'tiersBasic.features.basicAnalytics',
        'tiersBasic.features.customerDatabase',
        'tiersBasic.features.sms100',
        'tiersBasic.features.emailSupport',
      ],
    },
    {
      id: 'pro',
      name: 'Growth',
      priceMonthly: 49,
      priceYearly: 490,
      features: TIER_FEATURES.pro,
      popularFeatures: [
        'Up to 15 staff members',
        'Advanced analytics',
        'Up to 3 locations',
        '500 SMS/month',
        'API access',
        'Custom domain',
      ],
      featureKeys: [
        'tiersPro.features.upTo15Staff',
        'tiersPro.features.advancedAnalytics',
        'tiersPro.features.upTo3Locations',
        'tiersPro.features.sms500',
        'tiersPro.features.apiAccess',
        'tiersPro.features.customDomain',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      priceMonthly: 0, // Custom pricing
      priceYearly: 0,
      features: TIER_FEATURES.enterprise,
      popularFeatures: [
        'Unlimited staff & locations',
        'Full white-label',
        'Dedicated support',
        'Custom integrations',
        'SLA guarantee',
        'Account manager',
      ],
      featureKeys: [
        'tiersEnterprise.features.unlimitedStaffLocations',
        'tiersEnterprise.features.whiteLabel',
        'tiersEnterprise.features.dedicatedSupport',
        'tiersEnterprise.features.customIntegrations',
        'tiersEnterprise.features.slaGuarantee',
        'tiersEnterprise.features.accountManager',
      ],
    },
  ];
}
