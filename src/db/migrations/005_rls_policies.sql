-- Migration 005: Row Level Security (RLS) policies
-- Enables RLS and creates role-based access policies

-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's business_id from JWT claims
CREATE OR REPLACE FUNCTION current_user_business_id()
RETURNS UUID AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'business_id', '')::UUID;
$$ LANGUAGE SQL STABLE;

-- Helper function to get current user's role from JWT claims
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'role', '');
$$ LANGUAGE SQL STABLE;

-- Helper function to get current user's ID from JWT claims
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'user_id', '')::UUID;
$$ LANGUAGE SQL STABLE;

-- Helper function to get cancellation token from JWT claims
CREATE OR REPLACE FUNCTION current_cancellation_token()
RETURNS TEXT AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'cancellation_token', '');
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- BUSINESSES POLICIES
-- ============================================================================

-- Public can read active businesses (for booking pages)
CREATE POLICY businesses_public_read ON businesses
    FOR SELECT
    USING (status = 'active' AND deleted_at IS NULL);

-- Owners/staff can view their own business
CREATE POLICY businesses_owner_read ON businesses
    FOR SELECT
    USING (
        id = current_user_business_id() AND
        current_user_role() IN ('owner', 'staff')
    );

-- Only owners can update their business
CREATE POLICY businesses_owner_update ON businesses
    FOR UPDATE
    USING (
        id = current_user_business_id() AND
        current_user_role() = 'owner'
    );

-- ============================================================================
-- USERS POLICIES
-- ============================================================================

-- Users can view themselves
CREATE POLICY users_self_read ON users
    FOR SELECT
    USING (id = current_user_id());

-- Owners/staff can view users in their business
CREATE POLICY users_business_read ON users
    FOR SELECT
    USING (
        business_id = current_user_business_id() AND
        current_user_role() IN ('owner', 'staff')
    );

-- Owners can create staff/customer users in their business
CREATE POLICY users_owner_insert ON users
    FOR INSERT
    WITH CHECK (
        business_id = current_user_business_id() AND
        current_user_role() = 'owner'
    );

-- Owners can update users in their business
CREATE POLICY users_owner_update ON users
    FOR UPDATE
    USING (
        business_id = current_user_business_id() AND
        current_user_role() = 'owner'
    );

-- ============================================================================
-- CATEGORIES POLICIES
-- ============================================================================

-- Public can read categories for active businesses
CREATE POLICY categories_public_read ON categories
    FOR SELECT
    USING (
        deleted_at IS NULL AND
        EXISTS (
            SELECT 1 FROM businesses
            WHERE id = categories.business_id
              AND status = 'active'
              AND deleted_at IS NULL
        )
    );

-- Owners/staff can manage categories
CREATE POLICY categories_owner_all ON categories
    FOR ALL
    USING (
        business_id = current_user_business_id() AND
        current_user_role() IN ('owner', 'staff')
    );

-- ============================================================================
-- SERVICES POLICIES
-- ============================================================================

-- Public can read services for active businesses
CREATE POLICY services_public_read ON services
    FOR SELECT
    USING (
        deleted_at IS NULL AND
        EXISTS (
            SELECT 1 FROM businesses
            WHERE id = services.business_id
              AND status = 'active'
              AND deleted_at IS NULL
        )
    );

-- Owners/staff can manage services
CREATE POLICY services_owner_all ON services
    FOR ALL
    USING (
        business_id = current_user_business_id() AND
        current_user_role() IN ('owner', 'staff')
    );

-- ============================================================================
-- AVAILABILITY POLICIES
-- ============================================================================

-- Public can read availability for active businesses
CREATE POLICY availability_public_read ON availability
    FOR SELECT
    USING (
        deleted_at IS NULL AND
        EXISTS (
            SELECT 1 FROM businesses
            WHERE id = availability.business_id
              AND status = 'active'
              AND deleted_at IS NULL
        )
    );

-- Owners/staff can manage availability
CREATE POLICY availability_owner_all ON availability
    FOR ALL
    USING (
        business_id = current_user_business_id() AND
        current_user_role() IN ('owner', 'staff')
    );

-- ============================================================================
-- RESERVATIONS POLICIES
-- ============================================================================

-- Anyone can create reservations (for booking flow)
-- Business context must be provided in the insert
CREATE POLICY reservations_public_insert ON reservations
    FOR INSERT
    WITH CHECK (true);

-- Owners/staff can view all reservations for their business
CREATE POLICY reservations_owner_read ON reservations
    FOR SELECT
    USING (
        business_id = current_user_business_id() AND
        current_user_role() IN ('owner', 'staff')
    );

-- System can delete expired reservations (via cleanup job with elevated privileges)
CREATE POLICY reservations_cleanup_delete ON reservations
    FOR DELETE
    USING (expires_at < NOW());

-- ============================================================================
-- APPOINTMENTS POLICIES
-- ============================================================================

-- Customers can view their own appointments
CREATE POLICY appointments_customer_read ON appointments
    FOR SELECT
    USING (
        customer_id = current_user_id() AND
        deleted_at IS NULL
    );

-- Guest token holders can view their specific appointment
CREATE POLICY appointments_guest_read ON appointments
    FOR SELECT
    USING (
        cancellation_token = current_cancellation_token() AND
        deleted_at IS NULL
    );

-- Owners/staff can view all appointments for their business
CREATE POLICY appointments_owner_read ON appointments
    FOR SELECT
    USING (
        business_id = current_user_business_id() AND
        current_user_role() IN ('owner', 'staff')
    );

-- Anyone can create appointments (booking flow)
CREATE POLICY appointments_public_insert ON appointments
    FOR INSERT
    WITH CHECK (true);

-- Owners/staff can update appointments in their business
CREATE POLICY appointments_owner_update ON appointments
    FOR UPDATE
    USING (
        business_id = current_user_business_id() AND
        current_user_role() IN ('owner', 'staff')
    );

-- Customers can cancel their own appointments
CREATE POLICY appointments_customer_update ON appointments
    FOR UPDATE
    USING (
        customer_id = current_user_id() AND
        status = 'confirmed'
    )
    WITH CHECK (
        status = 'canceled'
    );

-- Guests can cancel via token
CREATE POLICY appointments_guest_update ON appointments
    FOR UPDATE
    USING (
        cancellation_token = current_cancellation_token() AND
        status = 'confirmed'
    )
    WITH CHECK (
        status = 'canceled'
    );

-- ============================================================================
-- AUDIT LOGS POLICIES
-- ============================================================================

-- Owners/staff can read audit logs for their business appointments
CREATE POLICY audit_logs_owner_read ON audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM appointments
            WHERE id = audit_logs.appointment_id
              AND business_id = current_user_business_id()
        ) AND
        current_user_role() IN ('owner', 'staff')
    );

-- System can insert audit logs (via trigger)
CREATE POLICY audit_logs_system_insert ON audit_logs
    FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- NOTIFICATION LOGS POLICIES
-- ============================================================================

-- Owners/staff can read notification logs for their business
CREATE POLICY notification_logs_owner_read ON notification_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM appointments
            WHERE id = notification_logs.appointment_id
              AND business_id = current_user_business_id()
        ) AND
        current_user_role() IN ('owner', 'staff')
    );

-- System can manage notification logs
CREATE POLICY notification_logs_system_all ON notification_logs
    FOR ALL
    WITH CHECK (true);

-- Comments
COMMENT ON FUNCTION current_user_business_id() IS 'Extract business_id from JWT claims for RLS';
COMMENT ON FUNCTION current_user_role() IS 'Extract role from JWT claims for RLS';
COMMENT ON FUNCTION current_user_id() IS 'Extract user_id from JWT claims for RLS';
COMMENT ON FUNCTION current_cancellation_token() IS 'Extract cancellation_token from JWT claims for guest access';