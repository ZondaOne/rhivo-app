-- Migration 009: RLS policies for auth tables
-- Adds Row Level Security policies for auth-related tables

-- Enable RLS on auth tables
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE jwt_revocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- REFRESH TOKENS POLICIES
-- ============================================================================

-- Users can view their own refresh tokens
CREATE POLICY refresh_tokens_self_read ON refresh_tokens
    FOR SELECT
    USING (user_id = current_user_id());

-- Users can delete their own refresh tokens (logout)
CREATE POLICY refresh_tokens_self_delete ON refresh_tokens
    FOR DELETE
    USING (user_id = current_user_id());

-- System can insert refresh tokens (via auth service)
CREATE POLICY refresh_tokens_system_insert ON refresh_tokens
    FOR INSERT
    WITH CHECK (true);

-- System can update refresh tokens for revocation
CREATE POLICY refresh_tokens_system_update ON refresh_tokens
    FOR UPDATE
    USING (true);

-- ============================================================================
-- JWT REVOCATIONS POLICIES
-- ============================================================================

-- Users can view their own revoked tokens
CREATE POLICY jwt_revocations_self_read ON jwt_revocations
    FOR SELECT
    USING (user_id = current_user_id());

-- System can manage JWT revocations
CREATE POLICY jwt_revocations_system_all ON jwt_revocations
    FOR ALL
    WITH CHECK (true);

-- ============================================================================
-- RATE LIMITS POLICIES
-- ============================================================================

-- No direct user access to rate limits table
-- Only system/auth service can manage rate limits
CREATE POLICY rate_limits_system_all ON rate_limits
    FOR ALL
    WITH CHECK (true);

-- ============================================================================
-- UPDATE USERS POLICIES FOR PUBLIC SIGNUP
-- ============================================================================

-- Allow public to create customer accounts (signup)
CREATE POLICY users_public_insert ON users
    FOR INSERT
    WITH CHECK (
        role = 'customer' AND
        email IS NOT NULL AND
        password_hash IS NOT NULL
    );

-- Users can update their own profile
CREATE POLICY users_self_update ON users
    FOR UPDATE
    USING (id = current_user_id())
    WITH CHECK (id = current_user_id());

-- Comments
COMMENT ON POLICY refresh_tokens_self_read ON refresh_tokens IS 'Users can view their active sessions';
COMMENT ON POLICY refresh_tokens_self_delete ON refresh_tokens IS 'Users can logout by deleting refresh tokens';
COMMENT ON POLICY users_public_insert ON users IS 'Allow public customer signup';