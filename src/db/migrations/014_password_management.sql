-- Migration 014: Password management enhancements
-- Adds support for forced password changes and improved password reset flow

-- Add requires_password_change flag to users table
ALTER TABLE users ADD COLUMN requires_password_change BOOLEAN DEFAULT FALSE NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN users.requires_password_change IS 'Flag to force password change on next login (for onboarded accounts with temporary passwords)';

-- Update cleanup function to handle password reset expiry
-- This function already exists from migration 008, we're just ensuring consistency
-- No changes needed - password reset cleanup is already handled
