-- Migration 028: Optimize reservations query for slot generation
-- Adds a composite index to improve the performance of active reservation lookups

-- This index optimizes the query in /api/booking/slots that fetches active reservations:
-- WHERE business_id = X AND slot_start >= Y AND slot_start <= Z AND expires_at > NOW()
--
-- The index covers:
-- 1. business_id (filter)
-- 2. slot_start (range filter for date range)
-- 3. expires_at (included for index-only scans)
--
-- This allows Postgres to efficiently:
-- - Filter by business_id
-- - Scan the slot_start range
-- - Check expires_at without accessing the table (index-only scan)

CREATE INDEX reservations_active_slots_idx
    ON reservations (business_id, slot_start, expires_at);

COMMENT ON INDEX reservations_active_slots_idx IS 'Optimizes active reservation lookups for slot generation in booking API';
