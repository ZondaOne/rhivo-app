-- Migration 024: Add buffer time columns to services table
-- Supports Step 7f (flexible service duration) and Step 7w (YAML-database consistency)
--
-- Buffer times are the setup/cleanup time before and after a service:
-- - buffer_before_minutes: Time needed before service starts (setup, room prep)
-- - buffer_after_minutes: Time needed after service ends (cleanup, turnaround)
--
-- These values come from YAML config and are synced to the database during onboarding.
-- They must be multiples of 5 minutes (enforced by check constraints).

-- Add buffer time columns
ALTER TABLE services
ADD COLUMN buffer_before_minutes INTEGER DEFAULT 0 NOT NULL
  CHECK (buffer_before_minutes >= 0 AND buffer_before_minutes <= 120),
ADD COLUMN buffer_after_minutes INTEGER DEFAULT 0 NOT NULL
  CHECK (buffer_after_minutes >= 0 AND buffer_after_minutes <= 120);

-- Add check constraints to enforce 5-minute grain alignment
ALTER TABLE services
ADD CONSTRAINT services_buffer_before_5min_grain
  CHECK (buffer_before_minutes % 5 = 0);

ALTER TABLE services
ADD CONSTRAINT services_buffer_after_5min_grain
  CHECK (buffer_after_minutes % 5 = 0);

-- Also enforce 5-minute grain on duration (if not already enforced)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'services_duration_5min_grain'
  ) THEN
    ALTER TABLE services
    ADD CONSTRAINT services_duration_5min_grain
      CHECK (duration_minutes % 5 = 0);
  END IF;
END $$;

-- Comments for documentation
COMMENT ON COLUMN services.buffer_before_minutes IS 'Setup/prep time before service starts (must be multiple of 5)';
COMMENT ON COLUMN services.buffer_after_minutes IS 'Cleanup/turnaround time after service ends (must be multiple of 5)';

-- Index for queries that need to calculate effective occupied time
-- (This is optional but helpful for future performance optimizations)
CREATE INDEX services_buffer_times_idx ON services (buffer_before_minutes, buffer_after_minutes)
  WHERE deleted_at IS NULL;
