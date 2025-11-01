/**
 * Feature Gating System
 * Controls access to features based on subscription tier
 */

import { getDbClient } from '@/db/client';
import {
  TIER_FEATURES,
  type SubscriptionFeatures
} from './pricing-tiers';

// Re-export types and constants
export type { SubscriptionFeatures };
export { TIER_FEATURES };

/**
 * Get subscription features for a business
 */
export async function getBusinessFeatures(businessId: string): Promise<SubscriptionFeatures> {
  const sql = getDbClient();
  const [business] = await sql`
    SELECT subscription_tier FROM businesses WHERE id = ${businessId}
  `;

  const tier = business?.subscription_tier || 'free';
  return TIER_FEATURES[tier];
}

/**
 * Check if business has access to a specific feature
 */
export async function hasFeature(
  businessId: string,
  feature: keyof SubscriptionFeatures
): Promise<boolean> {
  const features = await getBusinessFeatures(businessId);
  const value = features[feature];

  // Handle different types of feature values
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') return value !== 'none' && value !== 'community';

  return !!value;
}

/**
 * Get feature access result with upgrade information
 */
export async function checkFeatureAccess(
  businessId: string,
  feature: keyof SubscriptionFeatures
): Promise<{
  hasAccess: boolean;
  currentTier: string;
  suggestedTier?: string;
  upgradeMessage?: string;
}> {
  const features = await getBusinessFeatures(businessId);
  const hasAccess = await hasFeature(businessId, feature);

  if (!hasAccess) {
    const suggestedTier = getSuggestedTier(feature);
    return {
      hasAccess: false,
      currentTier: features.tier,
      suggestedTier,
      upgradeMessage: getUpgradeMessage(feature, suggestedTier),
    };
  }

  return {
    hasAccess: true,
    currentTier: features.tier,
  };
}

/**
 * Get suggested tier for a feature
 */
function getSuggestedTier(feature: keyof SubscriptionFeatures): string {
  // Features available in Basic tier
  if ([
    'brandingEnabled',
    'analyticsLevel',
    'exportData',
    'customerDatabase',
    'automatedReminders',
    'removeWatermark',
  ].includes(feature)) {
    return 'basic';
  }

  // Features available in Pro tier
  if ([
    'apiAccess',
    'multiLocation',
    'customDomain',
  ].includes(feature)) {
    return 'pro';
  }

  // Features available in Enterprise tier
  if (['whiteLabel'].includes(feature)) {
    return 'enterprise';
  }

  return 'basic';
}

/**
 * Get user-friendly upgrade message
 */
function getUpgradeMessage(feature: keyof SubscriptionFeatures, suggestedTier: string): string {
  const tierNames: Record<string, string> = {
    basic: 'Professional',
    pro: 'Growth',
    enterprise: 'Enterprise',
  };

  const featureNames: Record<string, string> = {
    brandingEnabled: 'Custom branding',
    analyticsLevel: 'Analytics and insights',
    exportData: 'Data export',
    customerDatabase: 'Customer database',
    automatedReminders: 'Automated reminders',
    removeWatermark: 'Remove Rhivo branding',
    apiAccess: 'API access',
    multiLocation: 'Multi-location support',
    customDomain: 'Custom domain',
    whiteLabel: 'Full white-label',
  };

  const featureName = featureNames[feature] || feature;
  const tierName = tierNames[suggestedTier] || suggestedTier;

  return `${featureName} requires the ${tierName} plan or higher`;
}

/**
 * Check if business can add more staff
 */
export async function canAddStaff(businessId: string): Promise<{
  allowed: boolean;
  currentCount: number;
  maxAllowed: number;
  reason?: string;
}> {
  const sql = getDbClient();

  const [business] = await sql`
    SELECT subscription_tier, max_staff_members FROM businesses WHERE id = ${businessId}
  `;

  const [staffCount] = await sql`
    SELECT COUNT(*) as count FROM users
    WHERE business_id = ${businessId}
      AND role IN ('owner', 'staff')
      AND deleted_at IS NULL
  `;

  const features = TIER_FEATURES[business.subscription_tier || 'free'];
  const currentCount = parseInt(staffCount.count);
  const maxAllowed = features.maxStaff;

  if (currentCount >= maxAllowed) {
    return {
      allowed: false,
      currentCount,
      maxAllowed,
      reason: `Your ${features.tier} plan supports up to ${maxAllowed} staff member${maxAllowed === 1 ? '' : 's'}. Upgrade to add more.`,
    };
  }

  return {
    allowed: true,
    currentCount,
    maxAllowed,
  };
}

/**
 * Check SMS quota
 */
export async function canSendSMS(businessId: string): Promise<{
  allowed: boolean;
  remaining: number;
  quota: number;
  reason?: string;
}> {
  const sql = getDbClient();

  const [business] = await sql`
    SELECT subscription_tier, sms_quota, sms_used_this_month, sms_reset_date
    FROM businesses WHERE id = ${businessId}
  `;

  // Reset quota if needed
  const resetDate = new Date(business.sms_reset_date);
  if (resetDate < new Date()) {
    await sql`
      UPDATE businesses
      SET sms_used_this_month = 0,
          sms_reset_date = CURRENT_DATE + INTERVAL '1 month'
      WHERE id = ${businessId}
    `;
    business.sms_used_this_month = 0;
  }

  const quota = business.sms_quota || 0;
  const remaining = quota - (business.sms_used_this_month || 0);

  if (remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      quota,
      reason: `Monthly SMS quota exceeded. Upgrade your plan for more SMS credits.`,
    };
  }

  return {
    allowed: true,
    remaining,
    quota,
  };
}

/**
 * Increment SMS usage
 */
export async function incrementSMSUsage(businessId: string): Promise<void> {
  const sql = getDbClient();
  await sql`
    UPDATE businesses
    SET sms_used_this_month = sms_used_this_month + 1
    WHERE id = ${businessId}
  `;
}

// Re-export pricing functions
export { getPricingTiers, type PricingTier } from './pricing-tiers';
