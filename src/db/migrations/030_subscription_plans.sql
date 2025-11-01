-- Migration 030: Subscription Plans Configuration
-- Creates subscription plans lookup table

CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly_cents INTEGER,
  price_yearly_cents INTEGER,
  max_staff INTEGER,
  max_locations INTEGER DEFAULT 1,
  sms_monthly_quota INTEGER DEFAULT 0,
  features JSONB NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans matching revenue.xml spec
INSERT INTO subscription_plans (id, name, price_monthly_cents, price_yearly_cents, max_staff, max_locations, sms_monthly_quota, features) VALUES
(
  'free',
  'Starter',
  0,
  0,
  1,
  1,
  0,
  '{
    "branding": false,
    "analytics": "none",
    "watermark": true,
    "api": false,
    "support": "community",
    "export": false,
    "unlimited_bookings": true,
    "history_retention_days": 30
  }'::jsonb
),
(
  'basic',
  'Professional',
  1900,
  19000,
  5,
  1,
  100,
  '{
    "branding": true,
    "analytics": "basic",
    "watermark": false,
    "api": false,
    "support": "email_48h",
    "export": true,
    "unlimited_bookings": true,
    "history_retention_days": null,
    "customer_database": true,
    "automated_reminders": true
  }'::jsonb
),
(
  'pro',
  'Growth',
  4900,
  49000,
  15,
  3,
  500,
  '{
    "branding": true,
    "analytics": "advanced",
    "watermark": false,
    "api": true,
    "support": "email_24h",
    "export": true,
    "unlimited_bookings": true,
    "multi_location": true,
    "webhooks": true,
    "custom_domain": true,
    "customer_segments": true,
    "white_label_emails": true,
    "appointment_deposits": true,
    "no_show_tracking": true
  }'::jsonb
),
(
  'enterprise',
  'Enterprise',
  NULL,
  NULL,
  999999,
  999999,
  999999,
  '{
    "branding": true,
    "analytics": "advanced",
    "watermark": false,
    "api": true,
    "support": "phone_4h",
    "white_label": true,
    "custom": true,
    "unlimited_sms": true,
    "multi_business": true,
    "role_permissions": true,
    "sla_guarantee": true,
    "dedicated_manager": true
  }'::jsonb
);

-- Add trigger to update updated_at
CREATE TRIGGER subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE subscription_plans IS 'Available subscription tiers and pricing configuration';
COMMENT ON COLUMN subscription_plans.price_monthly_cents IS 'Monthly price in cents (NULL for enterprise/custom pricing)';
COMMENT ON COLUMN subscription_plans.price_yearly_cents IS 'Yearly price in cents (includes 17% discount)';
COMMENT ON COLUMN subscription_plans.features IS 'JSON object of feature flags and capabilities for this tier';
