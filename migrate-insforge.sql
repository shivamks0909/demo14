-- InsForge Database Schema Migration
-- Run this in the InsForge PostgREST database

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_code VARCHAR(100) NOT NULL UNIQUE,
  project_name VARCHAR(255) NOT NULL,
  base_url TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  source VARCHAR(50) DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Responses table
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_responses_project_id ON responses(project_id);
CREATE INDEX IF NOT EXISTS idx_responses_clickid ON responses(clickid);
CREATE INDEX IF NOT EXISTS idx_responses_status ON responses(status);
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);
CREATE INDEX IF NOT EXISTS idx_responses_source ON responses(source);
CREATE INDEX IF NOT EXISTS idx_projects_source ON projects(source);

-- Insert fallback project for external traffic
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

