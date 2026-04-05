/**
 * Supplier Portal Database Migration
 * Adds missing tables and columns for supplier authentication
 */

const Database = require('better-sqlite3')
const path = require('path')

function migrateSupplierPortal() {
  console.log('🚀 Starting Supplier Portal Database Migration...\n')
  
  const dbPath = path.join(__dirname, 'data', 'local.db')
  const db = new Database(dbPath)
  
  // 1. Create supplier_sessions table
  console.log('📋 Step 1: Creating supplier_sessions table...')
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS supplier_sessions (
        id TEXT PRIMARY KEY,
        supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_supplier_sessions_token ON supplier_sessions(token);
      CREATE INDEX IF NOT EXISTS idx_supplier_sessions_expires ON supplier_sessions(expires_at);
    `)
    console.log('✅ supplier_sessions table created\n')
  } catch (error) {
    console.error('❌ Error creating supplier_sessions table:', error.message)
  }
  
  // 2. Add missing columns to suppliers table
  console.log('📋 Step 2: Adding missing columns to suppliers table...')
  
  const columnsToAdd = [
    { name: 'login_email', sql: 'ALTER TABLE suppliers ADD COLUMN login_email TEXT UNIQUE' },
    { name: 'password_hash', sql: 'ALTER TABLE suppliers ADD COLUMN password_hash TEXT' },
    { name: 'last_login', sql: 'ALTER TABLE suppliers ADD COLUMN last_login TEXT' },
  ]
  
  for (const col of columnsToAdd) {
    try {
      db.exec(col.sql)
      console.log(`✅ Added column: ${col.name}`)
    } catch (error) {
      if (error.message.includes('duplicate column')) {
        console.log(`⚠️  Column already exists: ${col.name}`)
      } else {
        console.error(`❌ Error adding column ${col.name}:`, error.message)
      }
    }
  }
  
  console.log('')
  
  // 3. Verify schema
  console.log('📋 Step 3: Verifying schema...')
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()
    console.log('Tables:', tables.map(t => t.name).join(', '))
    
    const supplierColumns = db.prepare("PRAGMA table_info(suppliers)").all()
    console.log('Suppliers columns:', supplierColumns.map(c => c.name).join(', '))
    
    const sessionColumns = db.prepare("PRAGMA table_info(supplier_sessions)").all()
    console.log('Supplier_sessions columns:', sessionColumns.map(c => c.name).join(', '))
    
    console.log('\n✅ Schema verification complete')
  } catch (error) {
    console.error('❌ Error verifying schema:', error.message)
  }
  
  console.log('\n🎉 Supplier Portal Migration Complete!')
  console.log('Next step: Run "node create-supplier-user.js" to create a supplier account')
}

// Run migration
try {
  migrateSupplierPortal()
} catch (error) {
  console.error('💥 Migration failed:', error)
  process.exit(1)
}
