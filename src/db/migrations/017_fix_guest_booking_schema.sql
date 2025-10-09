-- Migration 017: Fix guest booking schema inconsistencies
-- Fixes issues with guest token storage and constraints

-- 1. Ensure guest_token_hash column exists (might be guest_token or guest_token_hash)
DO $$
BEGIN
  -- If guest_token exists but guest_token_hash doesn't, rename it
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='guest_token')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='guest_token_hash') THEN
    ALTER TABLE appointments RENAME COLUMN guest_token TO guest_token_hash;
  END IF;

  -- If neither exists, create guest_token_hash
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='guest_token_hash') THEN
    ALTER TABLE appointments ADD COLUMN guest_token_hash TEXT;
  END IF;
END $$;

-- 2. Make guest_phone optional for guest bookings (guest access only needs email)
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_contact_check;

ALTER TABLE appointments ADD CONSTRAINT appointments_contact_check CHECK (
    customer_id IS NOT NULL OR guest_email IS NOT NULL
);

-- 3. Add index on guest_token_hash for faster lookups
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                 WHERE c.relname = 'appointments_guest_token_hash_idx' AND n.nspname = 'public') THEN
    CREATE INDEX appointments_guest_token_hash_idx ON appointments(guest_token_hash)
    WHERE guest_token_hash IS NOT NULL;
  END IF;
END $$;

-- 4. Update documentation comment
COMMENT ON COLUMN appointments.guest_token_hash IS 'Hashed guest access token for temporary booking management (bcrypt hash)';
COMMENT ON COLUMN appointments.guest_token_expires_at IS 'Expiration timestamp for guest access token (15 minutes from generation)';
COMMENT ON COLUMN appointments.booking_id IS 'Human-readable booking ID (RIVO-XXX-XXX-XXX format)';
COMMENT ON COLUMN appointments.guest_name IS 'Guest full name for display purposes';
COMMENT ON COLUMN appointments.cancellation_token IS 'DEPRECATED: Legacy cancellation token, use guest_token_hash instead';
