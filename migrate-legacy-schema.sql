-- Migration Script: Legacy TeamExploreSearch Schema Integration
-- This script safely adds missing legacy columns to existing tables and creates missing legacy tables.

-- 1. Alter 'responses' Table
ALTER TABLE responses
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS loi_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS revenue FLOAT,
  ADD COLUMN IF NOT EXISTS cost FLOAT,
  ADD COLUMN IF NOT EXISTS margin FLOAT,
  ADD COLUMN IF NOT EXISTS fraud_score INTEGER,
  ADD COLUMN IF NOT EXISTS user_ip TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS geo_country TEXT,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS geo_mismatch BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS vpn_flag BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS client_pid TEXT;

-- 2. Create 'postback_logs' Table
CREATE TABLE IF NOT EXISTS postback_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id UUID REFERENCES responses(id) ON DELETE CASCADE,
  url TEXT,
  method TEXT,
  request_body TEXT,
  response_code INTEGER,
  response_body TEXT,
  update_result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_postback_logs_response_id ON postback_logs(response_id);

-- 3. Create 'callback_events' Table
CREATE TABLE IF NOT EXISTS callback_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clickid TEXT NOT NULL,
  project_code TEXT,
  incoming_status TEXT,
  update_result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_callback_events_clickid ON callback_events(clickid);

-- 4. Alter 'projects' Table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS token_prefix TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS token_counter INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS complete_cap INTEGER;

-- 5. Alter 'suppliers' Table
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS platform_type TEXT,
  ADD COLUMN IF NOT EXISTS uid_macro TEXT,
  ADD COLUMN IF NOT EXISTS complete_redirect_url TEXT,
  ADD COLUMN IF NOT EXISTS terminate_redirect_url TEXT,
  ADD COLUMN IF NOT EXISTS quotafull_redirect_url TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;
