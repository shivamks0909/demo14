-- InsForge Database Schema
-- Compatible with PostgreSQL

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_code TEXT NOT NULL UNIQUE,
  project_name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  country TEXT DEFAULT 'Global',
  is_multi_country BOOLEAN DEFAULT FALSE,
  has_prescreener BOOLEAN DEFAULT FALSE,
  prescreener_url TEXT DEFAULT '',
  complete_target INTEGER,
  country_urls JSONB DEFAULT '[]'::jsonb,
  pid_prefix TEXT DEFAULT '',
  pid_counter INTEGER DEFAULT 1,
  pid_padding INTEGER DEFAULT 2,
  force_pid_as_uid BOOLEAN DEFAULT FALSE,
  target_uid TEXT DEFAULT '',
  client_pid_param TEXT DEFAULT '',
  client_uid_param TEXT DEFAULT '',
  oi_prefix TEXT DEFAULT 'oi_',
  uid_params JSONB DEFAULT NULL,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  project_code VARCHAR(100) NOT NULL,
  project_name VARCHAR(255),
  uid TEXT,
  user_uid TEXT,
  supplier_uid TEXT,
  client_uid_sent TEXT,
  hash_identifier TEXT,
  session_token TEXT,
  oi_session TEXT,
  clickid VARCHAR(255) UNIQUE NOT NULL,
  hash TEXT,
  supplier_token TEXT,
  supplier_name TEXT,
  supplier TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'in_progress' CHECK (status IN (
    'in_progress', 'complete', 'terminate', 'quota_full', 
    'security_terminate', 'duplicate_ip', 'duplicate_string'
  )),
  ip INET,
  user_agent TEXT,
  device_type TEXT,
  last_landing_page TEXT,
  start_time TIMESTAMPTZ,
  raw_url TEXT,
  source VARCHAR(50) DEFAULT 'project',
  entry_time TIMESTAMPTZ,
  completion_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_responses_project_id ON responses(project_id);
CREATE INDEX IF NOT EXISTS idx_responses_clickid ON responses(clickid);
CREATE INDEX IF NOT EXISTS idx_responses_status ON responses(status);
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);
CREATE INDEX IF NOT EXISTS idx_responses_source ON responses(source);
CREATE INDEX IF NOT EXISTS idx_projects_source ON projects(source);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  supplier_token VARCHAR(100) NOT NULL UNIQUE,
  contact_email VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_project_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  quota_allocated INTEGER DEFAULT 0,
  quota_used INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(supplier_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_project_links_active ON supplier_project_links(supplier_id, project_id, status);

-- Atomic quota increment RPC function
CREATE OR REPLACE FUNCTION increment_quota(
    p_project_id UUID,
    p_supplier_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_rows_updated INTEGER;
BEGIN
    UPDATE supplier_project_links
    SET quota_used = quota_used + 1
    WHERE project_id = p_project_id
      AND supplier_id = p_supplier_id
      AND status = 'active'
      AND quota_used < quota_allocated;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

    RETURN v_rows_updated > 0;
END;
$$ LANGUAGE plpgsql;

INSERT INTO projects (id, project_code, project_name, base_url, source, status, created_at)
VALUES (
  'proj_fallback_00000000-0000-0000-0000-000000000001',
  'external_traffic',
  'External Traffic Bucket',
  'https://external.fallback',
  'auto',
  'active',
  NOW()
) ON CONFLICT (project_code) DO NOTHING;
