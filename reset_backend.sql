-- WARNING: This will DELETE ALL DATA and RECREATE the schema
-- Make sure you have backups if needed!

-- 1. Drop all custom tables (in order to respect foreign keys)
DROP TABLE IF EXISTS supplier_project_links CASCADE;
DROP TABLE IF EXISTS responses CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS callback_events CASCADE;
DROP TABLE IF EXISTS callback_logs CASCADE;
DROP TABLE IF EXISTS postback_logs CASCADE;
DROP TABLE IF EXISTS s2s_config CASCADE;
DROP TABLE IF EXISTS s2s_logs CASCADE;

-- 2. Drop custom functions
DROP FUNCTION IF EXISTS increment_quota(UUID, UUID);
DROP FUNCTION IF EXISTS get_kpis();
DROP FUNCTION IF EXISTS get_project_analytics();
DROP FUNCTION IF EXISTS get_project_health_metrics();

-- 3. Recreate schema from master-setup.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clients Table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects Table
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

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    supplier_token TEXT NOT NULL UNIQUE,
    contact_email TEXT DEFAULT '',
    platform_type TEXT DEFAULT 'custom',
    uid_macro TEXT DEFAULT 'uid',
    complete_redirect_url TEXT DEFAULT '',
    terminate_redirect_url TEXT DEFAULT '',
    quotafull_redirect_url TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Responses Table
CREATE TABLE IF NOT EXISTS responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    project_code TEXT,
    project_name TEXT,
    uid TEXT,
    user_uid TEXT,
    supplier_uid TEXT,
    client_uid_sent TEXT,
    clickid TEXT UNIQUE,
    session_token TEXT,
    oi_session TEXT,
    status TEXT NOT NULL DEFAULT 'in_progress',
    ip TEXT,
    user_agent TEXT,
    device_type TEXT DEFAULT 'Desktop',
    last_landing_page TEXT DEFAULT '',
    start_time TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supplier Project Links
CREATE TABLE IF NOT EXISTS supplier_project_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    quota_allocated INTEGER DEFAULT 0,
    quota_used INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(supplier_id, project_id)
);

-- Users Table (for auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Callback Events Table
CREATE TABLE IF NOT EXISTS callback_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    response_id UUID REFERENCES responses(id),
    event_name TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Callback Logs Table
CREATE TABLE IF NOT EXISTS callback_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    response_id UUID REFERENCES responses(id),
    url TEXT NOT NULL,
    method TEXT DEFAULT 'POST',
    request_body JSONB,
    response_status INTEGER,
    response_body TEXT,
    success BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Postback Logs Table
CREATE TABLE IF NOT EXISTS postback_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    response_id UUID REFERENCES responses(id),
    url TEXT NOT NULL,
    method TEXT DEFAULT 'GET',
    request_params JSONB,
    response_status INTEGER,
    response_body TEXT,
    success BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- S2S Config Table
CREATE TABLE IF NOT EXISTS s2s_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    secret_key TEXT NOT NULL,
    callback_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- S2S Logs Table
CREATE TABLE IF NOT EXISTS s2s_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    s2s_config_id UUID REFERENCES s2s_config(id),
    response_id UUID REFERENCES responses(id),
    request_payload JSONB,
    response_payload JSONB,
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_responses_project_id ON responses(project_id);
CREATE INDEX IF NOT EXISTS idx_responses_clickid ON responses(clickid);
CREATE INDEX IF NOT EXISTS idx_responses_status ON responses(status);
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);
CREATE INDEX IF NOT EXISTS idx_responses_source ON responses(source);
CREATE INDEX IF NOT EXISTS idx_projects_source ON projects(source);
CREATE INDEX IF NOT EXISTS idx_supplier_project_links_active ON supplier_project_links(supplier_id, project_id, status);

-- 5. Insert fallback project
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

-- 6. Create functions
-- KPI function
CREATE OR REPLACE FUNCTION get_kpis()
RETURNS JSON AS $$
DECLARE
    today DATE := CURRENT_DATE;
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_projects', (SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL),
        'active_projects', (SELECT COUNT(*) FROM projects WHERE status = 'active' AND deleted_at IS NULL),
        'total_clicks_today', (SELECT COUNT(*) FROM responses WHERE created_at::DATE = today),
        'clicks_today', (SELECT COUNT(*) FROM responses WHERE created_at::DATE = today),
        'total_responses', (SELECT COUNT(*) FROM responses),
        'total_completes_today', (SELECT COUNT(*) FROM responses WHERE status = 'complete' AND created_at::DATE = today),
        'completes_today', (SELECT COUNT(*) FROM responses WHERE status = 'complete' AND created_at::DATE = today),
        'terminates_today', (SELECT COUNT(*) FROM responses WHERE status = 'terminate' AND created_at::DATE = today),
        'quotafull_today', (SELECT COUNT(*) FROM responses WHERE status IN ('quota_full', 'quota') AND created_at::DATE = today),
        'in_progress_today', (SELECT COUNT(*) FROM responses WHERE status = 'in_progress' AND created_at::DATE = today),
        'duplicates_today', (SELECT COUNT(*) FROM responses WHERE status IN ('duplicate_ip', 'duplicate_string') AND created_at::DATE = today),
        'security_terminates_today', (SELECT COUNT(*) FROM responses WHERE status = 'security_terminate' AND created_at::DATE = today)
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Analytics function
CREATE OR REPLACE FUNCTION get_project_analytics()
RETURNS TABLE (
    project_id UUID,
    project_code TEXT,
    project_name TEXT,
    status TEXT,
    clicks BIGINT,
    completes BIGINT,
    terminates BIGINT,
    quota_full BIGINT,
    conversion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as project_id,
        p.project_code::TEXT,
        p.project_name::TEXT,
        p.status::TEXT,
        COUNT(r.id)::BIGINT as clicks,
        COUNT(r.id) FILTER (WHERE r.status = 'complete')::BIGINT as completes,
        COUNT(r.id) FILTER (WHERE r.status = 'terminate')::BIGINT as terminates,
        COUNT(r.id) FILTER (WHERE r.status IN ('quota_full', 'quota'))::BIGINT as quota_full,
        CASE 
            WHEN COUNT(r.id) > 0 THEN (COUNT(r.id) FILTER (WHERE r.status = 'complete')::NUMERIC / COUNT(r.id)::NUMERIC) * 100
            ELSE 0 
        END as conversion_rate
    FROM projects p
    LEFT JOIN responses r ON p.id = r.project_id
    WHERE p.deleted_at IS NULL
    GROUP BY p.id, p.project_code, p.project_name, p.status;
END;
$$ LANGUAGE plpgsql;

-- Health metrics function
CREATE OR REPLACE FUNCTION get_project_health_metrics()
RETURNS TABLE (
    project_id UUID,
    project_code TEXT,
    project_name TEXT,
    clicks_today BIGINT,
    in_progress_today BIGINT,
    completes_today BIGINT,
    terminates_today BIGINT,
    quotafull_today BIGINT,
    duplicates_today BIGINT,
    security_terminates_today BIGINT,
    conversion_rate NUMERIC
) AS $$
DECLARE
    today DATE := CURRENT_DATE;
BEGIN
    RETURN QUERY
    SELECT 
        p.id as project_id,
        p.project_code::TEXT,
        p.project_name::TEXT,
        COUNT(r.id) FILTER (WHERE r.created_at::DATE = today)::BIGINT as clicks_today,
        COUNT(r.id) FILTER (WHERE r.status = 'in_progress' AND r.created_at::DATE = today)::BIGINT as in_progress_today,
        COUNT(r.id) FILTER (WHERE r.status = 'complete' AND r.created_at::DATE = today)::BIGINT as completes_today,
        COUNT(r.id) FILTER (WHERE r.status = 'terminate' AND r.created_at::DATE = today)::BIGINT as terminates_today,
        COUNT(r.id) FILTER (WHERE r.status IN ('quota_full', 'quota') AND r.created_at::DATE = today)::BIGINT as quotafull_today,
        COUNT(r.id) FILTER (WHERE r.status IN ('duplicate_ip', 'duplicate_string') AND r.created_at::DATE = today)::BIGINT as duplicates_today,
        COUNT(r.id) FILTER (WHERE r.status = 'security_terminate' AND r.created_at::DATE = today)::BIGINT as security_terminates_today,
        CASE 
            WHEN COUNT(r.id) FILTER (WHERE r.created_at::DATE = today) > 0 
            THEN (COUNT(r.id) FILTER (WHERE r.status = 'complete' AND r.created_at::DATE = today)::NUMERIC / COUNT(r.id) FILTER (WHERE r.created_at::DATE = today)::NUMERIC) * 100
            ELSE 0 
        END as conversion_rate
    FROM projects p
    LEFT JOIN responses r ON p.id = r.project_id
    WHERE p.deleted_at IS NULL
    GROUP BY p.id, p.project_code, p.project_name
    ORDER BY clicks_today DESC;
END;
$$ LANGUAGE plpgsql;

-- Enhanced Quota increment function (with auto-create)
CREATE OR REPLACE FUNCTION increment_quota(
    p_project_id UUID,
    p_supplier_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_rows_updated INTEGER;
    v_link_exists BOOLEAN;
    v_project_active BOOLEAN;
    v_supplier_active BOOLEAN;
    v_complete_target INTEGER;
BEGIN
    -- 1. Try to update existing active link with room
    UPDATE supplier_project_links
    SET quota_used = quota_used + 1
    WHERE project_id = p_project_id
      AND supplier_id = p_supplier_id
      AND status = 'active'
      AND quota_used < quota_allocated;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    
    IF v_rows_updated > 0 THEN
        RETURN TRUE;
    END IF;

    -- 2. If no rows updated, check if it's because the link doesn't exist or is full
    SELECT EXISTS (
        SELECT 1 FROM supplier_project_links 
        WHERE project_id = p_project_id AND supplier_id = p_supplier_id
    ) INTO v_link_exists;

    IF v_link_exists THEN
        -- Link exists but update failed (likely full or inactive)
        RETURN FALSE;
    END IF;

    -- 3. Link doesn't exist, check project and supplier status
    SELECT (status = 'active'), complete_target 
    FROM projects 
    WHERE id = p_project_id AND deleted_at IS NULL
    INTO v_project_active, v_complete_target;

    SELECT (status = 'active')
    FROM suppliers
    WHERE id = p_supplier_id
    INTO v_supplier_active;

    IF COALESCE(v_project_active, false) AND COALESCE(v_supplier_active, false) THEN
        -- Auto-create link
        INSERT INTO supplier_project_links (
            project_id, 
            supplier_id, 
            quota_allocated, 
            quota_used, 
            status
        ) VALUES (
            p_project_id, 
            p_supplier_id, 
            GREATEST(COALESCE(v_complete_target, 10000), 100), -- Ensure at least some quota
            1, 
            'active'
        );
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
