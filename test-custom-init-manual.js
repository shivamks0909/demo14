#!/usr/bin/env node

/**
 * Manual Test for Custom Init Endpoint
 * Tests that the database operations for transaction_id and is_manual work correctly
 */

const path = require('path')
const Database = require('better-sqlite3')

const dbPath = path.join(process.cwd(), 'data', 'test_local.db')
const db = new Database(dbPath)

console.log('=== Custom Init Manual Test ===\n')

try {
  // Check if the required columns exist
  const columns = db.prepare('PRAGMA table_info(responses)').all()
  const hasTransactionId = columns.some(c => c.name === 'transaction_id')
  const hasIsManual = columns.some(c => c.name === 'is_manual')

  console.log('Schema Check:')
  console.log('  transaction_id column:', hasTransactionId ? '✓ exists' : '✗ missing')
  console.log('  is_manual column:', hasIsManual ? '✓ exists' : '✗ missing')

  if (!hasTransactionId || !hasIsManual) {
    console.error('\n❌ Schema is incomplete. Run migrate-custom-init.js first.')
    process.exit(1)
  }

  // Get initial count
  const initialCount = db.prepare('SELECT COUNT(*) as c FROM responses').get().c
  console.log(`\nCurrent responses in DB: ${initialCount}`)

  // Simulate inserting a response like the custom init route would
  console.log('\nSimulating custom init insertion...')

  const projectId = 'proj_001' // From test data
  const transactionId = 'test_txn_123'
  const rid = 'test_user_999'
  const sessionToken = 'session_test_123'
  const now = new Date().toISOString()

  const insertStmt = db.prepare(`
    INSERT INTO responses (
      id, project_id, project_code, uid, supplier_uid, session_token, oi_session, clickid,
      status, ip, user_agent, device_type, country_code, start_time, created_at,
      transaction_id, is_manual
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  insertStmt.run(
    'test_resp_custom_' + Date.now(),
    projectId,
    'TEST_SINGLE',
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
    1  // isManual = true
  )

  console.log('✓ Inserted test response with transaction_id and is_manual')

  // Verify the insertion
  const newCount = db.prepare('SELECT COUNT(*) as c FROM responses').get().c
  console.log(`New total responses: ${newCount} (added ${newCount - initialCount})`)

  const inserted = db.prepare(`
    SELECT id, uid, transaction_id, is_manual FROM responses
    WHERE transaction_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(transactionId)

  if (inserted) {
    console.log('\n✓ Verification successful:')
    console.log(`  ID: ${inserted.id}`)
    console.log(`  UID: ${inserted.uid}`)
    console.log(`  transaction_id: ${inserted.transaction_id}`)
    console.log(`  is_manual: ${inserted.is_manual}`)

    if (inserted.transaction_id === transactionId && inserted.is_manual === 1) {
      console.log('\n✅ Test PASSED: Custom init fields are working correctly!')
      process.exit(0)
    } else {
      console.log('\n❌ Test FAILED: Data mismatch')
      process.exit(1)
    }
  } else {
    console.log('\n❌ Test FAILED: Could not find inserted record')
    process.exit(1)
  }

} catch (error) {
  console.error('\n❌ Test error:', error)
  process.exit(1)
}
