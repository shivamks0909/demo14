/**
 * Create a Supplier User with Login Credentials
 * Usage: node create-supplier-user.js [email] [password] [name]
 */

const Database = require('better-sqlite3')
const path = require('path')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const dbPath = path.join(__dirname, 'data', 'local.db')
const db = new Database(dbPath)

async function createSupplierUser(email, password, name) {
  console.log('👤 Creating Supplier User...\n')
  
  // Check if email already exists
  const existing = db.prepare('SELECT id FROM suppliers WHERE login_email = ?').get(email)
  if (existing) {
    console.log(`⚠️  Supplier with email ${email} already exists (ID: ${existing.id})`)
    console.log('Updating password...')
    const hash = await bcrypt.hash(password, 10)
    db.prepare('UPDATE suppliers SET password_hash = ? WHERE login_email = ?').run(hash, email)
    console.log('✅ Password updated\n')
    return existing.id
  }
  
  // Check if name already exists as supplier
  const existingName = db.prepare('SELECT id FROM suppliers WHERE name = ?').get(name)
  if (existingName) {
    console.log(`⚠️  Supplier "${name}" already exists (ID: ${existingName.id})`)
    console.log('Adding login credentials to existing supplier...')
    const hash = await bcrypt.hash(password, 10)
    db.prepare('UPDATE suppliers SET login_email = ?, password_hash = ? WHERE id = ?').run(email, hash, existingName.id)
    console.log('✅ Login credentials added\n')
    return existingName.id
  }
  
  // Create new supplier with login credentials
  const id = crypto.randomUUID()
  const token = `SUP_${Date.now().toString(36).toUpperCase()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`
  const hash = await bcrypt.hash(password, 10)
  
  db.prepare(`
    INSERT INTO suppliers (id, name, supplier_token, login_email, password_hash, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'active', datetime('now'))
  `).run(id, name, token, email, hash)
  
  console.log(`✅ Supplier created successfully!\n`)
  console.log('📋 Supplier Details:')
  console.log(`   ID: ${id}`)
  console.log(`   Name: ${name}`)
  console.log(`   Email: ${email}`)
  console.log(`   Token: ${token}`)
  console.log(`   Status: active`)
  console.log('')
  
  return id
}

// Link supplier to projects
function linkSupplierToProjects(supplierId, projectIds = []) {
  if (projectIds.length === 0) {
    // Get all active projects
    const projects = db.prepare("SELECT id FROM projects WHERE status = 'active'").all()
    projectIds = projects.map(p => p.id)
  }
  
  console.log('🔗 Linking supplier to projects...')
  for (const projectId of projectIds) {
    try {
      db.prepare(`
        INSERT OR IGNORE INTO supplier_project_links (id, supplier_id, project_id, quota_allocated, quota_used, status)
        VALUES (?, ?, ?, 10000, 0, 'active')
      `).run(crypto.randomUUID(), supplierId, projectId)
      console.log(`   ✅ Linked to project ${projectId}`)
    } catch (error) {
      console.log(`   ⚠️  Project ${projectId}: ${error.message}`)
    }
  }
  console.log('')
}

// Main
async function main() {
  const args = process.argv.slice(2)
  
  let email, password, name
  
  if (args.length >= 3) {
    email = args[0]
    password = args[1]
    name = args[2]
  } else {
    // Default test supplier
    email = 'supplier@test.com'
    password = 'Supplier123!'
    name = 'Test Supplier'
    console.log('⚠️  No arguments provided. Using default test supplier:')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    console.log(`   Name: ${name}`)
    console.log('')
  }
  
  const supplierId = await createSupplierUser(email, password, name)
  linkSupplierToProjects(supplierId)
  
  console.log('🎉 Supplier user creation complete!')
  console.log(`   Login at: http://localhost:3000/supplier/login`)
  console.log(`   Email: ${email}`)
  console.log(`   Password: ${password}`)
}

main().catch(err => {
  console.error('💥 Error:', err)
  process.exit(1)
})
