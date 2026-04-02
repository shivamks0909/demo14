-- Migration: Add audit_logs table and supplier_project_links.quota_used
-- Run this on your InsForge/PostgreSQL database

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip ON audit_logs(ip);

-- 2. Add quota_used column to supplier_project_links if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'supplier_project_links' AND column_name = 'quota_used'
    ) THEN
        ALTER TABLE supplier_project_links ADD COLUMN quota_used INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Create index on supplier_project_links for quota checks
CREATE INDEX IF NOT EXISTS idx_supplier_project_links_quota ON supplier_project_links(supplier_id, project_id, status, quota_allocated, quota_used);
