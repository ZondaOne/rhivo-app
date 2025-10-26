-- Migration 027: Convert config_yaml from TEXT to JSONB
-- This enables:
-- 1. Native JSON querying (much faster than parsing YAML)
-- 2. Indexing support (GIN indexes on specific JSON paths)
-- 3. No parsing overhead in application code

-- Step 1: Add new JSONB column
ALTER TABLE businesses
ADD COLUMN config_json JSONB;

-- Step 2: Migrate existing YAML data to JSON
-- Note: This requires yaml parsing in the application layer
-- For now, we'll leave config_yaml as TEXT and add config_json as the new primary column

-- Step 3: Add comment
COMMENT ON COLUMN businesses.config_json IS 'JSON configuration (parsed from YAML). Preferred over config_yaml for performance.';

-- Step 4: Create GIN index for fast JSON queries
CREATE INDEX idx_businesses_config_json_gin ON businesses USING GIN (config_json);

-- Step 5: Create specific indexes for commonly queried paths
CREATE INDEX idx_businesses_hide_from_discovery
  ON businesses ((config_json->'features'->>'hideFromDiscovery'))
  WHERE config_json IS NOT NULL;

-- Priority order (checked in config-loader):
-- 1. config_json (JSONB, fastest)
-- 2. config_yaml (TEXT, needs parsing)
-- 3. config_yaml_path (file, backward compatibility)
-- 4. buildFromDatabase (fallback)

-- Note: Keep both config_yaml and config_json during migration period
-- Once all configs are migrated, we can drop config_yaml in a future migration
