const Database = require('better-sqlite3');
const path = require('path');

// Find the database file
const dbPath = path.join(__dirname, 'data', 'local.db');
const db = new Database(dbPath);

console.log('=== DATABASE SCHEMA VERIFICATION ===\n');

// Check tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables found:', tables.map(t => t.name).join(', '));

// Check suppliers table schema
console.log('\n--- Suppliers Table Schema ---');
try {
  const supplierColumns = db.prepare("PRAGMA table_info(suppliers)").all();
  supplierColumns.forEach(col => {
    console.log(`  ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
  });
} catch (e) {
  console.log('  Error:', e.message);
}

// Check supplier_project_links table schema
console.log('\n--- Supplier Project Links Table Schema ---');
try {
  const linkColumns = db.prepare("PRAGMA table_info(supplier_project_links)").all();
  linkColumns.forEach(col => {
    console.log(`  ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
  });
} catch (e) {
  console.log('  Error:', e.message);
}

// Check responses table for supplier_id column
console.log('\n--- Responses Table Schema (checking for supplier_id) ---');
try {
  const responseColumns = db.prepare("PRAGMA table_info(responses)").all();
  const hasSupplierId = responseColumns.some(col => col.name === 'supplier_id');
  console.log(`  supplier_id column exists: ${hasSupplierId}`);
  responseColumns.filter(col => col.name === 'supplier_id' || col.name === 'id' || col.name === 'project_id' || col.name === 'status').forEach(col => {
    console.log(`  ${col.name} (${col.type})`);
  });
} catch (e) {
  console.log('  Error:', e.message);
}

// Check existing data
console.log('\n--- Existing Data Summary ---');
try {
  const supplierCount = db.prepare("SELECT COUNT(*) as count FROM suppliers").get();
  console.log(`Suppliers: ${supplierCount.count}`);
  
  const projectCount = db.prepare("SELECT COUNT(*) as count FROM projects").get();
  console.log(`Projects: ${projectCount.count}`);
  
  const linkCount = db.prepare("SELECT COUNT(*) as count FROM supplier_project_links").get();
  console.log(`Supplier-Project Links: ${linkCount.count}`);
  
  const responseCount = db.prepare("SELECT COUNT(*) as count FROM responses").get();
  console.log(`Responses: ${responseCount.count}`);
} catch (e) {
  console.log('  Error counting records:', e.message);
}

// Show existing suppliers
console.log('\n--- Existing Suppliers ---');
try {
  const suppliers = db.prepare("SELECT id, name, login_email, status, created_at FROM suppliers LIMIT 10").all();
  if (suppliers.length === 0) {
    console.log('  No suppliers found');
  } else {
    suppliers.forEach(s => {
      console.log(`  ${s.name} (${s.login_email}) - Status: ${s.status} - ID: ${s.id}`);
    });
  }
} catch (e) {
  console.log('  Error:', e.message);
}

// Show existing projects
console.log('\n--- Existing Projects ---');
try {
  const projects = db.prepare("SELECT id, project_code, project_name, status FROM projects LIMIT 10").all();
  if (projects.length === 0) {
    console.log('  No projects found');
  } else {
    projects.forEach(p => {
      console.log(`  ${p.project_name} (${p.project_code}) - Status: ${p.status} - ID: ${p.id}`);
    });
  }
} catch (e) {
  console.log('  Error:', e.message);
}

db.close();
console.log('\n=== VERIFICATION COMPLETE ===');
