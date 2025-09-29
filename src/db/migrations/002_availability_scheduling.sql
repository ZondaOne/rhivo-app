-- Migration 002: Availability and scheduling
-- Creates availability rules for businesses

-- Availability table (weekly recurring + exceptions)
CREATE TABLE availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    exception_date DATE,
    is_closed BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_at TIMESTAMPTZ,

    -- Either recurring (day_of_week) or exception (exception_date), not both
    CONSTRAINT availability_type_check CHECK (
        (day_of_week IS NOT NULL AND exception_date IS NULL) OR
        (day_of_week IS NULL AND exception_date IS NOT NULL)
    ),

    -- Start time must be before end time
    CONSTRAINT availability_time_check CHECK (start_time < end_time)
);

-- Index for recurring availability queries
CREATE INDEX availability_business_day_idx
    ON availability (business_id, day_of_week)
    WHERE day_of_week IS NOT NULL AND deleted_at IS NULL;

-- Index for exception date queries
CREATE INDEX availability_business_exception_idx
    ON availability (business_id, exception_date)
    WHERE exception_date IS NOT NULL AND deleted_at IS NULL;

-- Comments
COMMENT ON TABLE availability IS 'Weekly recurring hours and date-specific exceptions/closures';
COMMENT ON COLUMN availability.day_of_week IS '0=Sunday, 1=Monday, ..., 6=Saturday';
COMMENT ON COLUMN availability.exception_date IS 'For one-off overrides or holiday closures';
COMMENT ON COLUMN availability.is_closed IS 'Mark as closed for holidays while keeping record';