-- Migration 025: Rename "rivo" to "rhivo" in existing data
-- This migration updates existing booking IDs and any other data containing "rivo" references
-- This is safe to run multiple times (idempotent)

-- 1. Update all booking IDs from RIVO- prefix to RHIVO- prefix
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Update all appointments with RIVO- prefix to RHIVO- prefix
    UPDATE appointments
    SET booking_id = REPLACE(booking_id, 'RIVO-', 'RHIVO-')
    WHERE booking_id LIKE 'RIVO-%';

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % booking IDs from RIVO- to RHIVO-', updated_count;
END $$;

-- 2. Update email addresses (if any exist with old domain)
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Update users with @demo.rivo.app to @demo.rhivo.app
    UPDATE users
    SET email = REPLACE(email, '@demo.rivo.app', '@demo.rhivo.app')
    WHERE email LIKE '%@demo.rivo.app';

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
        RAISE NOTICE 'Updated % user emails from @demo.rivo.app to @demo.rhivo.app', updated_count;
    END IF;

    -- Update users with @rivo.app to @rhivo.app (excluding demo subdomain)
    UPDATE users
    SET email = REPLACE(email, '@rivo.app', '@rhivo.app')
    WHERE email LIKE '%@rivo.app' AND email NOT LIKE '%@demo.rhivo.app';

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
        RAISE NOTICE 'Updated % user emails from @rivo.app to @rhivo.app', updated_count;
    END IF;
END $$;

-- 3. Update column comments
COMMENT ON COLUMN appointments.booking_id IS 'Human-readable booking ID (RHIVO-XXX-XXX-XXX format)';

-- 4. Verify the function that generates booking IDs uses the new prefix
-- (The function in migration 015 has already been updated by the rename script)

-- 5. Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 025 completed: All "rivo" references updated to "rhivo"';
END $$;
