#!/usr/bin/env node

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const dataDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const dbPath = path.join(dataDir, 'local.db')
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

console.log('Ensuring schema...')

// Create tables if not exist
db.exec(`
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`)

db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  project_code TEXT NOT NULL UNIQUE,
  project_name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  client_id TEXT,
  is_multi_country BOOLEAN DEFAULT 0,
  country_urls TEXT,
  oi_prefix TEXT DEFAULT 'oi_',
  pid_prefix TEXT,
  pid_counter INTEGER DEFAULT 0,
  pid_padding INTEGER DEFAULT 2,
  force_pid_as_uid BOOLEAN DEFAULT 0,
  target_uid TEXT,
  client_pid_param TEXT,
  client_uid_param TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`)

db.exec(`
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  supplier_token TEXT NOT NULL UNIQUE,
  platform_type TEXT,
  uid_macro TEXT,
  complete_redirect_url TEXT,
  terminate_redirect_url TEXT,
  quotafull_redirect_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`)

db.exec(`
CREATE TABLE IF NOT EXISTS supplier_project_links (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  quota_allocated INTEGER DEFAULT 0,
  quota_used INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(supplier_id, project_id)
)
`)

db.exec(`
CREATE TABLE IF NOT EXISTS responses (
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
`)

db.exec(`
CREATE TABLE IF NOT EXISTS s2s_config (
  project_id TEXT PRIMARY KEY,
  secret_key TEXT NOT NULL,
  require_s2s_for_complete BOOLEAN DEFAULT 1,
  allow_test_mode BOOLEAN DEFAULT 0,
  unverified_action TEXT DEFAULT 'terminate',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
)
`)

db.exec(`
CREATE TABLE IF NOT EXISTS s2s_logs (
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
`)

db.exec(`
CREATE TABLE IF NOT EXISTS callback_logs (
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
`)

db.exec(`
CREATE TABLE IF NOT EXISTS callback_events (
  id TEXT PRIMARY KEY,
  response_id TEXT,
  project_code TEXT NOT NULL,
  clickid TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`)

console.log('Adding missing columns if needed...')
function addMissingColumns(table, needed) {
  const existing = db.prepare(`PRAGMA table_info(${table})`).all()
  const names = new Set(existing.map(c => c.name))
  needed.forEach(col => {
    if (!names.has(col.name)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${col.def}`)
      console.log(`  Added ${table}.${col.name}`)
    }
  })
}

addMissingColumns('responses', [
  { name: 'raw_url', def: 'TEXT' },
  { name: 'source', def: "TEXT DEFAULT 'project'" },
  { name: 'entry_time', def: 'TEXT' },
  { name: 'completion_time', def: 'TEXT' },
  { name: 'transaction_id', def: 'TEXT' },
  { name: 'is_manual', def: 'INTEGER DEFAULT 0' },
  { name: 's2s_token', def: 'TEXT' },
  { name: 'is_fake_suspected', def: 'BOOLEAN DEFAULT 0' },
  { name: 'user_uid', def: 'TEXT' },
  { name: 'supplier_uid', def: 'TEXT' },
  { name: 'client_uid_sent', def: 'TEXT' },
  { name: 'hash_identifier', def: 'TEXT' },
  { name: 'session_token', def: 'TEXT' },
  { name: 'oi_session', def: 'TEXT' },
  { name: 'hash', def: 'TEXT' },
  { name: 'supplier_token', def: 'TEXT' },
  { name: 'supplier_name', def: 'TEXT' },
  { name: 'supplier', def: 'TEXT' },
  { name: 'device_type', def: 'TEXT' },
  { name: 'country_code', def: 'TEXT' },
  { name: 'last_landing_page', def: 'TEXT' },
  { name: 'start_time', def: 'TEXT' },
  { name: 'duration_seconds', def: 'INTEGER' }
])

console.log('Creating indexes...')
db.exec(`
CREATE INDEX IF NOT EXISTS idx_responses_project_id ON responses(project_id);
CREATE INDEX IF NOT EXISTS idx_responses_clickid ON responses(clickid);
CREATE INDEX IF NOT EXISTS idx_responses_status ON responses(status);
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);
CREATE INDEX IF NOT EXISTS idx_responses_source ON responses(source);
CREATE INDEX IF NOT EXISTS idx_responses_transaction_id ON responses(transaction_id);
CREATE INDEX IF NOT EXISTS idx_responses_is_manual ON responses(is_manual);
CREATE INDEX IF NOT EXISTS idx_responses_s2s_token ON responses(s2s_token);
CREATE INDEX IF NOT EXISTS idx_callback_events_clickid ON callback_events(clickid);
`)

console.log('Seeding test data...')

// Client
const clientId = 'client_test_001'
try {
  db.prepare('INSERT INTO clients (id, name) VALUES (?, ?)').run(clientId, 'Test Client')
  console.log('  Client: Test Client')
} catch (e) {}

// Projects
const projects = [
  { id: 'proj_test_001', project_code: 'TEST_SINGLE', project_name: 'Test Single', base_url: 'https://survey.example.com/test-single', status: 'active', client_id: clientId, is_multi_country: 0, oi_prefix: 'oi_' },
  { id: 'proj_test_002', project_code: 'TEST_MULTI', project_name: 'Test Multi', base_url: 'https://survey.example.com/test-multi', status: 'active', client_id: clientId, is_multi_country: 1, country_urls: JSON.stringify([{country_code:'US',target_url:'https://survey.example.com/test-multi/us',active:true},{country_code:'GB',target_url:'https://survey.example.com/test-multi/gb',active:true},{country_code:'DE',target_url:'https://survey.example.com/test-multi/de',active:false}]), oi_prefix: 'oi_' },
  { id: 'proj_test_003', project_code: 'TEST_PAUSED', project_name: 'Test Paused', base_url: 'https://survey.example.com/test-paused', status: 'paused', client_id: clientId, is_multi_country: 0, oi_prefix: 'oi_' }
]

const upsertProject = db.prepare(`
INSERT OR REPLACE INTO projects (id, project_code, project_name, base_url, status, client_id, is_multi_country, country_urls, oi_prefix, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM projects WHERE id = ?), datetime('now')))
`)

projects.forEach(p => {
  upsertProject.run(p.id, p.project_code, p.project_name, p.base_url, p.status, p.client_id, p.is_multi_country, p.country_urls, p.oi_prefix, p.id)
  console.log(`  Project: ${p.project_code} (${p.status})`)
})

// Suppliers
const suppliers = [
  { id: 'supp_test_001', name: 'Dynata', supplier_token: 'DYN01', platform_type: 'dynata', uid_macro: '##RID##', complete_redirect_url: 'https://dynata.example.com/complete?uid=[uid]', terminate_redirect_url: 'https://dynata.example.com/terminate?uid=[uid]', quotafull_redirect_url: 'https://dynata.example.com/quotafull?uid=[uid]', status: 'active' },
  { id: 'supp_test_002', name: 'Lucid', supplier_token: 'LUC01', platform_type: 'lucid', uid_macro: '{{RESPONDENT_ID}}', status: 'active' },
  { id: 'supp_test_003', name: 'Cint', supplier_token: 'CIN01', platform_type: 'cint', uid_macro: '[%RID%]', status: 'active' }
]

const upsertSupplier = db.prepare(`
INSERT OR REPLACE INTO suppliers (id, name, supplier_token, platform_type, uid_macro, complete_redirect_url, terminate_redirect_url, quotafull_redirect_url, status, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM suppliers WHERE id = ?), datetime('now')))
`)

suppliers.forEach(s => {
  upsertSupplier.run(s.id, s.name, s.supplier_token, s.platform_type, s.uid_macro, s.complete_redirect_url, s.terminate_redirect_url, s.quotafull_redirect_url, s.status, s.id)
  console.log(`  Supplier: ${s.supplier_token}`)
})

// Links
const links = [
  { id: 'link_test_001', supplier_id: 'supp_test_001', project_id: 'proj_test_001', quota_allocated: 0, quota_used: 0, status: 'active' },
  { id: 'link_test_002', supplier_id: 'supp_test_002', project_id: 'proj_test_002', quota_allocated: 50, quota_used: 0, status: 'active' },
  { id: 'link_test_003', supplier_id: 'supp_test_003', project_id: 'proj_test_001', quota_allocated: 100, quota_used: 0, status: 'active' }
]

const upsertLink = db.prepare(`
INSERT OR REPLACE INTO supplier_project_links (id, supplier_id, project_id, quota_allocated, quota_used, status, created_at)
VALUES (?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM supplier_project_links WHERE id = ?), datetime('now')))
`)

links.forEach(l => {
  upsertLink.run(l.id, l.supplier_id, l.project_id, l.quota_allocated, l.quota_used, l.status, l.id)
  console.log(`  Link: ${l.id}`)
})

// S2S configs
const s2s = [
  { project_id: 'proj_test_001', secret_key: 'test-secret-key-123-for-TEST_SINGLE', require_s2s_for_complete: 1, allow_test_mode: 1 },
  { project_id: 'proj_test_002', secret_key: 'test-secret-key-456-for-TEST_MULTI', require_s2s_for_complete: 1, allow_test_mode: 1 }
]

const upsertS2S = db.prepare(`
INSERT OR REPLACE INTO s2s_config (project_id, secret_key, require_s2s_for_complete, allow_test_mode, created_at)
VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM s2s_config WHERE project_id = ?), datetime('now')))
`)

s2s.forEach(s => {
  upsertS2S.run(s.project_id, s.secret_key, s.require_s2s_for_complete, s.allow_test_mode, s.project_id)
  console.log(`  S2S: ${s.project_id}`)
})

// Summary
console.log('\nDatabase Summary:')
console.log('  Projects:', db.prepare('SELECT COUNT(*) c FROM projects').get().c)
console.log('  Suppliers:', db.prepare('SELECT COUNT(*) c FROM suppliers').get().c)
console.log('  Responses:', db.prepare('SELECT COUNT(*) c FROM responses').get().c)
console.log('\nTest data ready for local.db')

db.close()
