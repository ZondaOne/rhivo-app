-- Migration 018: Customer auth with flexible contact methods (Idempotent)
-- Allows customer accounts with email OR phone (at least one required)
-- Supports frictionless signup UX

BEGIN;

-- Make email nullable (allow phone-only accounts)
-- Check if column is already nullable before modifying
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name = 'email'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
    RAISE NOTICE 'Made users.email nullable';
  ELSE
    RAISE NOTICE 'users.email is already nullable, skipping';
  END IF;
END $$;

-- Add constraint: at least one contact method required
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_contact_check'
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_contact_check;
    RAISE NOTICE 'Dropped existing users_contact_check constraint';
  END IF;

  -- Add new constraint
  ALTER TABLE users ADD CONSTRAINT users_contact_check
    CHECK (
      (email IS NOT NULL AND email != '') OR
      (phone IS NOT NULL AND phone != '')
    );
  RAISE NOTICE 'Added users_contact_check constraint';
END $$;

-- Recreate unique email index (allows NULLs, case-insensitive)
DO $$
BEGIN
  DROP INDEX IF EXISTS users_email_unique_idx;
  CREATE UNIQUE INDEX users_email_unique_idx ON users(LOWER(email))
    WHERE deleted_at IS NULL AND email IS NOT NULL;
  RAISE NOTICE 'Created case-insensitive unique index on email';
END $$;

-- Clean up duplicate phone numbers before creating unique index
-- Add a suffix to duplicates to make them unique (for test data)
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update all duplicate phone numbers (keep first, modify rest)
  WITH ranked_users AS (
    SELECT
      id,
      phone,
      ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at) as rn
    FROM users
    WHERE deleted_at IS NULL AND phone IS NOT NULL
  )
  UPDATE users
  SET phone = users.phone || '-dup' || ranked_users.rn
  FROM ranked_users
  WHERE users.id = ranked_users.id
    AND ranked_users.rn > 1;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Fixed % duplicate phone numbers', updated_count;
END $$;

-- Add unique phone index (allows NULLs, case-insensitive)
DO $$
BEGIN
  DROP INDEX IF EXISTS users_phone_unique_idx;
  CREATE UNIQUE INDEX users_phone_unique_idx ON users(LOWER(phone))
    WHERE deleted_at IS NULL AND phone IS NOT NULL;
  RAISE NOTICE 'Created case-insensitive unique index on phone';
END $$;

-- Add comment for documentation
COMMENT ON CONSTRAINT users_contact_check ON users IS
  'Ensures at least one contact method (email or phone) is provided for customer accounts. Supports frictionless signup with email OR phone.';

COMMIT;

-- Verification query (run after migration)
-- SELECT
--   column_name,
--   is_nullable,
--   data_type
-- FROM information_schema.columns
-- WHERE table_name = 'users' AND column_name IN ('email', 'phone');

-- Expected result:
--  column_name | is_nullable | data_type
-- -------------+-------------+-----------
--  email       | YES         | text
--  phone       | YES         | text
