-- Migration 031: Pricing Inquiries
-- Creates table to store pricing inquiries from landing page

CREATE TABLE pricing_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  newsletter_subscribed BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

-- Add indexes for common queries
CREATE INDEX idx_pricing_inquiries_email ON pricing_inquiries(email);
CREATE INDEX idx_pricing_inquiries_plan_id ON pricing_inquiries(plan_id);
CREATE INDEX idx_pricing_inquiries_created_at ON pricing_inquiries(created_at DESC);
CREATE INDEX idx_pricing_inquiries_newsletter ON pricing_inquiries(newsletter_subscribed) WHERE newsletter_subscribed = true;

-- Add trigger to update updated_at
CREATE TRIGGER pricing_inquiries_updated_at
    BEFORE UPDATE ON pricing_inquiries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE pricing_inquiries IS 'Stores pricing inquiries and contact requests from landing page';
COMMENT ON COLUMN pricing_inquiries.email IS 'Customer email address for follow-up';
COMMENT ON COLUMN pricing_inquiries.plan_id IS 'Reference to the subscription plan they are interested in';
COMMENT ON COLUMN pricing_inquiries.plan_name IS 'Snapshot of plan name at time of inquiry';
COMMENT ON COLUMN pricing_inquiries.newsletter_subscribed IS 'Whether customer opted in to newsletter';
COMMENT ON COLUMN pricing_inquiries.metadata IS 'Additional information (user agent, referrer, etc.)';
