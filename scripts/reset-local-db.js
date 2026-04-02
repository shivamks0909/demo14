#!/usr/bin/env node

/**
 * Local Test Database Initialization Script
 *
 * This script creates a fresh SQLite database with sample data for testing.
 * It is safe to run in any development environment as it only affects
 * the local ./data/test_local.db file.
 *
 * DO NOT run this in production or against live databases.
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Use test_local.db for testing (separate from production local.db)
const dbPath = path.join(dataDir, 'test_local.db');

// Remove existing test DB
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('[Reset] Removed existing test_local.db');
}

const db = new Database(dbPath);

// Enable WAL mode
db.pragma('journal_mode = WAL');

console.log('[Reset] Creating tables...');

// === CLIENTS ===
db.exec(`
    CREATE TABLE clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
`);

// === PROJECTS ===
db.exec(`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      project_code TEXT NOT NULL UNIQUE,
      project_name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
      client_id TEXT,
      country TEXT DEFAULT 'Global',
      is_multi_country BOOLEAN DEFAULT 0,
      country_urls TEXT,
      has_prescreener BOOLEAN DEFAULT 0,
      prescreener_url TEXT,
      pid_prefix TEXT,
      pid_counter INTEGER DEFAULT 0,
      pid_padding INTEGER DEFAULT 2,
      force_pid_as_uid BOOLEAN DEFAULT 0,
      target_uid TEXT,
      client_pid_param TEXT,
      client_uid_param TEXT,
      oi_prefix TEXT DEFAULT 'oi_',
      uid_params TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
`);

// === SUPPLIERS ===
db.exec(`
    CREATE TABLE suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      supplier_token TEXT NOT NULL UNIQUE,
      contact_email TEXT,
      platform_type TEXT,
      uid_macro TEXT,
      complete_redirect_url TEXT,
      terminate_redirect_url TEXT,
      quotafull_redirect_url TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
`);

// === SUPPLIER_PROJECT_LINKS ===
db.exec(`
    CREATE TABLE supplier_project_links (
      id TEXT PRIMARY KEY,
      supplier_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      quota_allocated INTEGER DEFAULT 0,
      quota_used INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(supplier_id, project_id)
    )
`);

// === RESPONSES ===
db.exec(`
    CREATE TABLE responses (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      project_code TEXT,
      project_name TEXT,
      uid TEXT,
      user_uid TEXT,
      supplier_uid TEXT,
      client_uid_sent TEXT,
      hash_identifier TEXT,
      session_token TEXT,
      oi_session TEXT,
      clickid TEXT,
      hash TEXT,
      supplier_token TEXT,
      supplier_name TEXT,
      supplier TEXT,
      status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'complete', 'terminate', 'quota_full', 'security_terminate', 'duplicate_ip', 'duplicate_string')),
      ip TEXT,
      user_agent TEXT,
      device_type TEXT,
      country_code TEXT,
      last_landing_page TEXT,
      start_time TEXT,
      entry_time TEXT,
      completion_time TEXT,
      raw_url TEXT,
      source TEXT DEFAULT 'project',
      duration_seconds INTEGER,
      transaction_id TEXT,
      is_manual INTEGER DEFAULT 0,
      s2s_token TEXT,
      is_fake_suspected BOOLEAN DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT
    )
`);

// === AUDIT_LOGS ===
db.exec(`
    CREATE TABLE audit_logs (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
`);

// === S2S_CONFIG ===
db.exec(`
    CREATE TABLE s2s_config (
      project_id TEXT PRIMARY KEY,
      secret_key TEXT NOT NULL,
      allowed_ips TEXT,
      require_s2s_for_complete BOOLEAN DEFAULT 1,
      allow_test_mode BOOLEAN DEFAULT 0,
      unverified_action TEXT DEFAULT 'terminate' CHECK (unverified_action IN ('terminate', 'allow', 'flag')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT
    )
`);

// === S2S_LOGS ===
db.exec(`
    CREATE TABLE s2s_logs (
      id TEXT PRIMARY KEY,
      response_id TEXT,
      hash_match BOOLEAN,
      ip_match BOOLEAN,
      timestamp_check BOOLEAN,
      overall_result BOOLEAN,
      callback_url TEXT,
      callback_method TEXT,
      callback_status INTEGER,
      callback_response TEXT,
      verified_at TEXT NOT NULL DEFAULT (datetime('now')),
      payload TEXT
    )
`);

// === CALLBACK_LOGS ===
db.exec(`
    CREATE TABLE callback_logs (
      id TEXT PRIMARY KEY,
      project_code TEXT,
      clickid TEXT,
      type TEXT,
      status_mapped TEXT,
      response_code INTEGER,
      response_body TEXT,
      success BOOLEAN,
      error_message TEXT,
      raw_query TEXT,
      ip_address TEXT,
      user_agent TEXT,
      latency_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
`);

// === CALLBACK_EVENTS (legacy) ===
db.exec(`
    CREATE TABLE callback_events (
      id TEXT PRIMARY KEY,
      response_id TEXT,
      project_code TEXT NOT NULL,
      clickid TEXT NOT NULL,
      status TEXT NOT NULL,
      incoming_status TEXT,
      update_result TEXT,
      callback_url TEXT,
      callback_method TEXT DEFAULT 'GET',
      callback_status INTEGER,
      callback_response TEXT,
      ip TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
`);

console.log('[Reset] Creating indexes...');

// Indexes for responses
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_responses_project_id ON responses(project_id);
    CREATE INDEX IF NOT EXISTS idx_responses_clickid ON responses(clickid);
    CREATE INDEX IF NOT EXISTS idx_responses_oi_session ON responses(oi_session);
    CREATE INDEX IF NOT EXISTS idx_responses_status ON responses(status);
    CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);
    CREATE INDEX IF NOT EXISTS idx_responses_source ON responses(source);
    CREATE INDEX IF NOT EXISTS idx_responses_transaction_id ON responses(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_responses_is_manual ON responses(is_manual);
    CREATE INDEX IF NOT EXISTS idx_responses_s2s_token ON responses(s2s_token);
    CREATE INDEX IF NOT EXISTS idx_responses_fake_suspected ON responses(is_fake_suspected);
`);

// Indexes for supplier links
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_supplier_project_links_supplier ON supplier_project_links(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_supplier_project_links_project ON supplier_project_links(project_id);
`);

// Indexes for audit logs
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
`);

// Indexes for s2s_config
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_s2s_config_project ON s2s_config(project_id);
`);

// Indexes for s2s_logs
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_s2s_logs_response ON s2s_logs(response_id);
    CREATE INDEX IF NOT EXISTS idx_s2s_logs_result ON s2s_logs(overall_result);
    CREATE INDEX IF NOT EXISTS idx_s2s_logs_verified_at ON s2s_logs(verified_at);
`);

// Indexes for callback_logs
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_callback_logs_clickid ON callback_logs(clickid);
    CREATE INDEX IF NOT EXISTS idx_callback_logs_created_at ON callback_logs(created_at);
`);

// Indexes for callback_events
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_callback_events_response ON callback_events(response_id);
    CREATE INDEX IF NOT EXISTS idx_callback_events_clickid ON callback_events(clickid);
    CREATE INDEX IF NOT EXISTS idx_callback_events_project ON callback_events(project_code);
    CREATE INDEX IF NOT EXISTS idx_callback_events_created_at ON callback_events(created_at DESC);
`);

console.log('[Reset] Inserting sample data...');

// Sample client
db.prepare(`
    INSERT INTO clients (id, name) VALUES (?, ?)
`).run('client_001', 'Test Client');

// Sample projects
db.prepare(`
    INSERT INTO projects (id, project_code, project_name, base_url, status, client_id, is_multi_country, oi_prefix)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run('proj_001', 'TEST_SINGLE', 'Test Single Country', 'https://survey.example.com/study1', 'active', 'client_001', 0, 'oi_');

db.prepare(`
    INSERT INTO projects (id, project_code, project_name, base_url, status, client_id, is_multi_country, country_urls, oi_prefix)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
    'proj_002', 'TEST_MULTI', 'Test Multi-Country', 'https://survey.example.com/study2',
    'active', 'client_001', 1,
    JSON.stringify([
        { country_code: 'US', target_url: 'https://survey.example.com/study2/us', active: true },
        { country_code: 'GB', target_url: 'https://survey.example.com/study2/gb', active: true },
        { country_code: 'DE', target_url: 'https://survey.example.com/study2/de', active: false }
    ]),
    'oi_'
);

db.prepare(`
    INSERT INTO projects (id, project_code, project_name, base_url, status, client_id, is_multi_country, oi_prefix)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run('proj_003', 'TEST_PAUSED', 'Test Paused', 'https://survey.example.com/study3', 'paused', 'client_001', 0, 'oi_');

// Sample suppliers
db.prepare(`
    INSERT INTO suppliers (id, name, supplier_token, platform_type, uid_macro, complete_redirect_url, terminate_redirect_url, quotafull_redirect_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(
    'supp_001', 'Dynata Test', 'DYN01', 'dynata', '##RID##',
    'https://dynata.example.com/complete?uid=[uid]',
    'https://dynata.example.com/terminate?uid=[uid]',
    'https://dynata.example.com/quotafull?uid=[uid]'
);

db.prepare(`
    INSERT INTO suppliers (id, name, supplier_token, platform_type, uid_macro)
    VALUES (?, ?, ?, ?, ?)
`).run('supp_002', 'Lucid Test', 'LUC01', 'lucid', '{{RESPONDENT_ID}}');

db.prepare(`
    INSERT INTO suppliers (id, name, supplier_token, platform_type, uid_macro)
    VALUES (?, ?, ?, ?, ?)
`).run('supp_003', 'Cint Test', 'CIN01', 'cint', '[%RID%]');

// Supplier-project links
db.prepare(`
    INSERT INTO supplier_project_links (id, supplier_id, project_id, quota_allocated, quota_used, status)
    VALUES (?, ?, ?, ?, ?, ?)
`).run('link_001', 'supp_001', 'proj_001', 0, 0, 'active'); // unlimited

db.prepare(`
    INSERT INTO supplier_project_links (id, supplier_id, project_id, quota_allocated, quota_used, status)
    VALUES (?, ?, ?, ?, ?, ?)
`).run('link_002', 'supp_002', 'proj_002', 50, 0, 'active');

db.prepare(`
    INSERT INTO supplier_project_links (id, supplier_id, project_id, quota_allocated, quota_used, status)
    VALUES (?, ?, ?, ?, ?, ?)
`).run('link_003', 'supp_003', 'proj_001', 100, 0, 'active');

// Sample responses
const now = new Date().toISOString();
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

db.prepare(`
    INSERT INTO responses (
      id, project_id, project_code, uid, supplier_uid, session_token, oi_session,
      clickid, status, ip, user_agent, device_type, country_code, start_time,
      created_at, updated_at, transaction_id, is_manual
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
    'resp_001', 'proj_001', 'TEST_SINGLE', 'USER001', 'USER001', 'session_001', 'session_001',
    'session_001', 'complete', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
    'Desktop', 'US', oneHourAgo, oneHourAgo, now, 'txn_001', 0
);

db.prepare(`
    INSERT INTO responses (
      id, project_id, project_code, uid, supplier_uid, session_token, oi_session,
      clickid, status, ip, user_agent, device_type, country_code, start_time,
      created_at, transaction_id, is_manual
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
    'resp_002', 'proj_001', 'TEST_SINGLE', 'USER002', 'USER002', 'session_002', 'session_002',
    'session_002', 'in_progress', '192.168.1.101', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1',
    'Mobile', 'US', now, now, 'txn_002', 1
);

// S2S config
db.prepare(`
    INSERT INTO s2s_config (project_id, secret_key, require_s2s_for_complete, allow_test_mode)
    VALUES (?, ?, ?, ?)
`).run('proj_001', 'test-secret-key-123-for-TEST_SINGLE', 1, 1);

db.prepare(`
    INSERT INTO s2s_config (project_id, secret_key, require_s2s_for_complete, allow_test_mode)
    VALUES (?, ?, ?, ?)
`).run('proj_002', 'test-secret-key-456-for-TEST_MULTI', 1, 1);

// Done
console.log('\n✅ Test database created successfully!');
console.log('Location:', dbPath);
console.log('\n📊 Sample data summary:');
console.log('  • 1 client (Test Client)');
console.log('  • 3 projects (TEST_SINGLE, TEST_MULTI, TEST_PAUSED)');
console.log('  • 3 suppliers (DYN01, LUC01, CIN01)');
console.log('  • 3 supplier-project links');
console.log('  • 2 sample responses');
console.log('  • S2S config for 2 projects');
console.log('\n🔗 test URLs:');
console.log('  • GET /api/health');
console.log('  • GET /api/projects');
console.log('  • GET /api/responses');
console.log('  • GET /api/callback?clickid=session_001&status=complete');
console.log('  • GET /r/TEST_SINGLE/DYN01/UID123');

db.close();
