-- Migration 011: Add external_id column to services table
-- This bridges YAML config service IDs (slugs) with database UUIDs
-- Allows public booking API to use human-readable IDs while maintaining UUID foreign keys

-- Step 1: Add external_id column (nullable initially for backfill)
ALTER TABLE services
ADD COLUMN external_id TEXT;

-- Step 2: Add comment explaining the column
COMMENT ON COLUMN services.external_id IS 
  'External identifier from YAML config (e.g., "swedish-massage-60"). Used by public booking API. Must be unique per business.';

-- Step 3: Create unique constraint on (business_id, external_id)
-- This ensures each slug is unique within a business
CREATE UNIQUE INDEX services_business_external_id_unique_idx
  ON services (business_id, external_id)
  WHERE deleted_at IS NULL AND external_id IS NOT NULL;

-- Step 4: Create index for fast lookups by external_id
CREATE INDEX services_external_id_idx
  ON services (external_id)
  WHERE deleted_at IS NULL AND external_id IS NOT NULL;

-- Step 5: Add check constraint for external_id format
-- Must be lowercase alphanumeric with hyphens, 1-100 characters
ALTER TABLE services
ADD CONSTRAINT services_external_id_format_check
  CHECK (external_id IS NULL OR external_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

ALTER TABLE services
ADD CONSTRAINT services_external_id_length_check
  CHECK (external_id IS NULL OR (LENGTH(external_id) >= 1 AND LENGTH(external_id) <= 100));
