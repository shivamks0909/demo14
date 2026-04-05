const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'data', 'local.db');
const db = new Database(dbPath);

console.log('=== FINAL DATABASE SETUP FOR SUPPLIER PORTAL ===\n');

// 1. Add login_email column without UNIQUE constraint first
const supplierColumns = db.pragma('table_info(suppliers)').map(col => col.name);
if (!supplierColumns.includes('login_email')) {
  console.log('Adding login_email column...');
  db.exec('ALTER TABLE suppliers ADD COLUMN login_email TEXT');
  console.log('  ✓ Added login_email');
}

// Create unique index on login_email (for existing NULL values, use partial index)
try {
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_login_email ON suppliers(login_email) WHERE login_email IS NOT NULL');
  console.log('  ✓ Created partial unique index on login_email');
} catch (e) {
  console.log('  Index note:', e.message);
}

// 2. Set up login credentials for existing supplier
console.log('\n--- Setting up supplier login credentials ---');
const supplier = db.prepare('SELECT * FROM suppliers LIMIT 1').get();
if (supplier) {
  console.log('Supplier:', supplier.name);
  console.log('ID:', supplier.id);
  
  const loginEmail = 'supplier@demo.com';
  const password = 'supplier123';
  const passwordHash = bcrypt.hashSync(password, 10);
  
  db.prepare('UPDATE suppliers SET login_email = ?, password_hash = ?, last_login = NULL WHERE id = ?').run(
    loginEmail,
    passwordHash,
    supplier.id
  );
  console.log(`  ✓ Login email: ${loginEmail}`);
  console.log(`  ✓ Password: ${password}`);
}

// 3. Verify supplier-project links
console.log('\n--- Supplier Project Assignments ---');
const links = db.prepare(`
  SELECT spl.*, s.name as supplier_name, p.project_code, p.project_name 
  FROM supplier_project_links spl
  JOIN suppliers s ON spl.supplier_id = s.id
  JOIN projects p ON spl.project_id = p.id
`).all();

links.forEach(link => {
  console.log(`  ${link.supplier_name} -> ${link.project_name} (${link.project_code})`);
  console.log(`    Quota: ${link.quota_allocated} allocated, ${link.quota_used} used`);
  console.log(`    Status: ${link.status}`);
});

// 4. Verify responses table has supplier_id
const responseColumns = db.pragma('table_info(responses)').map(col => col.name);
console.log('\n--- Responses Table Check ---');
console.log('Has supplier_id:', responseColumns.includes('supplier_id'));

// 5. Create a test supplier for additional testing
console.log('\n--- Creating Test Supplier ---');
const testSupplierId = `supplier_test_${Date.now()}`;
const testEmail = 'test@supplier.com';
const testPassword = 'test123';
const testPasswordHash = bcrypt.hashSync(testPassword, 10);

try {
  db.prepare(`
    INSERT INTO suppliers (id, name, supplier_token, login_email, password_hash, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `).run(
    testSupplierId,
    'Test Supplier Co',
    `test_token_${Date.now()}`,
    testEmail,
    testPasswordHash
  );
  console.log(`  ✓ Created test supplier: ${testEmail}`);
  console.log(`  ✓ Password: ${testPassword}`);
  console.log(`  ✓ ID: ${testSupplierId}`);
  
  // Assign a project to test supplier
  const project = db.prepare('SELECT id FROM projects WHERE project_code = ?').get('TEST001');
  if (project) {
    db.prepare(`
      INSERT OR IGNORE INTO supplier_project_links (id, supplier_id, project_id, quota_allocated, quota_used, status)
      VALUES (?, ?, ?, 100, 0, 'active')
    `).run(
      `link_${Date.now()}`,
      testSupplierId,
      project.id
    );
    console.log(`  ✓ Assigned project TEST001 with quota 100`);
  }
} catch (e) {
  if (e.message.includes('UNIQUE')) {
    console.log('  Test supplier already exists');
  } else {
    console.log('  Error:', e.message);
  }
}

// 6. Final summary
console.log('\n=== SETUP COMPLETE ===');
console.log('\nSupplier Portal Login Credentials:');
console.log('  URL: http://localhost:3000/supplier/login');
console.log('  Email: supplier@demo.com');
console.log('  Password: supplier123');
console.log('\nTest Supplier Login Credentials:');
console.log('  Email: test@supplier.com');
console.log('  Password: test123');

db.close();
