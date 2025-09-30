-- Migration 010: Fix availability and audit_logs schema issues
-- Adds missing columns for test compatibility

-- Add is_available column to availability table (as alias for NOT is_closed)
-- This provides backward compatibility with code expecting is_available
ALTER TABLE availability
ADD COLUMN is_available BOOLEAN GENERATED ALWAYS AS (NOT is_closed) STORED;

COMMENT ON COLUMN availability.is_available IS 'Virtual column: inverse of is_closed for backward compatibility';

-- Add business_id to audit_logs for easier querying
-- This denormalizes data but improves query performance significantly
ALTER TABLE audit_logs
ADD COLUMN business_id UUID;

-- Add index for business-level audit log queries
CREATE INDEX audit_logs_business_time_idx
    ON audit_logs (business_id, timestamp DESC)
    WHERE business_id IS NOT NULL;

COMMENT ON COLUMN audit_logs.business_id IS 'Denormalized business_id for faster business-level audit queries';

-- Update existing audit_logs to populate business_id from appointments
UPDATE audit_logs al
SET business_id = a.business_id
FROM appointments a
WHERE al.appointment_id = a.id
  AND al.business_id IS NULL;

-- Create function to auto-populate business_id in audit logs
CREATE OR REPLACE FUNCTION populate_audit_log_business_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Get business_id from the appointment
    SELECT business_id INTO NEW.business_id
    FROM appointments
    WHERE id = NEW.appointment_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to populate business_id on insert
CREATE TRIGGER audit_logs_populate_business_id
    BEFORE INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION populate_audit_log_business_id();