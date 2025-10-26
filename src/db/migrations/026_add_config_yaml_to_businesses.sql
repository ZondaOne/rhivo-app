-- Migration 026: Add config_yaml column to businesses table
-- This allows storing YAML configs in the database instead of filesystem
-- Enables serverless deployments (Netlify, Vercel) to work without persistent filesystem

-- Add column to store YAML config content
ALTER TABLE businesses
ADD COLUMN config_yaml TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN businesses.config_yaml IS 'YAML configuration content stored in database. Takes precedence over config_yaml_path if both exist.';

-- Create index for businesses with DB-stored configs
CREATE INDEX idx_businesses_config_yaml ON businesses (id) WHERE config_yaml IS NOT NULL;

-- Note: config_yaml_path remains for backward compatibility and file-based configs
-- Priority: config_yaml (DB) > config_yaml_path (file) > buildFromDatabase (fallback)
