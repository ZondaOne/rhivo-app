-- Migration 021: Add capacity validation trigger for reservations
-- This provides a final safety net to prevent capacity violations
-- even if application logic is bypassed

-- Function to check reservation capacity constraint
-- This mirrors the check_appointment_capacity() function but for reservations
CREATE OR REPLACE FUNCTION check_reservation_capacity()
RETURNS TRIGGER AS $$
DECLARE
    max_capacity INTEGER;
    current_count INTEGER;
    slot_start_val TIMESTAMPTZ;
    slot_end_val TIMESTAMPTZ;
BEGIN
    -- Use NEW values for the slot times
    slot_start_val := NEW.slot_start;
    slot_end_val := NEW.slot_end;

    -- Get max simultaneous bookings for this service
    -- NOTE: This reads from database column as backstop validation only
    -- Application code MUST use YAML config as single source of truth
    SELECT COALESCE(max_simultaneous_bookings, 1) INTO max_capacity
    FROM services
    WHERE id = NEW.service_id;

    -- If service not found or no capacity defined, allow 1 by default
    IF max_capacity IS NULL THEN
        max_capacity := 1;
    END IF;

    -- Count overlapping bookings (both reservations and appointments)
    -- This is the final backstop validation
    SELECT COUNT(*) INTO current_count
    FROM (
        -- Count confirmed appointments in the slot
        SELECT 1
        FROM appointments
        WHERE service_id = NEW.service_id
          AND business_id = NEW.business_id
          AND deleted_at IS NULL
          AND status IN ('confirmed', 'completed')
          AND slot_start < slot_end_val
          AND slot_end > slot_start_val

        UNION ALL

        -- Count active reservations in the slot (excluding current if updating)
        SELECT 1
        FROM reservations
        WHERE service_id = NEW.service_id
          AND business_id = NEW.business_id
          AND expires_at > NOW()
          AND slot_start < slot_end_val
          AND slot_end > slot_start_val
          AND (TG_OP = 'INSERT' OR id != NEW.id)
    ) AS overlapping_bookings;

    -- Check if capacity would be exceeded
    IF current_count >= max_capacity THEN
        RAISE EXCEPTION 'Reservation capacity exceeded for this time slot (max: %, current: %)',
            max_capacity, current_count;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce capacity on insert/update
-- This runs AFTER advisory lock has been acquired in application code
-- Acts as final safety net against bugs or direct DB manipulation
CREATE TRIGGER reservations_capacity_check
    BEFORE INSERT OR UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION check_reservation_capacity();

-- Add comments
COMMENT ON FUNCTION check_reservation_capacity() IS
'Validates reservation capacity constraints as final safety net. Application code uses YAML config for primary validation.';

COMMENT ON TRIGGER reservations_capacity_check ON reservations IS
'Prevents capacity violations by enforcing max_simultaneous_bookings limit. Runs after advisory lock acquisition in application.';
