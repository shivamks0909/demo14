-- ===================================================================
-- CALLBACK_LOGS TABLE
-- ===================================================================
-- Stores every callback attempt (both success and failure)
-- For debugging, client support, and audit trail
-- ===================================================================

CREATE TABLE IF NOT EXISTS callback_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Request parameters
    project_code TEXT NOT NULL,
    clickid TEXT NOT NULL,
    type TEXT NOT NULL, -- complete, terminate, quota, security_terminate
    status_mapped TEXT, -- what we mapped the type to

    -- Response details
    response_code INTEGER, -- HTTP status we would have set
    response_body TEXT, -- what we would return
    latency_ms INTEGER, -- how long processing took

    -- Request context
    raw_query TEXT, -- full query string
    ip_address TEXT,
    user_agent TEXT,

    -- Result
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_callback_logs_project ON callback_logs(project_code);
CREATE INDEX IF NOT EXISTS idx_callback_logs_clickid ON callback_logs(clickid);
CREATE INDEX IF NOT EXISTS idx_callback_logs_created_at ON callback_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_callback_logs_success ON callback_logs(success);

-- Comment
COMMENT ON TABLE callback_logs IS 'Logs all callback attempts for debugging and audit';
COMMENT ON COLUMN callback_logs.project_code IS 'Project code from pid parameter';
COMMENT ON COLUMN callback_logs.clickid IS 'Click ID from cid parameter (maps to responses.clickid)';
COMMENT ON COLUMN callback_logs.type IS 'Original type parameter (complete/terminate/quota/security_terminate)';
COMMENT ON COLUMN callback_logs.status_mapped IS 'Internal status that was applied (complete/terminate/security_terminate/quota_full)';
