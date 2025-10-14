-- Migration 020: Add template_name column to notification_logs
-- Adds template_name column to track which email template was used
-- Status: Ready
-- Purpose: Track email template names for delivery logging and debugging

BEGIN;

-- Add template_name column to notification_logs
ALTER TABLE notification_logs
ADD COLUMN IF NOT EXISTS template_name TEXT;

-- Add index for template-based queries (useful for debugging delivery issues per template)
CREATE INDEX IF NOT EXISTS notification_logs_template_name_idx
ON notification_logs(template_name);

-- Add comment for documentation
COMMENT ON COLUMN notification_logs.template_name IS
  'Email template name used for this notification (e.g., appointment_confirmed, appointment_cancelled, appointment_rescheduled, appointment_reminder)';

COMMIT;

-- Verification query (run after migration)
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'notification_logs' AND column_name = 'template_name';
