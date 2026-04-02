#!/usr/bin/env node

/**
 * Integration Test for Custom Init Endpoint
 * Simulates the full custom init flow including database operations
 */

const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

const dbPath = path.join(process.cwd(), 'data', 'test_local.db')

console.log('=== Custom Init Integration Test ===\n')

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Remove existing DB to start fresh
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath)
  console.log('[Cleanup] Removed existing test database')
}

// Initialize database using the local-db.ts schema logic
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

console.log('[Init] Creating schema from local-db.ts...')

// Run the full db.ts initialization
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
    client_id TEXT,
    project_code TEXT NOT NULL UNIQUE,
    project_name TEXT,
    base_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),
    has_prescreener INTEGER NOT NULL DEFAULT 0,
    prescreener_url TEXT,
    country TEXT DEFAULT 'Global',
    is_multi_country INTEGER NOT NULL DEFAULT 0,
    country_urls TEXT NOT NULL DEFAULT '[]',
    token_prefix TEXT,
    token_counter INTEGER DEFAULT 0,
    complete_cap INTEGER NOT NULL DEFAULT 0,
    complete_target INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    client_pid_param TEXT DEFAULT NULL,
    client_uid_param TEXT DEFAULT NULL,
    oi_prefix TEXT NOT NULL DEFAULT 'oi_'
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS suppliers (
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
    project_id TEXT NOT NULL,
    project_code TEXT,
    project_name TEXT,
    uid TEXT,
    user_uid TEXT,
    supplier_token TEXT,
    session_token TEXT,
    supplier TEXT DEFAULT NULL,
    oi_session TEXT DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'started', 'complete', 'terminate', 'quota', 'security_terminate', 'duplicate_ip', 'duplicate_string', 'click', 'terminated', 'quota_full')),
    started_at TEXT,
    completed_at TEXT,
    duration_seconds INTEGER,
    revenue REAL DEFAULT 0,
    cost REAL DEFAULT 0,
    margin REAL DEFAULT 0,
    fraud_score INTEGER NOT NULL DEFAULT 0,
    ip TEXT,
    user_ip TEXT,
    user_agent TEXT,
    device_type TEXT,
    country_code TEXT,
    clickid TEXT UNIQUE,
    hash TEXT,
    last_landing_page TEXT,
    reason TEXT,
    geo_mismatch INTEGER DEFAULT 0,
    vpn_flag INTEGER DEFAULT 0,
    updated_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS s2s_config (
    project_id TEXT PRIMARY KEY,
    secret_key TEXT NOT NULL,
    allowed_ips TEXT,
    require_s2s_for_complete BOOLEAN DEFAULT 1,
    allow_test_mode BOOLEAN DEFAULT 0,
    unverified_action TEXT DEFAULT 'terminate' CHECK (unverified_action IN ('terminate', 'allow', 'flag')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS s2s_logs (
    id TEXT PRIMARY KEY,
    response_id TEXT,
    hash_match INTEGER,
    ip_match INTEGER,
    timestamp_check INTEGER,
    overall_result INTEGER,
    callback_url TEXT,
    callback_method TEXT,
    callback_status INTEGER,
    callback_response TEXT,
    verified_at TEXT NOT NULL DEFAULT (datetime('now')),
    payload TEXT
  )
`)

console.log('[Schema] Base tables created')

// Add dynamic columns (like the local-db.ts does)
const responseColumns = db.pragma('table_info(responses)')
const responseColNames = responseColumns.map(col => col.name)

const addColumn = (table, column, type) => {
  if (!responseColNames.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
    console.log(`[Migration] Added ${column} to ${table}`)
  } else {
    console.log(`[Migration] ${column} already exists in ${table}`)
  }
}

addColumn('responses', 'raw_url', 'TEXT')
addColumn('responses', 'source', 'TEXT DEFAULT \'project\'')
addColumn('responses', 'entry_time', 'TEXT')
addColumn('responses', 'completion_time', 'TEXT')
addColumn('responses', 'transaction_id', 'TEXT')
addColumn('responses', 'is_manual', 'INTEGER DEFAULT 0')

console.log('[Migration] Dynamic columns added')

// Create sample project
console.log('[Seed] Inserting test project...')
db.prepare(`
  INSERT INTO projects (id, project_code, project_name, base_url, status, oi_prefix)
  VALUES (?, ?, ?, ?, ?, ?)
`).run(
  'proj_test_001',
  'TEST_PROJECT',
  'Test Project for Custom Init',
  'https://survey.example.com/test',
  'active',
  'oi_'
)

// Test 1: Simulate custom init insertion
console.log('\n[Test 1] Simulating custom init endpoint insertion...')

const now = new Date().toISOString()
const transactionId = 'custom_txn_' + Date.now()
const rid = 'custom_user_' + Date.now()
const sessionToken = 'sess_' + crypto.randomUUID ? crypto.randomUUID() : 'sess_' + Date.now()

try {
  const insertResult = db.prepare(`
    INSERT INTO responses (
      id, project_id, project_code, uid, supplier_uid, session_token, oi_session, clickid,
      status, ip, user_agent, device_type, country_code, start_time, created_at,
      transaction_id, is_manual
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'resp_custom_' + Date.now(),
    'proj_test_001',
    'TEST_PROJECT',
    rid,
    rid,
    sessionToken,
    sessionToken,
    sessionToken,
    'in_progress',
    '127.0.0.1',
    'Test-Agent/1.0',
    'Desktop',
    'US',
    now,
    now,
    transactionId,
    1
  )

  console.log(`  ✓ Inserted response (ID: ${insertResult.lastInsertRowid})`)

  // Verify
  const inserted = db.prepare(`
    SELECT id, uid, transaction_id, is_manual FROM responses
    WHERE transaction_id = ?
  `).get(transactionId)

  if (inserted && inserted.transaction_id === transactionId && inserted.is_manual === 1) {
    console.log('  ✓ Verification PASSED: transaction_id and is_manual correctly stored')
  } else {
    console.log('  ✗ Verification FAILED:', inserted)
    process.exit(1)
  }

} catch (error) {
  console.error('  ✗ Insert failed:', error.message)
  process.exit(1)
}

// Test 2: Check column types and constraints
console.log('\n[Test 2] Verifying schema...')

const pragma = db.prepare('PRAGMA table_info(responses)').all()
const txCol = pragma.find(c => c.name === 'transaction_id')
const manualCol = pragma.find(c => c.name === 'is_manual')

console.log(`  transaction_id: type=${txCol?.type}, notnull=${txCol?.notnull}, dflt_value=${txCol?.dflt_value}`)
console.log(`  is_manual: type=${manualCol?.type}, notnull=${manualCol?.notnull}, dfltd_value=${manualCol?.dflt_value}`)

if (txCol && manualCol) {
  console.log('  ✓ Both columns exist in schema')
} else {
  console.log('  ✗ Missing columns')
  process.exit(1)
}

// Test 3: Check indexes
console.log('\n[Test 3] Checking indexes...')

const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='responses'").all()
const idxTx = indexes.find(i => i.name === 'idx_responses_transaction_id')
const idxManual = indexes.find(i => i.name === 'idx_responses_is_manual')

console.log(`  Index idx_responses_transaction_id: ${idxTx ? '✓ exists' : '✗ missing'}`)
console.log(`  Index idx_responses_is_manual: ${idxManual ? '✓ exists' : '✗ missing'}`)

if (!idxTx || !idxManual) {
  console.log('  ✗ Some indexes missing')
  process.exit(1)
}

// Test 4: Verify queries work
console.log('\n[Test 4] Testing query performance...')

const start = Date.now()
const byTxn = db.prepare('SELECT * FROM responses WHERE transaction_id = ?').get(transactionId)
const byManual = db.prepare('SELECT * FROM responses WHERE is_manual = 1').all()
const elapsed = Date.now() - start

console.log(`  ✓ Queries executed in ${elapsed}ms`)
console.log(`  ✓ Found ${byTxn ? 1 : 0} response by transaction_id`)
console.log(`  ✓ Found ${byManual.length} manual responses`)

// Summary
console.log('\n=== All Tests Passed ===')
console.log('The custom init migration is complete and functional:')
console.log(`  ✓ transaction_id column: ${txCol?.type}`)
console.log(`  ✓ is_manual column: ${manualCol?.type}`)
console.log(`  ✓ Indexes created`)
console.log(`  ✓ Data insertion and querying works`)
console.log('\nDatabase ready at:', dbPath)

db.close()
process.exit(0)
