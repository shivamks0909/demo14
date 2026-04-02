-- ===================================================================
-- CALLBACK_EVENTS TABLE (Legacy Support)
-- ===================================================================
-- Used by old path-based callback route: /api/callback/[project]/[clickid]/[status]
-- Keep this for backward compatibility with existing integrations
-- ===================================================================

CREATE TABLE IF NOT EXISTS callback_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    response_id UUID REFERENCES responses(id) ON DELETE SET NULL,

    project_code TEXT NOT NULL,
    clickid TEXT NOT NULL,
    status TEXT NOT NULL, -- original status from URL
    incoming_status TEXT, -- alias for backward compat
    update_result TEXT, -- SUCCESS, FAILED, NOT_FOUND

    callback_url TEXT,
    callback_method TEXT DEFAULT 'GET',
    callback_status INTEGER,
    callback_response TEXT,

    ip TEXT,
    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_callback_events_response ON callback_events(response_id);
CREATE INDEX IF NOT EXISTS idx_callback_events_clickid ON callback_events(clickid);
CREATE INDEX IF NOT EXISTS idx_callback_events_project ON callback_events(project_code);
CREATE INDEX IF NOT EXISTS idx_callback_events_created_at ON callback_events(created_at DESC);

-- Comment
COMMENT ON TABLE callback_events IS 'Legacy callback events from path-based callback endpoint';
COMMENT ON COLUMN callback_events.response_id IS 'References responses.id if response was found';
