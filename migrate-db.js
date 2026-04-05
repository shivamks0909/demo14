const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'data', 'local.db');
const db = new Database(dbPath);

console.log('=== DATABASE MIGRATION ===\n');

// 1. Add missing columns to suppliers table
const supplierColumns = db.pragma('table_info(suppliers)').map(col => col.name);
console.log('Current supplier columns:', supplierColumns.join(', '));

const missingSupplierColumns = [];
if (!supplierColumns.includes('login_email')) missingSupplierColumns.push('login_email TEXT');
if (!supplierColumns.includes('password_hash')) missingSupplierColumns.push('password_hash TEXT');
if (!supplierColumns.includes('last_login')) missingSupplierColumns.push('last_login TEXT');
if (!supplierColumns.includes('contact_email')) missingSupplierColumns.push('contact_email TEXT');
if (!supplierColumns.includes('platform_type')) missingSupplierColumns.push('platform_type TEXT');
if (!supplierColumns.includes('uid_macro')) missingSupplierColumns.push('uid_macro TEXT');
if (!supplierColumns.includes('complete_redirect_url')) missingSupplierColumns.push('complete_redirect_url TEXT');
if (!supplierColumns.includes('terminate_redirect_url')) missingSupplierColumns.push('terminate_redirect_url TEXT');
if (!supplierColumns.includes('quotafull_redirect_url')) missingSupplierColumns.push('quotafull_redirect_url TEXT');
if (!supplierColumns.includes('notes')) missingSupplierColumns.push('notes TEXT');

if (missingSupplierColumns.length > 0) {
  console.log('\nAdding missing supplier columns:');
  missingSupplierColumns.forEach(colDef => {
    const colName = colDef.split(' ')[0];
    try {
      db.exec(`ALTER TABLE suppliers ADD COLUMN ${colDef}`);
      console.log(`  ✓ Added ${colName}`);
    } catch (e) {
      console.log(`  ✗ Failed to add ${colName}: ${e.message}`);
    }
  });
} else {
  console.log('\nAll supplier columns exist');
}

// 2. Add supplier_id to responses table
const responseColumns = db.pragma('table_info(responses)').map(col => col.name);
if (!responseColumns.includes('supplier_id')) {
  console.log('\nAdding supplier_id to responses table...');
  try {
    db.exec(`ALTER TABLE responses ADD COLUMN supplier_id TEXT`);
    console.log('  ✓ Added supplier_id');
  } catch (e) {
    console.log(`  ✗ Failed: ${e.message}`);
  }
} else {
  console.log('\nsupplier_id already exists in responses');
}

// 3. Create supplier_sessions table if not exists
console.log('\nCreating supplier_sessions table...');
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS supplier_sessions (
      id TEXT PRIMARY KEY,
      supplier_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_supplier_sessions_token ON supplier_sessions(token)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_supplier_sessions_supplier ON supplier_sessions(supplier_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_supplier_sessions_expires ON supplier_sessions(expires_at)`);
  console.log('  ✓ supplier_sessions table ready');
} catch (e) {
  console.log(`  ✗ Failed: ${e.message}`);
}

// 4. Check existing supplier and update with login credentials
console.log('\n--- Checking existing supplier ---');
try {
  const supplier = db.prepare('SELECT * FROM suppliers LIMIT 1').get();
  if (supplier) {
    console.log('Found supplier:', supplier.name);
    console.log('Supplier token:', supplier.supplier_token);
    console.log('Status:', supplier.status);
    
    // Check if login_email exists
    if (!supplier.login_email) {
      console.log('\nSetting up login credentials for existing supplier...');
      const loginEmail = 'supplier@demo.com';
      const password = 'supplier123';
      const passwordHash = bcrypt.hashSync(password, 10);
      
      db.prepare('UPDATE suppliers SET login_email = ?, password_hash = ? WHERE id = ?').run(
        loginEmail,
        passwordHash,
        supplier.id
      );
      console.log(`  ✓ Login email: ${loginEmail}`);
      console.log(`  ✓ Password: ${password}`);
      console.log(`  ✓ Supplier ID: ${supplier.id}`);
    } else {
      console.log('Login email already set:', supplier.login_email);
    }
  }
} catch (e) {
  console.log('Error:', e.message);
}

// 5. Check existing supplier-project links
console.log('\n--- Existing Supplier-Project Links ---');
try {
  const links = db.prepare(`
    SELECT spl.*, s.name as supplier_name, p.project_code, p.project_name 
    FROM supplier_project_links spl
    JOIN suppliers s ON spl.supplier_id = s.id
    JOIN projects p ON spl.project_id = p.id
  `).all();
  
  if (links.length === 0) {
    console.log('No links found');
  } else {
    links.forEach(link => {
      console.log(`  ${link.supplier_name} -> ${link.project_name} (${link.project_code})`);
      console.log(`    Quota: ${link.quota_allocated} allocated, ${link.quota_used} used`);
      console.log(`    Status: ${link.status}`);
    });
  }
} catch (e) {
  console.log('Error:', e.message);
}

// 6. Verify final schema
console.log('\n--- Final Verification ---');
const finalSupplierColumns = db.pragma('table_info(suppliers)').map(col => col.name);
console.log('Supplier columns:', finalSupplierColumns.join(', '));

const finalResponseColumns = db.pragma('table_info(responses)').map(col => col.name);
console.log('Has supplier_id in responses:', finalResponseColumns.includes('supplier_id'));

db.close();
console.log('\n=== MIGRATION COMPLETE ===');
