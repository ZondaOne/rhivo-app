-- Migration 013: Multi-business ownership support
-- Implements many-to-many relationship between users and businesses
-- This allows owners to manage multiple businesses through a junction table

-- =============================================================================
-- PART 1: Create business_owners junction table
-- =============================================================================

CREATE TABLE business_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique user-business pairs
  CONSTRAINT business_owners_user_business_unique UNIQUE (user_id, business_id)
);

-- Index for fast lookups by user
CREATE INDEX business_owners_user_id_idx ON business_owners(user_id);

-- Index for fast lookups by business
CREATE INDEX business_owners_business_id_idx ON business_owners(business_id);

-- Index for finding primary business
CREATE INDEX business_owners_user_primary_idx ON business_owners(user_id, is_primary)
  WHERE is_primary = true;

-- Ensure each user has at most one primary business
CREATE UNIQUE INDEX business_owners_one_primary_per_user_idx ON business_owners(user_id)
  WHERE is_primary = true;

COMMENT ON TABLE business_owners IS 'Junction table for many-to-many user-business ownership relationships';
COMMENT ON COLUMN business_owners.is_primary IS 'Indicates the default/primary business for this owner';

-- =============================================================================
-- PART 2: Migrate existing business_id data from users table
-- =============================================================================

-- Migrate existing owner relationships to junction table
-- Only migrate users with a business_id (owners/staff)
INSERT INTO business_owners (user_id, business_id, is_primary)
SELECT
  id AS user_id,
  business_id,
  true AS is_primary  -- Make all existing relationships primary
FROM users
WHERE business_id IS NOT NULL
  AND role IN ('owner', 'staff')
ON CONFLICT (user_id, business_id) DO NOTHING;

-- =============================================================================
-- PART 3: Create helper functions
-- =============================================================================

-- Function: Get all businesses for a user
CREATE OR REPLACE FUNCTION get_user_businesses(p_user_id UUID)
RETURNS TABLE (
  business_id UUID,
  subdomain TEXT,
  name TEXT,
  is_primary BOOLEAN,
  joined_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.subdomain,
    b.name,
    bo.is_primary,
    bo.created_at
  FROM business_owners bo
  JOIN businesses b ON b.id = bo.business_id
  WHERE bo.user_id = p_user_id
    AND b.deleted_at IS NULL
  ORDER BY bo.is_primary DESC, b.name ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_businesses IS 'Returns all businesses owned by a user, ordered by primary first';

-- Function: Check if user owns a business
CREATE OR REPLACE FUNCTION user_owns_business(p_user_id UUID, p_business_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM business_owners
    WHERE user_id = p_user_id
      AND business_id = p_business_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION user_owns_business IS 'Check if a user has ownership of a specific business';

-- Function: Get user's primary business
CREATE OR REPLACE FUNCTION get_primary_business(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_business_id UUID;
BEGIN
  SELECT business_id INTO v_business_id
  FROM business_owners
  WHERE user_id = p_user_id
    AND is_primary = true
  LIMIT 1;

  RETURN v_business_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_primary_business IS 'Returns the primary business ID for a user';

-- Function: Set primary business for a user
CREATE OR REPLACE FUNCTION set_primary_business(p_user_id UUID, p_business_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_owns_business BOOLEAN;
BEGIN
  -- Check if user owns the business
  v_owns_business := user_owns_business(p_user_id, p_business_id);

  IF NOT v_owns_business THEN
    RAISE EXCEPTION 'User does not own this business';
  END IF;

  -- Unset all other primary flags for this user
  UPDATE business_owners
  SET is_primary = false
  WHERE user_id = p_user_id;

  -- Set the new primary
  UPDATE business_owners
  SET is_primary = true
  WHERE user_id = p_user_id
    AND business_id = p_business_id;

  -- Update users.business_id for backward compatibility
  UPDATE users
  SET business_id = p_business_id
  WHERE id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_primary_business IS 'Sets a business as primary for a user and syncs users.business_id';

-- =============================================================================
-- PART 4: Create sync triggers for backward compatibility
-- =============================================================================

-- Trigger function: Sync users.business_id when primary changes in junction table
CREATE OR REPLACE FUNCTION sync_user_primary_business()
RETURNS TRIGGER AS $$
BEGIN
  -- If a business is being set as primary, update users.business_id
  IF NEW.is_primary = true THEN
    UPDATE users
    SET business_id = NEW.business_id
    WHERE id = NEW.user_id;
  END IF;

  -- If a business is being unset as primary and no other primary exists, set to NULL
  IF TG_OP = 'UPDATE' AND OLD.is_primary = true AND NEW.is_primary = false THEN
    -- Check if user has another primary business
    IF NOT EXISTS (
      SELECT 1 FROM business_owners
      WHERE user_id = NEW.user_id AND is_primary = true AND id != NEW.id
    ) THEN
      UPDATE users
      SET business_id = NULL
      WHERE id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_owners_sync_primary
  AFTER INSERT OR UPDATE ON business_owners
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_primary_business();

COMMENT ON FUNCTION sync_user_primary_business IS 'Syncs users.business_id with primary business in junction table';

-- Trigger function: When business_id is updated in users table, sync to junction table
CREATE OR REPLACE FUNCTION sync_junction_on_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If business_id is being set, ensure it exists in junction table and is primary
  IF NEW.business_id IS NOT NULL AND NEW.business_id IS DISTINCT FROM OLD.business_id THEN
    -- Insert if doesn't exist
    INSERT INTO business_owners (user_id, business_id, is_primary)
    VALUES (NEW.id, NEW.business_id, true)
    ON CONFLICT (user_id, business_id)
    DO UPDATE SET is_primary = true;

    -- Unset other primary flags
    UPDATE business_owners
    SET is_primary = false
    WHERE user_id = NEW.id
      AND business_id != NEW.business_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_sync_junction
  AFTER UPDATE ON users
  FOR EACH ROW
  WHEN (NEW.business_id IS DISTINCT FROM OLD.business_id)
  EXECUTE FUNCTION sync_junction_on_user_update();

COMMENT ON FUNCTION sync_junction_on_user_update IS 'Syncs junction table when users.business_id is updated';

-- =============================================================================
-- PART 5: Rollback plan
-- =============================================================================

-- To rollback this migration:
-- 1. DROP TRIGGER users_sync_junction ON users;
-- 2. DROP TRIGGER business_owners_sync_primary ON business_owners;
-- 3. DROP FUNCTION sync_junction_on_user_update();
-- 4. DROP FUNCTION sync_user_primary_business();
-- 5. DROP FUNCTION set_primary_business(UUID, UUID);
-- 6. DROP FUNCTION get_primary_business(UUID);
-- 7. DROP FUNCTION user_owns_business(UUID, UUID);
-- 8. DROP FUNCTION get_user_businesses(UUID);
-- 9. DROP TABLE business_owners;

-- =============================================================================
-- PART 6: Verification queries
-- =============================================================================

-- Verify all existing business_id relationships were migrated
DO $$
DECLARE
  v_users_count INTEGER;
  v_junction_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_users_count
  FROM users
  WHERE business_id IS NOT NULL AND role IN ('owner', 'staff');

  SELECT COUNT(*) INTO v_junction_count
  FROM business_owners;

  IF v_users_count != v_junction_count THEN
    RAISE WARNING 'Migration verification: Expected % junction records, found %',
      v_users_count, v_junction_count;
  ELSE
    RAISE NOTICE 'Migration verification: Successfully migrated % business relationships',
      v_junction_count;
  END IF;
END $$;

-- Verify each user has at most one primary business
DO $$
DECLARE
  v_multiple_primary_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_multiple_primary_count
  FROM (
    SELECT user_id
    FROM business_owners
    WHERE is_primary = true
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) multi;

  IF v_multiple_primary_count > 0 THEN
    RAISE EXCEPTION 'Data integrity error: % users have multiple primary businesses',
      v_multiple_primary_count;
  ELSE
    RAISE NOTICE 'Primary business constraint verified: No duplicate primaries found';
  END IF;
END $$;
