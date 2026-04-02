#!/usr/bin/env node
/**
 * Database Verification Script
 * Checks all tables, indexes, and sample data integrity
 */

const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(process.cwd(), 'data', 'test_local.db');
const db = new Database(dbPath);

console.log('=== DATABASE VERIFICATION ===\n');

// Check tables
console.log('📋 TABLES:');
const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' 
  ORDER BY name
`).all();

tables.forEach(table => {
  console.log(`  ✓ ${table.name}`);
});

// Check expected tables
const expectedTables = [
  'clients',
  'projects', 
  'suppliers',
  'supplier_project_links',
  'responses',
  'audit_logs'
];

console.log('\n✅ EXPECTED TABLES CHECK:');
expectedTables.forEach(table => {
  const exists = tables.some(t => t.name === table);
  console.log(`  ${exists ? '✓' : '✗'} ${table}`);
});

// Check indexes
console.log('\n🔧 INDEXES:');
const indexes = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='index' 
  ORDER BY name
`).all();

indexes.forEach(idx => {
  console.log(`  ✓ ${idx.name}`);
});

// Count records
console.log('\n📊 RECORD COUNTS:');
const counts = {
  clients: db.prepare('SELECT COUNT(*) as c FROM clients').get().c,
  projects: db.prepare('SELECT COUNT(*) as c FROM projects').get().c,
  suppliers: db.prepare('SELECT COUNT(*) as c FROM suppliers').get().c,
  supplier_project_links: db.prepare('SELECT COUNT(*) as c FROM supplier_project_links').get().c,
  responses: db.prepare('SELECT COUNT(*) as c FROM responses').get().c,
  audit_logs: db.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c
};

Object.entries(counts).forEach(([table, count]) => {
  console.log(`  ${table}: ${count}`);
});

// Check sample projects
console.log('\n🏗️  SAMPLE PROJECTS:');
const projects = db.prepare('SELECT project_code, status, is_multi_country FROM projects').all();
projects.forEach(p => {
  console.log(`  • ${p.project_code} (${p.status}, multi: ${p.is_multi_country})`);
});

// Check suppliers and quotas
console.log('\n🏭 SUPPLIERS & QUOTAS:');
const links = db.prepare(`
  SELECT 
    s.name as supplier,
    s.supplier_token,
    p.project_code,
    l.quota_allocated,
    l.quota_used
  FROM supplier_project_links l
  JOIN suppliers s ON l.supplier_id = s.id
  JOIN projects p ON l.project_id = p.id
`).all();

links.forEach(l => {
  console.log(`  • ${l.supplier} (${l.supplier_token}) → ${l.project_code}: ${l.quota_used}/${l.quota_allocated}`);
});

// Check responses
console.log('\n📨 RESPONSES:');
const responses = db.prepare(`
  SELECT 
    r.uid,
    r.status,
    r.project_code,
    r.supplier_token,
    r.oi_session,
    r.clickid
  FROM responses r
`).all();

responses.forEach(r => {
  console.log(`  • ${r.uid} @ ${r.project_code} via ${r.supplier_token}: ${r.status} (session: ${r.oi_session})`);
});

// Check audit logs
console.log('\n🔍 AUDIT LOGS (recent):');
const auditLogs = db.prepare(`
  SELECT event_type, payload, created_at 
  FROM audit_logs 
  ORDER BY created_at DESC 
  LIMIT 5
`).all();

auditLogs.forEach(log => {
  const payload = JSON.parse(log.payload);
  console.log(`  • ${log.created_at}: ${log.event_type} (${payload.project_code || 'N/A'})`);
});

// Verify foreign key relationships
console.log('\n🔗 FOREIGN KEY INTEGRITY:');
const orphanChecks = [
  {
    name: 'responses.project_id',
    query: `SELECT COUNT(*) as c FROM responses r LEFT JOIN projects p ON r.project_id = p.id WHERE p.id IS NULL`
  },
  {
    name: 'supplier_project_links.supplier_id',
    query: `SELECT COUNT(*) as c FROM supplier_project_links l LEFT JOIN suppliers s ON l.supplier_id = s.id WHERE s.id IS NULL`
  },
  {
    name: 'supplier_project_links.project_id',
    query: `SELECT COUNT(*) as c FROM supplier_project_links l LEFT JOIN projects p ON l.project_id = p.id WHERE p.id IS NULL`
  }
];

orphanChecks.forEach(check => {
  const result = db.prepare(check.query).get();
  const orphanCount = result.c;
  console.log(`  ${check.name}: ${orphanCount === 0 ? '✓' : '✗'} ${orphanCount} orphans`);
});

db.close();

console.log('\n✅ Database verification complete!');
console.log(`\nDatabase file: ${dbPath}`);
console.log(`Size: ${(require('fs').statSync(dbPath).size / 1024).toFixed(2)} KB`);
