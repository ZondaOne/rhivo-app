-- Migration 004: Audit and notifications
-- Creates audit trail and notification logging

-- Audit logs table (immutable history)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    old_state JSONB,
    new_state JSONB NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for appointment history queries
CREATE INDEX audit_logs_appointment_time_idx
    ON audit_logs (appointment_id, timestamp DESC);

-- Index for actor audit queries
CREATE INDEX audit_logs_actor_idx
    ON audit_logs (actor_id, timestamp DESC)
    WHERE actor_id IS NOT NULL;

-- Function to auto-create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    action_type audit_action;
    old_data JSONB;
    new_data JSONB;
BEGIN
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        action_type := 'created';
        old_data := NULL;
        new_data := row_to_json(NEW)::JSONB;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Detect specific status changes
        IF OLD.status != NEW.status THEN
            action_type := NEW.status::TEXT::audit_action;
        ELSE
            action_type := 'modified';
        END IF;
        old_data := row_to_json(OLD)::JSONB;
        new_data := row_to_json(NEW)::JSONB;
    ELSIF TG_OP = 'DELETE' THEN
        -- Soft delete is captured as update
        RETURN OLD;
    END IF;

    -- Insert audit log
    INSERT INTO audit_logs (appointment_id, actor_id, action, old_state, new_state)
    VALUES (
        COALESCE(NEW.id, OLD.id),
        NULL, -- actor_id should be set via application context
        action_type,
        old_data,
        new_data
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create audit logs on appointment changes
CREATE TRIGGER appointments_audit_log
    AFTER INSERT OR UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

-- Notification logs table
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    recipient_email TEXT,
    recipient_phone TEXT,
    channel notification_channel NOT NULL,
    template_name TEXT NOT NULL,
    status notification_status DEFAULT 'pending' NOT NULL,
    attempts INTEGER DEFAULT 0 NOT NULL,
    last_attempt_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for appointment notifications
CREATE INDEX notification_logs_appointment_idx
    ON notification_logs (appointment_id);

-- Index for retry job queries
CREATE INDEX notification_logs_retry_idx
    ON notification_logs (status, last_attempt_at)
    WHERE status IN ('pending', 'retrying', 'failed');

-- Comments
COMMENT ON TABLE audit_logs IS 'Immutable history of all appointment state changes';
COMMENT ON COLUMN audit_logs.old_state IS 'Full JSON snapshot before change';
COMMENT ON COLUMN audit_logs.new_state IS 'Full JSON snapshot after change';

COMMENT ON TABLE notification_logs IS 'Track delivery attempts for emails, SMS, and webhooks';
COMMENT ON COLUMN notification_logs.attempts IS 'Number of delivery attempts (for retry logic)';
COMMENT ON COLUMN notification_logs.error_message IS 'Last error message for debugging failed deliveries';