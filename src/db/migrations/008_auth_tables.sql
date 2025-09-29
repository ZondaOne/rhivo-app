-- Migration 008: Authentication and security tables
-- Adds email verification, refresh tokens, and guest tokens

-- Add auth fields to users table
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE users ADD COLUMN email_verification_token TEXT;
ALTER TABLE users ADD COLUMN email_verification_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN password_reset_token TEXT;
ALTER TABLE users ADD COLUMN password_reset_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN name TEXT;

-- Ensure password_hash is required for owners and staff, optional for guests
ALTER TABLE users ADD CONSTRAINT users_password_required_check
    CHECK (
        (role IN ('owner', 'staff') AND password_hash IS NOT NULL) OR
        (role = 'customer')
    );

-- Refresh tokens table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    device_fingerprint TEXT,
    issued_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for token lookup and cleanup
CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);
CREATE INDEX refresh_tokens_expires_at_idx ON refresh_tokens (expires_at) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX refresh_tokens_token_hash_unique_idx ON refresh_tokens (token_hash);

-- JWT revocation list (for access tokens that need immediate revocation)
CREATE TABLE jwt_revocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jti TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    revoked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

-- Index for JTI lookup during token validation
CREATE UNIQUE INDEX jwt_revocations_jti_unique_idx ON jwt_revocations (jti);
CREATE INDEX jwt_revocations_expires_at_idx ON jwt_revocations (expires_at);

-- Add guest token to appointments (will be created in appointments migration)
-- This migration assumes appointments table exists from migration 003

-- Create appointments table extension for guest tokens if appointments exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
        ALTER TABLE appointments ADD COLUMN IF NOT EXISTS guest_token_hash TEXT;
        ALTER TABLE appointments ADD COLUMN IF NOT EXISTS guest_token_expires_at TIMESTAMPTZ;

        -- Index for guest token lookups
        CREATE INDEX IF NOT EXISTS appointments_guest_token_hash_idx ON appointments (guest_token_hash);
    END IF;
END $$;

-- Rate limiting table (for login attempts, token validation)
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier TEXT NOT NULL, -- IP address, email, or token
    action TEXT NOT NULL, -- 'login', 'guest_token_validation', etc.
    attempts INTEGER DEFAULT 1 NOT NULL,
    window_start TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Composite index for rate limit lookups
CREATE UNIQUE INDEX rate_limits_identifier_action_idx ON rate_limits (identifier, action);
CREATE INDEX rate_limits_window_start_idx ON rate_limits (window_start);

-- Cleanup function for expired tokens and rate limits
CREATE OR REPLACE FUNCTION cleanup_expired_auth_data()
RETURNS void AS $$
BEGIN
    -- Clean up expired JWT revocations
    DELETE FROM jwt_revocations WHERE expires_at < NOW() - INTERVAL '1 hour';

    -- Clean up expired refresh tokens
    DELETE FROM refresh_tokens WHERE expires_at < NOW() AND revoked_at IS NOT NULL;

    -- Clean up old rate limit records (older than 24 hours)
    DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '24 hours';

    -- Clean up expired email verification tokens
    UPDATE users SET
        email_verification_token = NULL,
        email_verification_expires_at = NULL
    WHERE email_verification_expires_at < NOW();

    -- Clean up expired password reset tokens
    UPDATE users SET
        password_reset_token = NULL,
        password_reset_expires_at = NULL
    WHERE password_reset_expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE refresh_tokens IS 'Long-lived refresh tokens for JWT rotation (30 day TTL)';
COMMENT ON TABLE jwt_revocations IS 'Revoked JTI values for immediate access token invalidation';
COMMENT ON TABLE rate_limits IS 'Rate limiting for auth operations to prevent brute force attacks';
COMMENT ON COLUMN users.email_verified IS 'Whether user has verified their email address';
COMMENT ON COLUMN users.email_verification_token IS 'Hashed token for email verification (24h TTL)';