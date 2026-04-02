-- ===================================================================
-- FULL DATABASE SCHEMA MIGRATION FOR INSFORGE (Production)
-- ===================================================================
-- This script creates the complete schema for the Survey Routing Platform
-- Run this ONCE on your InsForge/PostgreSQL database
-- ===================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CLIENTS (Optional - for client hierarchy)
-- =====================================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

-- =====================================================
-- 2. PROJECTS (Main Configuration)
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_code TEXT NOT NULL UNIQUE,
    project_name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    country TEXT DEFAULT 'Global',
    is_multi_country BOOLEAN DEFAULT FALSE,

    -- Multi-country routing (JSONB array of {country_code, target_url, active})
    country_urls JSONB,

    -- PID/PID generation settings
    pid_prefix TEXT,
    pid_counter INTEGER DEFAULT 0,
    pid_padding INTEGER DEFAULT 2,
    force_pid_as_uid BOOLEAN DEFAULT FALSE,

    -- UID targeting
    target_uid TEXT,

    -- Parameter customization
    client_pid_param TEXT DEFAULT 'pid',
    client_uid_param TEXT DEFAULT 'uid',

    -- Prescreener
    has_prescreener BOOLEAN DEFAULT FALSE,
    prescreener_url TEXT,

    -- OI prefix for internal tracking params
    oi_prefix TEXT DEFAULT 'oi_',

    -- Advanced UID parameter mapping (JSONB)
    uid_params JSONB,

    -- Metadata
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'api', 'auto')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(project_code);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_source ON projects(source);

-- =====================================================
-- 3. SUPPLIERS (Vendor / Panel Configuration)
-- =====================================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    supplier_token TEXT NOT NULL UNIQUE,
    contact_email TEXT,
    platform_type TEXT, -- 'dynata', 'lucid', 'cint', etc.

    -- UID macro pattern (for reference only, not used in routing)
    uid_macro TEXT,

    -- Redirect URLs (supplier-specific end points)
    complete_redirect_url TEXT,
    terminate_redirect_url TEXT,
    quotafull_redirect_url TEXT,

    -- Notes / metadata
    notes TEXT,

    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_suppliers_token ON suppliers(supplier_token);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_platform ON suppliers(platform_type);

-- =====================================================
-- 4. SUPPLIER_PROJECT_LINKS (Assignment + Quota)
-- =====================================================
-- Junction table: which supplier can send traffic to which project
CREATE TABLE IF NOT EXISTS supplier_project_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Quota management
    quota_allocated INTEGER DEFAULT 0, -- 0 = unlimited
    quota_used INTEGER DEFAULT 0,

    -- Link configuration
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),

    -- Optional: override supplier's default redirect URLs
    custom_complete_url TEXT,
    custom_terminate_url TEXT,
    custom_quotafull_url TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,

    UNIQUE(supplier_id, project_id)
);

-- Critical indexes for quota checking performance
CREATE INDEX IF NOT EXISTS idx_supplier_project_links_supplier ON supplier_project_links(supplier_id, status);
CREATE INDEX IF NOT EXISTS idx_supplier_project_links_project ON supplier_project_links(project_id, status);
CREATE INDEX IF NOT EXISTS idx_supplier_project_links_quota ON supplier_project_links(supplier_id, project_id, status, quota_allocated, quota_used);

-- =====================================================
-- 5. RESPONSES (Core Tracking Table)
-- =====================================================
-- Every respondent session gets one row here
CREATE TABLE IF NOT EXISTS responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Project context
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    project_code TEXT NOT NULL,
    project_name TEXT,

    -- Supplier UID (original from vendor) - nullable for custom init flows
    supplier_uid TEXT,

    -- Client UID (what we send to client)
    client_uid_sent TEXT,

    -- System identifiers
    uid TEXT NOT NULL, -- original UID from link (usually same as supplier_uid)
    user_uid TEXT, -- deprecated/alias
    hash_identifier TEXT,
    session_token TEXT UNIQUE NOT NULL, -- internal UUID session
    oi_session TEXT UNIQUE NOT NULL, -- external-facing session token (same as session_token)
    clickid TEXT UNIQUE NOT NULL, -- tracking token for callbacks (same as oi_session)
    hash TEXT, -- deprecated/alias

    -- Generated PID (if project has pid_prefix)
    client_pid TEXT,

    -- Supplier reference
    supplier_token TEXT,
    supplier_name TEXT,
    supplier TEXT, -- alias for supplier_token

    -- Status lifecycle
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN (
        'in_progress',
        'complete',
        'terminate',
        'quota_full',
        'security_terminate',
        'duplicate_ip',
        'duplicate_string',
        'invalid_link',
        'project_not_found',
        'country_inactive',
        'geo_mismatch',
        'system_error'
    )),

    -- Technical metadata
    ip TEXT,
    user_agent TEXT,
    device_type TEXT CHECK (device_type IN ('Desktop', 'Mobile', 'Tablet', 'Unknown')),

    -- Geographic info
    country_code TEXT,

    -- URL & landing info
    last_landing_page TEXT,
    raw_url TEXT, -- original requested URL

    -- Timing
    start_time TIMESTAMPTZ,
    entry_time TIMESTAMPTZ,
    completion_time TIMESTAMPTZ,
    duration_seconds INTEGER,

    -- Source tracking
    source TEXT DEFAULT 'project' CHECK (source IN ('project', 'api', 'admin', 'test')),

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Critical indexes for query performance
CREATE INDEX IF NOT EXISTS idx_responses_project_id ON responses(project_id);
CREATE INDEX IF NOT EXISTS idx_responses_clickid ON responses(clickid);
CREATE INDEX IF NOT EXISTS idx_responses_oi_session ON responses(oi_session);
CREATE INDEX IF NOT EXISTS idx_responses_session_token ON responses(session_token);
CREATE INDEX IF NOT EXISTS idx_responses_status ON responses(status);
CREATE INDEX IF NOT EXISTS idx_responses_uid_project ON responses(uid, project_id);
CREATE INDEX IF NOT EXISTS idx_responses_supplier_uid ON responses(supplier_uid);
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_responses_ip ON responses(ip);
CREATE INDEX IF NOT EXISTS idx_responses_source ON responses(source);

-- =====================================================
-- 6. AUDIT_LOGS (Comprehensive Activity Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    event_type TEXT NOT NULL CHECK (event_type IN (
        'entry_denied',
        'entry_created',
        'quota_exceeded',
        'tracking_failed',
        'ip_throttled',
        'duplicate_uid',
        'duplicate_ip',
        'callback_attempt',
        'callback_success',
        'callback_idempotent',
        'callback_failed',
        's2s_verification',
        'fraud_detected',
        'admin_action',
        'system_error'
    )),

    -- Flexible payload for context
    payload JSONB NOT NULL,

    -- Request context
    ip TEXT,
    user_agent TEXT,

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip ON audit_logs(ip);
CREATE INDEX IF NOT EXISTS idx_audit_logs_payload_gin ON audit_logs USING GIN(payload);

-- =====================================================
-- 7. S2S_CONFIG (Server-to-Server Verification Secrets)
-- =====================================================
CREATE TABLE IF NOT EXISTS s2s_config (
    project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,

    -- HMAC secret key (used to verify callback signatures)
    secret_key TEXT NOT NULL,

    -- Optional IP whitelist (comma-separated or JSON array)
    allowed_ips TEXT,

    -- Enforcement rules
    require_s2s_for_complete BOOLEAN DEFAULT TRUE,
    allow_test_mode BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_s2s_config_project ON s2s_config(project_id);

-- =====================================================
-- 8. S2S_LOGS (Callback Verification Records)
-- =====================================================
CREATE TABLE IF NOT EXISTS s2s_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    response_id UUID REFERENCES responses(id) ON DELETE SET NULL,

    -- Verification results
    hash_match BOOLEAN,
    ip_match BOOLEAN,
    timestamp_check BOOLEAN,
    overall_result BOOLEAN,

    -- Callback details
    callback_url TEXT,
    callback_method TEXT,
    callback_status INTEGER,
    callback_response TEXT,

    -- Timestamp of verification attempt
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Raw payload for debugging
    payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_s2s_logs_response ON s2s_logs(response_id);
CREATE INDEX IF NOT EXISTS idx_s2s_logs_result ON s2s_logs(overall_result);
CREATE INDEX IF NOT EXISTS idx_s2s_logs_verified_at ON s2s_logs(verified_at DESC);

-- =====================================================
-- 9. CALLBACK_EVENTS TABLE (Init Route Audit)
-- =====================================================
CREATE TABLE IF NOT EXISTS callback_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    response_id UUID REFERENCES responses(id) ON DELETE SET NULL,
    project_code TEXT,
    clickid TEXT,
    status TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_callback_events_response ON callback_events(response_id);
CREATE INDEX IF NOT EXISTS idx_callback_events_clickid ON callback_events(clickid);

-- =====================================================
-- 10. CALLBACK_LOGS TABLE (Callback Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS callback_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_code TEXT,
    clickid TEXT,
    type TEXT,
    status_mapped TEXT,
    response_code INTEGER,
    response_body TEXT,
    latency_ms INTEGER,
    raw_query TEXT,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_callback_logs_project ON callback_logs(project_code);
CREATE INDEX IF NOT EXISTS idx_callback_logs_clickid ON callback_logs(clickid);
CREATE INDEX IF NOT EXISTS idx_callback_logs_created_at ON callback_logs(created_at DESC);

-- =====================================================
-- 11. FALLBACK PROJECT (for external traffic)
-- =====================================================
-- Insert a default fallback project if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM projects WHERE project_code = 'external_traffic') THEN
        INSERT INTO projects (
            id,
            project_code,
            project_name,
            base_url,
            status,
            source
        ) VALUES (
            uuid_generate_v4(),
            'external_traffic',
            'External Traffic Bucket',
            'https://external.fallback',
            'active',
            'auto'
        );
        RAISE NOTICE 'Created fallback project: external_traffic';
    END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
COMMIT;

-- Verify installation
SELECT 'Schema migration completed successfully!' as message;
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN ('clients', 'projects', 'suppliers', 'supplier_project_links', 'responses', 'audit_logs', 's2s_config', 's2s_logs')
ORDER BY table_name, ordinal_position;
