#!/usr/bin/env node
/**
 * Complete Setup & Verification for Custom Init Route
 * This script will:
 * 1. Verify database schema
 * 2. Apply migrations if needed
 * 3. Verify all components are ready
 * 4. Provide test instructions
 */

const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

const dbPath = path.join(process.cwd(), 'data', 'test_local.db')

console.log('╔════════════════════════════════════════════════════════════╗')
console.log('║   Custom Init Route - Complete Setup & Verification      ║')
console.log('╚════════════════════════════════════════════════════════════╝\n')

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error('❌ Database not found!')
  console.error('   Please run: node scripts/reset-local-db.js')
  process.exit(1)
}

const db = new Database(dbPath)

try {
  console.log('📊 CHECKING DATABASE SCHEMA...\n')

  // Check responses table columns
  const columns = db.prepare('PRAGMA table_info(responses)').all()
  const columnNames = new Set(columns.map(c => c.name))

  console.log('Responses table columns:')
  const requiredCols = ['transaction_id', 'is_manual']
  let allColsExist = true

  requiredCols.forEach(col => {
    const exists = columnNames.has(col)
    console.log(`  ${exists ? '✅' : '❌'} ${col}`)
    if (!exists) allColsExist = false
  })

  // Check indexes
  console.log('\n🔧 Checking indexes...')
  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='responses'").all()
  const indexNames = new Set(indexes.map(i => i.name))

  const requiredIndexes = ['idx_responses_transaction_id', 'idx_responses_is_manual']
  let allIndexesExist = true

  requiredIndexes.forEach(idx => {
    const exists = indexNames.has(idx)
    console.log(`  ${exists ? '✅' : '❌'} ${idx}`)
    if (!exists) allIndexesExist = false
  })

  // If columns or indexes missing, run migration
  if (!allColsExist || !allIndexesExist) {
    console.log('\n⚠️  Some schema elements missing. Running migration...\n')

    // Add transaction_id if missing
    if (!columnNames.has('transaction_id')) {
      db.exec('ALTER TABLE responses ADD COLUMN transaction_id TEXT')
      console.log('  ✅ Added: transaction_id')
    }

    // Add is_manual if missing
    if (!columnNames.has('is_manual')) {
      db.exec('ALTER TABLE responses ADD COLUMN is_manual INTEGER DEFAULT 0')
      console.log('  ✅ Added: is_manual')
    }

    // Add indexes if missing
    if (!indexNames.has('idx_responses_transaction_id')) {
      db.exec('CREATE INDEX idx_responses_transaction_id ON responses(transaction_id)')
      console.log('  ✅ Created: idx_responses_transaction_id')
    }

    if (!indexNames.has('idx_responses_is_manual')) {
      db.exec('CREATE INDEX idx_responses_is_manual ON responses(is_manual)')
      console.log('  ✅ Created: idx_responses_is_manual')
    }

    console.log('\n✅ Migration completed successfully!')
  } else {
    console.log('\n✅ All required columns and indexes already exist!')
  }

  // Verify sample data
  console.log('\n📈 SAMPLE DATA CHECK:')
  const respCount = db.prepare('SELECT COUNT(*) as c FROM responses').get().c
  console.log(`  Total responses: ${respCount}`)

  if (respCount > 0) {
    const samples = db.prepare('SELECT id, uid, transaction_id, is_manual FROM responses LIMIT 3').all()
    console.log('  Recent entries:')
    samples.forEach(s => {
      console.log(`    - ${s.id.slice(0, 8)}...: uid=${s.uid}, txn=${s.transaction_id || 'NULL'}, manual=${s.is_manual}`)
    })
  }

  // Check if route file exists
  console.log('\n📁 FILE CHECKS:')
  const routePath = path.join(process.cwd(), 'app', 'init', '[transactionId]', '[rid]', 'route.ts')
  const routeExists = fs.existsSync(routePath)
  console.log(`  ${routeExists ? '✅' : '❌'} Custom init route: app/init/[transactionId]/[rid]/route.ts`)

  if (routeExists) {
    console.log('     Status: Ready to handle /init/{transactionId}/{rid} URLs')
  }

  // Final summary
  console.log('\n' + '═'.repeat(60))
  console.log('✅ SETUP COMPLETE!')
  console.log('═'.repeat(60))
  console.log('\n📝 NEXT STEPS:')
  console.log('  1. Start dev server: npm run dev')
  console.log('  2. Test URL:')
  console.log('     http://localhost:3000/init/6fd394c2-c35a-4306-8479-0bd13249f2fe/cc344880-b5c1-46c7-8903-15c2ef7f84a6')
  console.log('     ?transactionId=test123&rid=testuser&isManual=true')
  console.log('\n  3. Check database:')
  console.log('     SELECT * FROM responses ORDER BY created_at DESC LIMIT 1;')
  console.log('\n  4. Verify audit logs in UI at: http://localhost:3000/admin/audit-logs')
  console.log('\n✅ All systems ready for testing!')
  console.log('')

  db.close()
  process.exit(0)

} catch (error) {
  console.error('\n❌ Verification failed:', error)
  db.close()
  process.exit(1)
}
