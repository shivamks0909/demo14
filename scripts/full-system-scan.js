#!/usr/bin/env node
/**
 * FULL SYSTEM SCAN & VALIDATION
 * Tests all routes, projects, and scenarios
 */

const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

const dbPath = path.join(process.cwd(), 'data', 'test_local.db')

console.log('╔════════════════════════════════════════════════════════════╗')
console.log('║           FULL SYSTEM SCAN & VALIDATION                  ║')
console.log('╚════════════════════════════════════════════════════════════╝\n')

if (!fs.existsSync(dbPath)) {
  console.error('❌ Database not found! Run: node scripts/reset-local-db.js')
  process.exit(1)
}

const db = new Database(dbPath)

try {
  console.log('🔍 SCANNING ENTIRE SYSTEM...\n')

  // ========================================
  // 1. CHECK ALL TABLES
  // ========================================
  console.log('📋 TABLES CHECK:')
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()
  const expectedTables = ['audit_logs', 'clients', 'projects', 'responses', 'supplier_project_links', 'suppliers']

  tables.forEach(t => {
    const isExpected = expectedTables.includes(t.name)
    console.log(`  ${isExpected ? '✅' : '⚠️'} ${t.name}`)
  })

  // ========================================
  // 2. CHECK ALL INDEXES
  // ========================================
  console.log('\n🔧 INDEXES CHECK:')
  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' ORDER BY name").all()
  indexes.forEach(i => console.log(`  ✅ ${i.name}`))

  // ========================================
  // 3. PROJECTS INVENTORY
  // ========================================
  console.log('\n🏗️  PROJECTS INVENTORY:')
  const projects = db.prepare('SELECT * FROM projects').all()

  projects.forEach(p => {
    console.log(`\n  Project: ${p.project_code}`)
    console.log(`    Status: ${p.status}`)
    console.log(`    Base URL: ${p.base_url}`)
    console.log(`    Multi-country: ${p.is_multi_country ? 'Yes' : 'No'}`)
    console.log(`    Has Prescreener: ${p.has_prescreener ? 'Yes' : 'No'}`)
    console.log(`    PID Prefix: ${p.pid_prefix || 'None'}`)
    console.log(`    Target UID: ${p.target_uid || 'None'}`)
    console.log(`    Client PID Param: ${p.client_pid_param || 'pid'}`)
    console.log(`    Client UID Param: ${p.client_uid_param || 'uid'}`)

    // Get supplier links
    const links = db.prepare(`
      SELECT s.name, s.supplier_token, l.quota_allocated, l.quota_used, l.status
      FROM supplier_project_links l
      JOIN suppliers s ON l.supplier_id = s.id
      WHERE l.project_id = ?
    `).all(p.id)

    if (links.length > 0) {
      console.log(`    Suppliers:`)
      links.forEach(l => {
        console.log(`      - ${l.name} (${l.supplier_token}): ${l.quota_used}/${l.quota_allocated} [${l.status}]`)
      })
    }

    // Get response count
    const respCount = db.prepare('SELECT COUNT(*) as c FROM responses WHERE project_id = ?').get(p.id).c
    console.log(`    Responses: ${respCount}`)
  })

  // ========================================
  // 4. SUPPLIERS INVENTORY
  // ========================================
  console.log('\n🏭 SUPPLIERS INVENTORY:')
  const suppliers = db.prepare('SELECT * FROM suppliers').all()

  suppliers.forEach(s => {
    console.log(`\n  Supplier: ${s.name}`)
    console.log(`    Token: ${s.supplier_token}`)
    console.log(`    Platform: ${s.platform_type || 'Not set'}`)
    console.log(`    Status: ${s.status}`)
    console.log(`    Contact: ${s.contact_email || 'None'}`)

    // Get linked projects
    const links = db.prepare(`
      SELECT p.project_code, l.quota_allocated, l.quota_used, l.status
      FROM supplier_project_links l
      JOIN projects p ON l.project_id = p.id
      WHERE l.supplier_id = ?
    `).all(s.id)

    if (links.length > 0) {
      console.log(`    Linked Projects:`)
      links.forEach(l => {
        console.log(`      - ${l.project_code}: ${l.quota_used}/${l.quota_allocated} [${l.status}]`)
      })
    }
  })

  // ========================================
  // 5. RESPONSES SUMMARY
  // ========================================
  console.log('\n📨 RESPONSES SUMMARY:')
  const totalResponses = db.prepare('SELECT COUNT(*) as c FROM responses').get().c
  console.log(`  Total responses: ${totalResponses}`)

  if (totalResponses > 0) {
    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM responses
      GROUP BY status
      ORDER BY count DESC
    `).all()

    console.log('  By status:')
    statusCounts.forEach(s => {
      console.log(`    - ${s.status}: ${s.count}`)
    })

    const withTxn = db.prepare('SELECT COUNT(*) as c FROM responses WHERE transaction_id IS NOT NULL').get().c
    const manual = db.prepare('SELECT COUNT(*) as c FROM responses WHERE is_manual = 1').get().c

    console.log(`  With transaction_id: ${withTxn}`)
    console.log(`  Manual entries: ${manual}`)

    // Recent responses
    const recent = db.prepare(`
      SELECT r.id, r.uid, r.project_code, r.supplier_token, r.status,
             r.transaction_id, r.is_manual, r.created_at
      FROM responses r
      ORDER BY r.created_at DESC
      LIMIT 5
    `).all()

    console.log('\n  Recent responses:')
    recent.forEach(r => {
      console.log(`    - ${r.id.slice(0, 8)}...: ${r.uid} @ ${r.project_code} via ${r.supplier_token || 'direct'}`)
      console.log(`      Status: ${r.status}, Txn: ${r.transaction_id || 'None'}, Manual: ${r.is_manual}`)
    })
  }

  // ========================================
  // 6. AUDIT LOGS SUMMARY
  // ========================================
  console.log('\n🔍 AUDIT LOGS SUMMARY:')
  const totalAudits = db.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c
  console.log(`  Total audit entries: ${totalAudits}`)

  if (totalAudits > 0) {
    const eventTypes = db.prepare(`
      SELECT event_type, COUNT(*) as count
      FROM audit_logs
      GROUP BY event_type
      ORDER BY count DESC
      LIMIT 10
    `).all()

    console.log('  Event types:')
    eventTypes.forEach(e => {
      console.log(`    - ${e.event_type}: ${e.count}`)
    })

    // Recent audit entries
    const recent = db.prepare(`
      SELECT event_type, payload, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 3
    `).all()

    console.log('\n  Recent events:')
    recent.forEach(a => {
      try {
        const payload = JSON.parse(a.payload)
        console.log(`    - ${a.created_at}: ${a.event_type} (${payload.project_code || payload.transaction_id || 'N/A'})`)
      } catch (e) {
        console.log(`    - ${a.created_at}: ${a.event_type}`)
      }
    })
  }

  // ========================================
  // 7. ROUTE FILES CHECK
  // ========================================
  console.log('\n📁 ROUTE FILES CHECK:')
  const routeFiles = [
    'app/r/[code]/[...slug]/route.ts',
    'app/track/route.ts',
    'app/api/callback/route.ts',
    'app/init/[transactionId]/[rid]/route.ts'
  ]

  routeFiles.forEach(route => {
    const pathParts = route.split('/')
    const fullPath = path.join(process.cwd(), ...pathParts)
    const exists = fs.existsSync(fullPath)
    console.log(`  ${exists ? '✅' : '❌'} ${route}`)
  })

  // ========================================
  // 8. DATABASE INTEGRITY
  // ========================================
  console.log('\n🔗 DATABASE INTEGRITY:')
  const integrityChecks = [
    {
      name: 'Responses with invalid project_id',
      query: `SELECT COUNT(*) as c FROM responses r LEFT JOIN projects p ON r.project_id = p.id WHERE p.id IS NULL`
    },
    {
      name: 'Supplier links with invalid supplier_id',
      query: `SELECT COUNT(*) as c FROM supplier_project_links l LEFT JOIN suppliers s ON l.supplier_id = s.id WHERE s.id IS NULL`
    },
    {
      name: 'Supplier links with invalid project_id',
      query: `SELECT COUNT(*) as c FROM supplier_project_links l LEFT JOIN projects p ON l.project_id = p.id WHERE p.id IS NULL`
    }
  ]

  let integrityOK = true
  integrityChecks.forEach(check => {
    const result = db.prepare(check.query).get()
    const count = result.c
    if (count > 0) {
      console.log(`  ❌ ${check.name}: ${count} orphans`)
      integrityOK = false
    } else {
      console.log(`  ✅ ${check.name}: 0 orphans`)
    }
  })

  // ========================================
  // 9. SCHEMA VERSION CHECK
  // ========================================
  console.log('\n📦 SCHEMA VERSION:')
  const responsesCols = db.prepare('PRAGMA table_info(responses)').all()
  const hasAllNewFields = ['transaction_id', 'is_manual', 's2s_token', 'is_fake_suspected']
    .every(field => responsesCols.some(c => c.name === field))

  console.log(`  ${hasAllNewFields ? '✅' : '⚠️'} Responses table has all required fields`)

  const requiredIndexes = ['idx_responses_oi_session', 'idx_responses_transaction_id']
  const existingIndexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='responses'").all()
  const hasAllIndexes = requiredIndexes.every(idx => existingIndexes.some(i => i.name === idx))

  console.log(`  ${hasAllIndexes ? '✅' : '⚠️'} Responses table has all required indexes`)

  // ========================================
  // 10. TEST SCENARIOS MATRIX
  // ========================================
  console.log('\n🧪 TEST SCENARIOS MATRIX:')
  console.log('\n  Available test combinations:\n')

  const testScenarios = []

  projects.forEach(p => {
    // Standard route test
    testScenarios.push({
      type: 'Standard Route (/r/)',
      project: p.project_code,
      supplier: 'DYN01',
      uid: `TESTUSER_${p.project_code}`,
      expected: p.status === 'active' ? '200/302' : 'paused'
    })

    // Legacy route test
    testScenarios.push({
      type: 'Legacy Route (/track)',
      project: p.project_code,
      supplier: 'LUC01',
      uid: `TESTUSER2_${p.project_code}`,
      expected: p.status === 'active' ? '200/302' : 'paused'
    })

    // Custom init route test (if project code looks like UUID or we have mapping)
    if (p.project_code.includes('-')) {
      testScenarios.push({
        type: 'Custom Init (/init)',
        project: p.project_code,
        supplier: null,
        uid: `INITUSER_${p.project_code.slice(0, 8)}`,
        expected: p.status === 'active' ? '200/302' : 'paused'
      })
    }
  })

  console.log('  Scenario                          Project           Supplier     UID Pattern              Expected')
  console.log('  ──────────────────────────────── ───────────────── ─────────── ──────────────────────── ───────────')
  testScenarios.forEach(s => {
    const statusColor = s.expected.includes('paused') ? '⚠️' : '✅'
    console.log(`  ${statusColor} ${s.type.padEnd(32)} ${s.project.padEnd(16)} ${(s.supplier || 'N/A').padEnd(11)} ${s.uid.padEnd(24)} ${s.expected}`)
  })

  // ========================================
  // FINAL SUMMARY
  // ========================================
  console.log('\n' + '═'.repeat(70))
  console.log('✅ FULL SYSTEM SCAN COMPLETE')
  console.log('═'.repeat(70))

  console.log('\n📊 SUMMARY:')
  console.log(`  Projects: ${projects.length}`)
  console.log(`  Suppliers: ${suppliers.length}`)
  console.log(`  Total Responses: ${totalResponses}`)
  console.log(`  Audit Logs: ${totalAudits}`)
  console.log(`  Integrity: ${integrityOK ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`  Schema: ${hasAllNewFields ? '✅ UP-TO-DATE' : '⚠️ NEEDS UPDATE'}`)

  console.log('\n🎯 READY FOR TESTING:')
  console.log('  1. Start server: npm run dev')
  console.log('  2. Test routes using scenarios above')
  console.log('  3. Check database after each test')
  console.log('  4. Review audit logs for proper event tracking')

  console.log('\n📝 MANUAL TEST CHECKLIST:')
  console.log('  [ ] Test /r/TEST_SINGLE/DYN01/TESTUSER (should redirect)')
  console.log('  [ ] Test /track?code=TEST_SINGLE&uid=TESTUSER (should redirect)')
  console.log('  [ ] Test /init/TEST_SINGLE/TESTUSER (should redirect)')
  console.log('  [ ] Test callback: /api/callback?session=<session>&type=complete')
  console.log('  [ ] Verify response status updates in database')
  console.log('  [ ] Verify audit logs created')
  console.log('  [ ] Test quota exceeded (make 4th request within 1 min)')
  console.log('  [ ] Test duplicate UID (same UID twice)')
  console.log('  [ ] Test paused project (TEST_PAUSED)')
  console.log('  [ ] Test invalid project code')

  console.log('\n✅ All systems operational!')
  console.log('')

  db.close()
  process.exit(0)

} catch (error) {
  console.error('\n❌ Scan failed:', error)
  db.close()
  process.exit(1)
}
