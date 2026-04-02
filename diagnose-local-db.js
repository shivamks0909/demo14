const Database = require('better-sqlite3');
const path = require('path');

function getDb() {
  const dataDir = path.join(process.cwd(), 'data');
  const dbPath = path.join(dataDir, 'test_local.db'); // Use test database
  const db = new Database(dbPath);
  return db;
}

// Initialize SQLite directly
const db = getDb();

console.log('=== DATABASE CONNECTION TEST ===');
console.log('Database file:', './data/test_local.db');

// Test project lookup
console.log('\n--- Projects in database ---');
const projects = db.prepare('SELECT id, project_code, status, base_url FROM projects').all();
console.log('Total projects:', projects.length);
projects.forEach(p => {
  console.log(`  ${p.project_code}: ${p.status} - ${p.base_url}`);
});

// Test supplier links
console.log('\n--- Supplier Project Links ---');
const links = db.prepare('SELECT * FROM supplier_project_links').all();
console.log('Total links:', links.length);
links.forEach(l => {
  console.log(`  Link ${l.id}: supplier_id=${l.supplier_id}, project_id=${l.project_id}, quota=${l.quota_allocated}/${l.quota_used || 0}`);
});

// Test query with parameter (like the route does)
console.log('\n--- Parameterized query test ---');
const testCode = 'TEST_SINGLE';
const project = db.prepare('SELECT * FROM projects WHERE project_code = ?').get(testCode);
console.log('Query result:', project ? `Found ${project.project_code}` : 'NOT FOUND');

if (project) {
  // Test supplier resolution (simulate route logic)
  console.log('\n--- Supplier resolution test ---');
  const supplierToken = 'DYN01';
  const supplier = db.prepare('SELECT * FROM suppliers WHERE supplier_token = ? AND status = ?').get(supplierToken, 'active');
  console.log('Supplier:', supplier ? supplier.name : 'NOT FOUND');

  if (supplier) {
    const link = db.prepare('SELECT * FROM supplier_project_links WHERE supplier_id = ? AND project_id = ? AND status = ?').get(
      supplier.id, project.id, 'active'
    );
    console.log('Supplier-Project Link:', link ? `quota ${link.quota_allocated}/${link.quota_used}` : 'NOT FOUND');
  }
}

// Check audit logs
console.log('\n--- Recent Audit Logs ---');
const logs = db.prepare('SELECT event_type, payload, ip, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 5').all();
logs.forEach((l, i) => {
  console.log(`  ${i+1}. ${l.event_type} from ${l.ip} at ${l.created_at}`);
});

db.close();
console.log('\n=== TEST COMPLETE ===');
