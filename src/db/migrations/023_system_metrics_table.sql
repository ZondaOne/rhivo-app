-- Migration 023: System metrics table for monitoring
-- Stores operational metrics like cleanup job status, performance, etc.

CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    metadata JSONB,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast metric lookups
CREATE INDEX system_metrics_name_time_idx
    ON system_metrics (metric_name, recorded_at DESC);

-- Index for time-range queries
CREATE INDEX system_metrics_time_idx
    ON system_metrics (recorded_at DESC);

-- Unique constraint to prevent duplicate metric recordings at same timestamp
CREATE UNIQUE INDEX system_metrics_unique_idx
    ON system_metrics (metric_name, recorded_at);

-- Comments
COMMENT ON TABLE system_metrics IS
'Stores operational metrics for monitoring system health and performance';

COMMENT ON COLUMN system_metrics.metric_name IS
'Metric identifier (e.g., reservation_cleanup_count, reservation_cleanup_duration_ms)';

COMMENT ON COLUMN system_metrics.metric_value IS
'Numeric value of the metric';

COMMENT ON COLUMN system_metrics.metadata IS
'Optional JSON metadata for additional context';

-- Create view for recent metrics (last 24 hours)
CREATE OR REPLACE VIEW recent_metrics AS
SELECT
    metric_name,
    metric_value,
    metadata,
    recorded_at
FROM system_metrics
WHERE recorded_at > NOW() - INTERVAL '24 hours'
ORDER BY recorded_at DESC;

COMMENT ON VIEW recent_metrics IS
'Shows metrics from the last 24 hours for quick monitoring dashboard access';
