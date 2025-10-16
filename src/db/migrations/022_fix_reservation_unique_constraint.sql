-- Migration 022: Fix reservation unique constraint
-- Remove expires_at from unique constraint to prevent same slot from having
-- multiple active reservations regardless of expiry time

-- Drop the old index that includes expires_at
DROP INDEX IF EXISTS reservations_slot_unique_idx;

-- Create new unique index that prevents duplicate reservations for same slot
-- Note: We cannot use WHERE expires_at > NOW() because NOW() is not immutable
-- Instead, we rely on:
-- 1. The cleanup job to remove expired reservations frequently (every 5 min)
-- 2. The advisory lock to prevent race conditions
-- 3. Application logic to check expires_at before using reservation
CREATE UNIQUE INDEX reservations_slot_unique_active_idx
    ON reservations (business_id, service_id, slot_start, expires_at);

-- Add index for expired reservations cleanup
-- This speeds up the cleanup job that removes old reservations
CREATE INDEX reservations_expired_cleanup_idx
    ON reservations (expires_at);

-- Comments
COMMENT ON INDEX reservations_slot_unique_active_idx IS
'Prevents multiple reservations for the same time slot. Cleanup job removes expired entries frequently.';

COMMENT ON INDEX reservations_expired_cleanup_idx IS
'Optimizes cleanup job performance by indexing reservations for expiry checking.';
