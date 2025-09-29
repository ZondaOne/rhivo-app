-- Migration 003: Reservations and appointments
-- Creates reservation holds and committed appointments with concurrency control

-- Reservations table (short-lived holds with TTL)
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    slot_start TIMESTAMPTZ NOT NULL,
    slot_end TIMESTAMPTZ NOT NULL,
    idempotency_key TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Ensure slot_end is after slot_start
    CONSTRAINT reservations_time_check CHECK (slot_end > slot_start)
);

-- Unique idempotency key for retries
CREATE UNIQUE INDEX reservations_idempotency_key_unique_idx
    ON reservations (idempotency_key);

-- Prevent double-reservation of same slot (only active reservations)
-- Note: We cannot use NOW() in index predicate, so we'll enforce this via application logic
-- and cleanup job to remove expired reservations frequently
CREATE UNIQUE INDEX reservations_slot_unique_idx
    ON reservations (business_id, service_id, slot_start, expires_at);

-- Index for business calendar queries
CREATE INDEX reservations_business_time_idx
    ON reservations (business_id, slot_start);

-- Index for cleanup job (find expired reservations)
CREATE INDEX reservations_expires_at_idx
    ON reservations (expires_at);

-- Appointments table (committed bookings)
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    guest_email TEXT,
    guest_phone TEXT,
    slot_start TIMESTAMPTZ NOT NULL,
    slot_end TIMESTAMPTZ NOT NULL,
    status appointment_status DEFAULT 'confirmed' NOT NULL,
    idempotency_key TEXT NOT NULL,
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    cancellation_token TEXT,
    version INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,

    -- Ensure slot_end is after slot_start
    CONSTRAINT appointments_time_check CHECK (slot_end > slot_start),

    -- Require either authenticated user OR guest contact info
    CONSTRAINT appointments_contact_check CHECK (
        customer_id IS NOT NULL OR
        (guest_email IS NOT NULL AND guest_phone IS NOT NULL)
    )
);

-- Unique idempotency key for retries
CREATE UNIQUE INDEX appointments_idempotency_key_unique_idx
    ON appointments (idempotency_key);

-- Unique cancellation token for guest cancellations
CREATE UNIQUE INDEX appointments_cancellation_token_unique_idx
    ON appointments (cancellation_token)
    WHERE cancellation_token IS NOT NULL;

-- Index for business calendar queries
CREATE INDEX appointments_business_time_idx
    ON appointments (business_id, slot_start)
    WHERE deleted_at IS NULL;

-- Index for service queries
CREATE INDEX appointments_service_idx
    ON appointments (service_id)
    WHERE deleted_at IS NULL;

-- Index for customer queries
CREATE INDEX appointments_customer_idx
    ON appointments (customer_id)
    WHERE customer_id IS NOT NULL AND deleted_at IS NULL;

-- Trigger to update updated_at timestamp
CREATE TRIGGER appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to check appointment capacity constraint
CREATE OR REPLACE FUNCTION check_appointment_capacity()
RETURNS TRIGGER AS $$
DECLARE
    max_capacity INTEGER;
    current_count INTEGER;
BEGIN
    -- Get max simultaneous bookings for this service
    SELECT max_simultaneous_bookings INTO max_capacity
    FROM services
    WHERE id = NEW.service_id;

    -- Count overlapping confirmed appointments (excluding current if updating)
    SELECT COUNT(*) INTO current_count
    FROM appointments
    WHERE service_id = NEW.service_id
      AND deleted_at IS NULL
      AND status IN ('confirmed', 'completed')
      AND (
          (slot_start <= NEW.slot_start AND slot_end > NEW.slot_start) OR
          (slot_start < NEW.slot_end AND slot_end >= NEW.slot_end) OR
          (slot_start >= NEW.slot_start AND slot_end <= NEW.slot_end)
      )
      AND (TG_OP = 'INSERT' OR id != NEW.id);

    -- Check if capacity would be exceeded
    IF current_count >= max_capacity THEN
        RAISE EXCEPTION 'Appointment capacity exceeded for this time slot';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce capacity on insert/update
CREATE TRIGGER appointments_capacity_check
    BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION check_appointment_capacity();

-- Comments
COMMENT ON TABLE reservations IS 'Short-lived holds on timeslots with TTL to prevent overbooking';
COMMENT ON COLUMN reservations.expires_at IS 'Reservation expires after ~10 minutes; cleanup job removes expired';
COMMENT ON COLUMN reservations.idempotency_key IS 'Allows safe client retries without double-booking';

COMMENT ON TABLE appointments IS 'Committed bookings with optimistic locking and capacity enforcement';
COMMENT ON COLUMN appointments.version IS 'Optimistic locking version for concurrent edit detection';
COMMENT ON COLUMN appointments.cancellation_token IS 'Secure token for guest cancellations via email link';
COMMENT ON COLUMN appointments.reservation_id IS 'Links to consumed reservation for audit trail';