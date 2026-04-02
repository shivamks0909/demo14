#!/usr/bin/env node
/**
 * Fix: Add Missing Suppliers and Links
 * Creates DYN01, LUC01, CIN01 suppliers and links them to test projects
 */

const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

const dbPath = path.join(process.cwd(), 'data', 'test_local.db')

console.log('╔════════════════════════════════════════════════════════════╗')
console.log('║        Adding Missing Suppliers & Links                  ║')
console.log('╚════════════════════════════════════════════════════════════╝\n')

if (!fs.existsSync(dbPath)) {
  console.error('❌ Database not found!')
  process.exit(1)
}

const db = new Database(dbPath)

try {
  db.pragma('foreign_keys = ON')

  // ========================================
  // 1. CREATE SUPPLIERS
  // ========================================
  console.log('📦 Step 1: Creating suppliers...\n')

  const suppliers = [
    {
      id: 'DYN01',
      name: 'Dynata',
      supplier_token: 'DYN01',
      contact_email: 'ops@dynata.com',
      platform_type: 'DYNATA',
      uid_macro: '{uid}',
      complete_redirect_url: 'https://survey.trustsample.com/complete',
      terminate_redirect_url: 'https://survey.trustsample.com/terminate',
      quotafull_redirect_url: 'https://survey.trustsample.com/quotafull',
      notes: 'Primary supplier for TEST_SINGLE project',
      status: 'active'
    },
    {
      id: 'LUC01',
      name: 'Lucid',
      supplier_token: 'LUC01',
      contact_email: 'ops@lucid.com',
      platform_type: 'LUCID',
      uid_macro: '{ResID}',
      complete_redirect_url: 'https://survey.luc.id/complete',
      terminate_redirect_url: 'https://survey.luc.id/terminate',
      quotafull_redirect_url: 'https://survey.luc.id/quotafull',
      notes: 'Legacy supplier for TEST_SINGLE and TEST_MULTI',
      status: 'active'
    },
    {
      id: 'CIN01',
      name: 'Cint',
      supplier_token: 'CIN01',
      contact_email: 'ops@cint.com',
      platform_type: 'CINT',
      uid_macro: '{rid}',
      complete_redirect_url: 'https://survey.cint.com/complete',
      terminate_redirect_url: 'https://survey.cint.com/terminate',
      quotafull_redirect_url: 'https://survey.cint.com/quotafull',
      notes: 'Backup supplier for TEST_MULTI',
      status: 'active'
    }
  ]

  let suppliersCreated = 0
  let suppliersUpdated = 0

  suppliers.forEach(sup => {
    // Check if exists
    const existing = db.prepare('SELECT id FROM suppliers WHERE id = ?').get(sup.id)

    if (existing) {
      // Update
      db.prepare(`
        UPDATE suppliers SET
          name = ?, supplier_token = ?, contact_email = ?, platform_type = ?,
          uid_macro = ?, complete_redirect_url = ?, terminate_redirect_url = ?,
          quotafull_redirect_url = ?, notes = ?, status = ?
        WHERE id = ?
      `).run(
        sup.name, sup.supplier_token, sup.contact_email, sup.platform_type,
        sup.uid_macro, sup.complete_redirect_url, sup.terminate_redirect_url,
        sup.quotafull_redirect_url, sup.notes, sup.status, sup.id
      )
      console.log(`  ✅ Updated supplier: ${sup.id} - ${sup.name}`)
      suppliersUpdated++
    } else {
      // Insert
      db.prepare(`
        INSERT INTO suppliers (
          id, name, supplier_token, contact_email, platform_type,
          uid_macro, complete_redirect_url, terminate_redirect_url,
          quotafull_redirect_url, notes, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        sup.id, sup.name, sup.supplier_token, sup.contact_email, sup.platform_type,
        sup.uid_macro, sup.complete_redirect_url, sup.terminate_redirect_url,
        sup.quotafull_redirect_url, sup.notes, sup.status
      )
      console.log(`  ✅ Created supplier: ${sup.id} - ${sup.name}`)
      suppliersCreated++
    }
  })

  console.log(`\n  Suppliers: ${suppliersCreated} created, ${suppliersUpdated} updated`)

  // ========================================
  // 2. GET PROJECTS
  // ========================================
  console.log('\n📦 Step 2: Finding test projects...\n')

  const projects = db.prepare('SELECT * FROM projects WHERE project_code IN (?, ?, ?)').all(
    'TEST_SINGLE', 'TEST_MULTI', 'TEST_PAUSED'
  )

  if (projects.length === 0) {
    console.error('❌ Test projects not found! Run reset-local-db.js first')
    process.exit(1)
  }

  console.log(`  Found ${projects.length} test projects:`)
  projects.forEach(p => {
    console.log(`    - ${p.project_code} (${p.status})`)
  })

  // ========================================
  // 3. CREATE SUPPLIER-PROJECT LINKS
  // ========================================
  console.log('\n🔗 Step 3: Creating supplier-project links...\n')

  const links = [
    // TEST_SINGLE: DYN01 (unlimited)
    { supplier_id: 'DYN01', project_code: 'TEST_SINGLE', quota_allocated: 999999, quota_used: 0, status: 'active' },
    // TEST_SINGLE: LUC01 (100 quota)
    { supplier_id: 'LUC01', project_code: 'TEST_SINGLE', quota_allocated: 100, quota_used: 0, status: 'active' },
    // TEST_MULTI: LUC01 (50 quota)
    { supplier_id: 'LUC01', project_code: 'TEST_MULTI', quota_allocated: 50, quota_used: 0, status: 'active' },
    // TEST_MULTI: CIN01 (50 quota)
    { supplier_id: 'CIN01', project_code: 'TEST_MULTI', quota_allocated: 50, quota_used: 0, status: 'active' },
    // TEST_PAUSED: DYN01 (unlimited but project paused)
    { supplier_id: 'DYN01', project_code: 'TEST_PAUSED', quota_allocated: 999999, quota_used: 0, status: 'paused' }
  ]

  let linksCreated = 0
  let linksUpdated = 0

  links.forEach(link => {
    const project = projects.find(p => p.project_code === link.project_code)
    if (!project) {
      console.log(`  ⚠️  Skipping: Project ${link.project_code} not found`)
      return
    }

    const linkId = `${link.supplier_id}_${project.id}`

    // Check if link exists
    const existing = db.prepare('SELECT id FROM supplier_project_links WHERE supplier_id = ? AND project_id = ?')
      .get(link.supplier_id, project.id)

    if (existing) {
      // Update
      db.prepare(`
        UPDATE supplier_project_links SET
          quota_allocated = ?, quota_used = ?, status = ?
        WHERE supplier_id = ? AND project_id = ?
      `).run(link.quota_allocated, link.quota_used, link.status, link.supplier_id, project.id)
      console.log(`  ✅ Updated link: ${link.supplier_id} → ${link.project_code}`)
      linksUpdated++
    } else {
      // Insert
      db.prepare(`
        INSERT INTO supplier_project_links (
          id, supplier_id, project_id, quota_allocated, quota_used, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(linkId, link.supplier_id, project.id, link.quota_allocated, link.quota_used, link.status)
      console.log(`  ✅ Created link: ${link.supplier_id} → ${link.project_code} (${link.quota_allocated} quota)`)
      linksCreated++
    }
  })

  console.log(`\n  Links: ${linksCreated} created, ${linksUpdated} updated`)

  // ========================================
  // 4. VERIFY
  // ========================================
  console.log('\n📊 Verification:\n')

  // Check suppliers
  const supCount = db.prepare('SELECT COUNT(*) as c FROM suppliers').get().c
  console.log(`  Total suppliers: ${supCount}`)

  const allSuppliers = db.prepare('SELECT id, name, supplier_token FROM suppliers ORDER BY id').all()
  console.log('  Suppliers:', allSuppliers.map(s => `${s.id} (${s.name})`).join(', '))

  // Check links
  const linkCount = db.prepare('SELECT COUNT(*) as c FROM supplier_project_links').get().c
  console.log(`  Total supplier-project links: ${linkCount}`)

  const allLinks = db.prepare(`
    SELECT s.supplier_token, p.project_code, l.quota_allocated, l.quota_used, l.status
    FROM supplier_project_links l
    JOIN suppliers s ON l.supplier_id = s.id
    JOIN projects p ON l.project_id = p.id
    ORDER BY p.project_code, s.supplier_token
  `).all()

  console.log('\n  Active links:')
  allLinks.forEach(l => {
    console.log(`    ${l.supplier_token} → ${l.project_code}: ${l.quota_used}/${l.quota_allocated} [${l.status}]`)
  })

  // Check project readiness
  console.log('\n✅ Project Readiness:')
  projects.forEach(p => {
    const projLinks = allLinks.filter(l => l.project_code === p.project_code && l.status === 'active')
    const ready = projLinks.length > 0
    console.log(`  ${ready ? '✅' : '❌'} ${p.project_code}: ${projLinks.length} active supplier(s)`)
  })

  console.log('\n' + '═'.repeat(60))
  console.log('✅ SUPPLIERS & LINKS CONFIGURED SUCCESSFULLY!')
  console.log('═'.repeat(60))
  console.log('\n📝 NEXT STEPS:')
  console.log('  1. Restart dev server if running: npm run dev')
  console.log('  2. Test routes:')
  console.log('     - /r/TEST_SINGLE/DYN01/TESTUSER')
  console.log('     - /track?code=TEST_SINGLE&uid=TESTUSER&supplier=LUC01')
  console.log('     - /init/TEST_SINGLE/TESTUSER?transactionId=TEST_SINGLE&rid=TESTUSER&isManual=true')
  console.log('\n  3. Verify responses appear in admin UI')
  console.log('  4. Check audit logs for entry_created events')
  console.log('')

  db.close()
  process.exit(0)

} catch (error) {
  console.error('\n❌ Setup failed:', error)
  db.close()
  process.exit(1)
}
