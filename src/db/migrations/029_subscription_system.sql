-- Migration 029: Subscription System
-- Adds subscription management fields to businesses table

-- Add subscription tier tracking
ALTER TABLE businesses ADD COLUMN subscription_tier TEXT
  CHECK (subscription_tier IN ('free', 'basic', 'pro', 'enterprise'))
  DEFAULT 'free';

-- Add feature limits
ALTER TABLE businesses ADD COLUMN max_staff_members INTEGER DEFAULT 1;
ALTER TABLE businesses ADD COLUMN max_locations INTEGER DEFAULT 1;

-- Add SMS quota tracking
ALTER TABLE businesses ADD COLUMN sms_quota INTEGER DEFAULT 0;
ALTER TABLE businesses ADD COLUMN sms_used_this_month INTEGER DEFAULT 0;
ALTER TABLE businesses ADD COLUMN sms_reset_date DATE DEFAULT CURRENT_DATE + INTERVAL '1 month';

-- Add feature flags
ALTER TABLE businesses ADD COLUMN branding_enabled BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN analytics_enabled BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN remove_watermark BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN api_access_enabled BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN custom_domain TEXT;

-- Add Stripe subscription tracking
ALTER TABLE businesses ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE businesses ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE businesses ADD COLUMN subscription_status TEXT
  CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing', 'none'))
  DEFAULT 'none';
ALTER TABLE businesses ADD COLUMN trial_ends_at TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN subscription_started_at TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN subscription_canceled_at TIMESTAMPTZ;

-- Add billing information
ALTER TABLE businesses ADD COLUMN billing_email TEXT;
ALTER TABLE businesses ADD COLUMN vat_number TEXT; -- Partita IVA for Italian businesses

-- Indexes for performance
CREATE INDEX businesses_subscription_tier_idx ON businesses (subscription_tier);
CREATE INDEX businesses_stripe_customer_idx ON businesses (stripe_customer_id);
CREATE INDEX businesses_subscription_status_idx ON businesses (subscription_status);

-- Comments for documentation
COMMENT ON COLUMN businesses.subscription_tier IS 'Current subscription plan: free, basic, pro, enterprise';
COMMENT ON COLUMN businesses.stripe_subscription_id IS 'Stripe subscription ID for billing';
COMMENT ON COLUMN businesses.vat_number IS 'Italian Partita IVA for e-invoicing (B2B)';
COMMENT ON COLUMN businesses.max_staff_members IS 'Maximum staff members allowed based on subscription tier';
COMMENT ON COLUMN businesses.max_locations IS 'Maximum locations allowed (multi-location feature)';
COMMENT ON COLUMN businesses.sms_quota IS 'Monthly SMS quota based on subscription tier';
COMMENT ON COLUMN businesses.branding_enabled IS 'Can customize colors, logo, and branding';
COMMENT ON COLUMN businesses.analytics_enabled IS 'Access to analytics and insights dashboard';
COMMENT ON COLUMN businesses.remove_watermark IS 'Can remove "Powered by Rhivo" badge';
