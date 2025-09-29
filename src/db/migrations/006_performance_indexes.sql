-- Migration 006: Additional performance indexes
-- Creates additional indexes for query optimization beyond those in foundation migrations

-- This migration adds supplementary indexes that weren't already created in earlier migrations
-- Most indexes were already created inline with table definitions

-- Add GIN index for JSONB queries on audit logs if needed
CREATE INDEX audit_logs_new_state_gin_idx
    ON audit_logs USING GIN (new_state);

CREATE INDEX audit_logs_old_state_gin_idx
    ON audit_logs USING GIN (old_state)
    WHERE old_state IS NOT NULL;

-- Composite index for common appointment queries (business + status + time)
CREATE INDEX appointments_business_status_time_idx
    ON appointments (business_id, status, slot_start)
    WHERE deleted_at IS NULL;

-- Index for finding appointments by time range across all businesses (admin queries)
CREATE INDEX appointments_global_time_idx
    ON appointments (slot_start, slot_end)
    WHERE deleted_at IS NULL AND status IN ('confirmed', 'completed');

-- Index for customer appointment history
CREATE INDEX appointments_customer_time_idx
    ON appointments (customer_id, slot_start DESC)
    WHERE customer_id IS NOT NULL AND deleted_at IS NULL;

-- Partial index for pending/failed notifications needing retry
CREATE INDEX notification_logs_pending_retry_idx
    ON notification_logs (created_at, attempts)
    WHERE status IN ('pending', 'retrying', 'failed') AND attempts < 5;

-- Index for reservation cleanup by business
CREATE INDEX reservations_business_expires_idx
    ON reservations (business_id, expires_at);

-- Composite index for service queries with category filter
CREATE INDEX services_category_active_idx
    ON services (category_id, business_id)
    WHERE deleted_at IS NULL;

-- Index for user email lookups (case-insensitive)
CREATE INDEX users_email_lower_idx
    ON users (LOWER(email))
    WHERE deleted_at IS NULL;

-- Comments
COMMENT ON INDEX audit_logs_new_state_gin_idx IS 'Enables fast JSONB queries on audit log state';
COMMENT ON INDEX appointments_business_status_time_idx IS 'Optimizes dashboard calendar queries';
COMMENT ON INDEX notification_logs_pending_retry_idx IS 'Optimizes notification retry job queries';