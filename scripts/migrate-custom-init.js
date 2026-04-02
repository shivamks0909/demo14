#!/usr/bin/env node

/**
 * Migration Runner: Custom Init Fields
 *
 * - Adds transaction_id and is_manual columns to responses table
 * - Creates callback_events table for legacy support
 *
 * Usage:
 *   node migrate-custom-init.js
 *   DB_PATH=./data/custom.db node migrate-custom-init.js
 */

const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

// Determine database path
const defaultDbPath = path.join(process.cwd(), 'data', 'local.db')
const dbPath = process.env.DB_PATH || defaultDbPath

if (!fs.existsSync(dbPath)) {
  console.error(`❌ Database not found at: ${dbPath}`)
  console.error('Initialize the database first (run the app or seed script), or set DB_PATH correctly.')
  process.exit(1)
}

const db = new Database(dbPath)

console.log('=== Running Custom Init Migration ===')
console.log(`Database: ${dbPath}\n`)

try {
  db.pragma('foreign_keys = ON')

  // --- Migration 1: Add custom fields to responses ---
  console.log('📦 Step 1: Adding custom fields to responses table...')

  // Check current columns
  const columnsResp = db.prepare("PRAGMA table_info(responses)").all()
  const columnNames = new Set(columnsResp.map(c => c.name))

  // Add transaction_id if missing
  if (!columnNames.has('transaction_id')) {
    db.exec(`ALTER TABLE responses ADD COLUMN transaction_id TEXT`)
    console.log('  ✓ Added column: transaction_id')
  } else {
    console.log('  ✓ Column transaction_id already exists')
  }

  // Add is_manual if missing (INTEGER for BOOLEAN)
  if (!columnNames.has('is_manual')) {
    db.exec(`ALTER TABLE responses ADD COLUMN is_manual INTEGER DEFAULT 0`)
    console.log('  ✓ Added column: is_manual')
  } else {
    console.log('  ✓ Column is_manual already exists')
  }

  // Add indexes if missing
  const existingIndexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='responses'").all()
  const indexNames = new Set(existingIndexes.map(i => i.name))

  if (!indexNames.has('idx_responses_transaction_id')) {
    db.exec(`CREATE INDEX idx_responses_transaction_id ON responses(transaction_id)`)
    console.log('  ✓ Created index: idx_responses_transaction_id')
  } else {
    console.log('  ✓ Index idx_responses_transaction_id already exists')
  }

  if (!indexNames.has('idx_responses_is_manual')) {
    db.exec(`CREATE INDEX idx_responses_is_manual ON responses(is_manual)`)
    console.log('  ✓ Created index: idx_responses_is_manual')
  } else {
    console.log('  ✓ Index idx_responses_is_manual already exists')
  }

  // --- Migration 2: Create callback_events table (legacy support) ---
  console.log('\n📦 Step 2: Creating callback_events table (if missing)...')

  // Check if table exists
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
  const tableNames = new Set(tables.map(t => t.name))

  if (!tableNames.has('callback_events')) {
    const callbackEventsSQL = `
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
);

CREATE INDEX idx_callback_events_response ON callback_events(response_id);
CREATE INDEX idx_callback_events_clickid ON callback_events(clickid);
CREATE INDEX idx_callback_events_project ON callback_events(project_code);
CREATE INDEX idx_callback_events_created_at ON callback_events(created_at DESC);
`
    db.exec(callbackEventsSQL)
    console.log('  ✓ Created callback_events table and indexes')
  } else {
    console.log('  ✓ callback_events table already exists')

    // Ensure indexes exist
    const cbIndexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='callback_events'").all()
    const cbIndexNames = new Set(cbIndexes.map(i => i.name))

    const neededCbIndexes = [
      'idx_callback_events_response',
      'idx_callback_events_clickid',
      'idx_callback_events_project',
      'idx_callback_events_created_at'
    ]

    neededCbIndexes.forEach(idx => {
      if (!cbIndexNames.has(idx)) {
        db.exec(`CREATE INDEX ${idx} ON callback_events(${idx.replace('idx_callback_events_', '')})`)
        console.log(`  ✓ Created missing index: ${idx}`)
      }
    })
  }

  // --- Verification ---
  console.log('\n📊 Verification:')

  // Check responses columns
  const respColumns = db.prepare("PRAGMA table_info(responses)").all()
  const newRespCols = respColumns.filter(c => ['transaction_id', 'is_manual'].includes(c.name))
  console.log('  responses columns:', newRespCols.map(c => `${c.name} (${c.type})`).join(', '))

  // Check responses indexes
  const respIndexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='responses'").all()
  const newRespIdx = respIndexes.filter(i => ['idx_responses_transaction_id', 'idx_responses_is_manual'].includes(i.name))
  console.log('  responses indexes:', newRespIdx.map(i => i.name).join(', '))

  // Check callback_events table
  const hasCallbackEvents = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='callback_events'").get()
  console.log('  callback_events table:', hasCallbackEvents ? 'exists' : 'MISSING')

  // Check callback_events indexes
  if (hasCallbackEvents) {
    const cbIdx = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='callback_events'").all()
    console.log('  callback_events indexes:', cbIdx.map(i => i.name).join(', '))
  }

  // Sample data
  const respCount = db.prepare("SELECT COUNT(*) as c FROM responses").get().c
  console.log(`\nTotal responses: ${respCount}`)

  if (respCount > 0) {
    const samples = db.prepare("SELECT id, uid, transaction_id, is_manual FROM responses LIMIT 3").all()
    console.log('Sample records:')
    samples.forEach(s => console.log(`  - ${s.id}: uid=${s.uid}, txn=${s.transaction_id || 'NULL'}, manual=${s.is_manual}`))
  }

  console.log('\n✅ All migrations completed successfully!')
  db.close()
  process.exit(0)

} catch (error) {
  console.error('\n❌ Migration failed:', error)
  db.close()
  process.exit(1)
}
