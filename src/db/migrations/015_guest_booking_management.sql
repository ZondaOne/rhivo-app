-- This script is idempotent and can be run multiple times safely.

-- Add booking_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='booking_id') THEN
    ALTER TABLE appointments ADD COLUMN booking_id TEXT;
  END IF;
END $$;

-- Add guest_token column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='guest_token') THEN
    ALTER TABLE appointments ADD COLUMN guest_token TEXT;
  END IF;
END $$;

-- Add guest_token_expires_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='guest_token_expires_at') THEN
    ALTER TABLE appointments ADD COLUMN guest_token_expires_at TIMESTAMPTZ;
  END IF;
END $$;


-- Create a function to generate a random string for the booking_id
CREATE OR REPLACE FUNCTION generate_booking_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := 'RIVO-';
  i INTEGER;
BEGIN
  FOR i IN 1..2 LOOP
    FOR i IN 1..3 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    IF i = 1 THEN
      result := result || '-';
    END IF;
  END LOOP;
  result := result || LPAD(floor(random() * 1000)::INTEGER::TEXT, 3, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing appointments with a unique booking_id
DO $$
DECLARE
    app_cursor CURSOR FOR
        SELECT id FROM appointments WHERE booking_id IS NULL;
    app_id UUID;
    new_booking_id TEXT;
    is_unique BOOLEAN;
BEGIN
    OPEN app_cursor;
    LOOP
        FETCH app_cursor INTO app_id;
        EXIT WHEN NOT FOUND;
        LOOP
            new_booking_id := generate_booking_id();
            SELECT NOT EXISTS (SELECT 1 FROM appointments WHERE booking_id = new_booking_id) INTO is_unique;
            EXIT WHEN is_unique;
        END LOOP;
        UPDATE appointments SET booking_id = new_booking_id WHERE id = app_id;
    END LOOP;
    CLOSE app_cursor;
END $$;

-- Add the UNIQUE constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='appointments' AND constraint_name='appointments_booking_id_unique') THEN
    -- Set NOT NULL only if we are about to add the unique constraint, which implies we just backfilled.
    -- This assumes that if the constraint exists, the column is already NOT NULL.
    ALTER TABLE appointments ALTER COLUMN booking_id SET NOT NULL;
    ALTER TABLE appointments ADD CONSTRAINT appointments_booking_id_unique UNIQUE (booking_id);
  END IF;
END $$;


-- Add an index on booking_id for faster lookups, if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'appointments_booking_id_idx' AND n.nspname = 'public') THEN
    CREATE INDEX appointments_booking_id_idx ON appointments(booking_id);
  END IF;
END $$;

-- Drop the function as it's no longer needed
DROP FUNCTION IF EXISTS generate_booking_id();