#!/usr/bin/env node

/**
 * Database Seeder - Populate local database with sample data
 */

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'local.db')
const db = new Database(dbPath)

// Enable WAL mode
db.pragma('journal_mode = WAL')

console.log('🌱 Initializing database schema...')

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    project_code TEXT NOT NULL UNIQUE,
    project_name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
    client_id TEXT,
    country TEXT DEFAULT 'Global',
    is_multi_country INTEGER DEFAULT 0,
    has_prescreener INTEGER DEFAULT 0,
    prescreener_url TEXT DEFAULT '',
    complete_target INTEGER,
    country_urls TEXT DEFAULT '[]',
    pid_prefix TEXT DEFAULT '',
    pid_counter INTEGER DEFAULT 1,
    pid_padding INTEGER DEFAULT 2,
    force_pid_as_uid INTEGER DEFAULT 0,
    target_uid TEXT DEFAULT '',
    client_pid_param TEXT DEFAULT '',
    client_uid_param TEXT DEFAULT '',
    oi_prefix TEXT DEFAULT 'oi_',
    uid_params TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    project_code TEXT,
    project_name TEXT,
    uid TEXT,
    clickid TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'complete', 'terminate', 'quota_full', 'security_terminate', 'duplicate_ip', 'duplicate_string')),
    supplier_uid TEXT,
    ip TEXT,
    user_agent TEXT,
    device_type TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    supplier_token TEXT NOT NULL UNIQUE,
    contact_email TEXT,
    platform_type TEXT,
    uid_macro TEXT,
    complete_redirect_url TEXT,
    terminate_redirect_url TEXT,
    quotafull_redirect_url TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS supplier_project_links (
    id TEXT PRIMARY KEY,
    supplier_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    quota_allocated INTEGER DEFAULT 0,
    quota_used INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(supplier_id, project_id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  )
`)

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_responses_project_id ON responses(project_id);
  CREATE INDEX IF NOT EXISTS idx_responses_clickid ON responses(clickid);
  CREATE INDEX IF NOT EXISTS idx_responses_status ON responses(status);
  CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);
  CREATE INDEX IF NOT EXISTS idx_responses_supplier_uid ON responses(supplier_uid);
  CREATE INDEX IF NOT EXISTS idx_supplier_project_links_active ON supplier_project_links(supplier_id, project_id, status);
`)

console.log('✓ Schema initialized')
console.log('🌱 Seeding database...')

// Create sample client
let clientId
try {
  clientId = crypto.randomUUID()
  db.prepare('INSERT INTO clients (id, name) VALUES (?, ?)').run(clientId, 'Nexus Intelligence')
  console.log('✓ Created client: Nexus Intelligence')
} catch (err) {
  console.log('⚠ Client Nexus Intelligence already exists')
  const existing = db.prepare('SELECT id FROM clients WHERE name = ?').get('Nexus Intelligence')
  if (existing) clientId = existing.id
}

// Create test projects required by integration tests
const testProjects = [
  {
    id: crypto.randomUUID(),
    project_code: 'TEST_SINGLE',
    project_name: 'Test Single Country Survey',
    base_url: 'https://survey.example.com/study1',
    status: 'active',
    country: 'US',
    is_multi_country: 0
  },
  {
    id: crypto.randomUUID(),
    project_code: 'TEST_PAUSED',
    project_name: 'Test Paused Survey',
    base_url: 'https://survey.example.com/paused',
    status: 'paused',
    country: 'Global',
    is_multi_country: 0
  },
  {
    id: crypto.randomUUID(),
    project_code: 'TEST_MULTI',
    project_name: 'Test Multi-Country Survey',
    base_url: 'https://survey.example.com/study2',
    status: 'active',
    country: 'Global',
    is_multi_country: 1,
    country_urls: JSON.stringify({
      'US': 'https://survey.example.com/study2/us',
      'GB': 'https://survey.example.com/study2/gb',
      'DE': 'https://survey.example.com/study2/de'
    })
  }
]

const insertProject = db.prepare(`
  INSERT INTO projects (id, project_code, project_name, base_url, status, client_id, country, is_multi_country, country_urls, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`)

for (const project of testProjects) {
  try {
    insertProject.run(
      project.id,
      project.project_code,
      project.project_name,
      project.base_url,
      project.status,
      clientId,
      project.country,
      project.is_multi_country,
      project.country_urls || '[]'
    )
    console.log(`✓ Created project: ${project.project_code}`)
  } catch (err) {
    console.log(`⚠ Project ${project.project_code} already exists`)
  }
}

// Create supplier for testing (used by integration tests)
let supplierId
try {
  supplierId = crypto.randomUUID()
  db.prepare(`
    INSERT INTO suppliers (id, name, supplier_token, status)
    VALUES (?, ?, ?, ?)
  `).run(supplierId, 'Test Supplier', 'DYN01', 'active')
  console.log('✓ Created supplier: DYN01')
} catch (err) {
  console.log('⚠ Supplier DYN01 already exists')
  const existingSupplier = db.prepare('SELECT id FROM suppliers WHERE supplier_token = ?').get('DYN01')
  if (existingSupplier) supplierId = existingSupplier.id
}

// Create supplier project links for test projects
if (supplierId) {
  const testProjectCodes = ['TEST_SINGLE', 'TEST_MULTI']
  for (const projectCode of testProjectCodes) {
    const project = db.prepare('SELECT id FROM projects WHERE project_code = ?').get(projectCode)
    if (project) {
      try {
        const linkId = crypto.randomUUID()
        db.prepare(`
          INSERT INTO supplier_project_links (id, supplier_id, project_id, quota_allocated, quota_used, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(linkId, supplierId, project.id, 100, 0, 'active')
        console.log(`✓ Created supplier link: DYN01 -> ${projectCode}`)
      } catch (err) {
        console.log(`⚠ Supplier link for ${projectCode} already exists`)
      }
    }
  }
}

// Create sample responses for testing (including duplicate UID for testing)
const sampleUids = [
  { uid: 'DYN01', projectCode: 'TEST_SINGLE' },
  { uid: 'CIN01', projectCode: 'TEST_SINGLE' },
  { uid: 'LUC01', projectCode: 'TEST_MULTI' }
]

const insertResponse = db.prepare(`
  INSERT INTO responses (id, project_id, project_code, uid, status, created_at)
  VALUES (?, ?, ?, ?, ?, datetime('now'))
`)

for (const sample of sampleUids) {
  const project = db.prepare('SELECT id FROM projects WHERE project_code = ?').get(sample.projectCode)
  if (project) {
    try {
      insertResponse.run(
        crypto.randomUUID(),
        project.id,
        sample.projectCode,
        sample.uid,
        'in_progress'
      )
      console.log(`✓ Created sample response: ${sample.uid} for ${sample.projectCode}`)
    } catch (err) {
      console.log(`⚠ Response for ${sample.uid} already exists`)
    }
  }
}

console.log('\n✅ Database seeded successfully!')
console.log(`   Total projects: ${db.prepare('SELECT COUNT(*) as count FROM projects').get().count}`)
console.log(`   Total responses: ${db.prepare('SELECT COUNT(*) as count FROM responses').get().count}`)
console.log(`   Total suppliers: ${db.prepare('SELECT COUNT(*) as count FROM suppliers').get().count}`)
console.log(`   Total supplier links: ${db.prepare('SELECT COUNT(*) as count FROM supplier_project_links').get().count}`)
