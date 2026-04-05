const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const dbPath = path.join(process.cwd(), 'data', 'local.db');
console.log('Database path:', dbPath);

// Delete existing database to start fresh
const fs = require('fs');
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Deleted existing database');
}

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('\n=== Creating Complete Database Schema ===\n');

// 1. Clients table
db.exec(`
    CREATE TABLE clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
`);
console.log('✓ Created clients table');

// 2. Projects table - FULL schema
db.exec(`
    CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        project_code TEXT NOT NULL UNIQUE,
        project_name TEXT NOT NULL,
        base_url TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
        client_id TEXT DEFAULT '',
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
        source TEXT NOT NULL DEFAULT 'manual',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT
    )
`);
console.log('✓ Created projects table (full schema)');

// 3. Suppliers table
db.exec(`
    CREATE TABLE suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        supplier_token TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'active',
        redirect_url TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
`);
console.log('✓ Created suppliers table');

// 4. Supplier Project Links table
db.exec(`
    CREATE TABLE supplier_project_links (
        id TEXT PRIMARY KEY,
        supplier_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        quota_allocated INTEGER NOT NULL DEFAULT 0,
        quota_used INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
        FOREIGN KEY (project_id) REFERENCES projects(id)
    )
`);
console.log('✓ Created supplier_project_links table');

// 5. Responses table - FULL schema
db.exec(`
    CREATE TABLE responses (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        project_code TEXT,
        project_name TEXT,
        uid TEXT,
        user_uid TEXT,
        supplier_uid TEXT,
        client_uid_sent TEXT,
        hash_identifier TEXT,
        session_token TEXT,
        oi_session TEXT,
        clickid TEXT UNIQUE NOT NULL,
        hash TEXT,
        supplier_token TEXT,
        supplier_name TEXT,
        supplier TEXT,
        status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'complete', 'terminate', 'quota_full', 'security_terminate', 'duplicate_ip', 'duplicate_string')),
        ip TEXT,
        user_agent TEXT,
        device_type TEXT,
        last_landing_page TEXT,
        start_time TEXT,
        client_pid TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    )
`);
console.log('✓ Created responses table (full schema)');

// 6. Admins table
db.exec(`
    CREATE TABLE admins (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT,
        role TEXT NOT NULL DEFAULT 'admin',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
`);
console.log('✓ Created admins table');

// 7. Audit logs table
db.exec(`
    CREATE TABLE audit_logs (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        ip TEXT,
        user_agent TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
`);
console.log('✓ Created audit_logs table');

// 8. S2S Config table
db.exec(`
    CREATE TABLE s2s_config (
        project_id TEXT PRIMARY KEY,
        secret_key TEXT NOT NULL,
        allowed_ips TEXT,
        require_s2s_for_complete BOOLEAN DEFAULT 1,
        allow_test_mode BOOLEAN DEFAULT 0,
        unverified_action TEXT DEFAULT 'terminate' CHECK (unverified_action IN ('terminate', 'allow', 'flag')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT
    )
`);
console.log('✓ Created s2s_config table');

// 9. S2S Logs table
db.exec(`
    CREATE TABLE s2s_logs (
        id TEXT PRIMARY KEY,
        response_id TEXT,
        hash_match INTEGER,
        ip_match INTEGER,
        timestamp_check INTEGER,
        overall_result INTEGER,
        callback_url TEXT,
        callback_method TEXT,
        callback_status INTEGER,
        callback_response TEXT,
        verified_at TEXT NOT NULL DEFAULT (datetime('now')),
        payload TEXT,
        FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE SET NULL
    )
`);
console.log('✓ Created s2s_logs table');

// Create indexes for s2s logs
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_s2s_logs_response ON s2s_logs(response_id);
    CREATE INDEX IF NOT EXISTS idx_s2s_logs_result ON s2s_logs(overall_result);
    CREATE INDEX IF NOT EXISTS idx_s2s_logs_verified_at ON s2s_logs(verified_at);
`);
console.log('✓ Created s2s_logs indexes');

// 10. Callback Events table
db.exec(`
    CREATE TABLE callback_events (
        id TEXT PRIMARY KEY,
        click_id TEXT,
        uid TEXT,
        status TEXT NOT NULL,
        project_id TEXT,
        supplier_id TEXT,
        ip TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
`);
console.log('✓ Created callback_events table');

// 11. Callback Logs table
db.exec(`
    CREATE TABLE callback_logs (
        id TEXT PRIMARY KEY,
        event_id TEXT,
        project_code TEXT,
        message TEXT,
        status TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (event_id) REFERENCES callback_events(id)
    )
`);
console.log('✓ Created callback_logs table');

// Create indexes
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_responses_project ON responses(project_id);
    CREATE INDEX IF NOT EXISTS idx_responses_status ON responses(status);
    CREATE INDEX IF NOT EXISTS idx_responses_clickid ON responses(clickid);
    CREATE INDEX IF NOT EXISTS idx_responses_oi_session ON responses(oi_session);
    CREATE INDEX IF NOT EXISTS idx_responses_uid ON responses(uid);
    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(project_code);
    CREATE INDEX IF NOT EXISTS idx_suppliers_token ON suppliers(supplier_token);
    CREATE INDEX IF NOT EXISTS idx_supplier_links_project ON supplier_project_links(project_id);
    CREATE INDEX IF NOT EXISTS idx_supplier_links_supplier ON supplier_project_links(supplier_id);
`);
console.log('\n✓ Created indexes');

// ============================================
// INSERT SEED DATA
// ============================================
console.log('\n=== Inserting Seed Data ===\n');

// 1. Create default admin
const hashedPassword = bcrypt.hashSync('admin123', 10);
db.prepare(`INSERT INTO admins (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)`).run(
    'admin_default_001',
    'admin@opinioninsights.in',
    hashedPassword,
    'Admin',
    'admin'
);
console.log('✓ Created admin: admin@opinioninsights.in / admin123');

// 2. Create sample clients
const clients = [
    { id: 'client_001', name: 'Sample Client A' },
    { id: 'client_002', name: 'Sample Client B' },
];
for (const c of clients) {
    db.prepare(`INSERT OR IGNORE INTO clients (id, name) VALUES (?, ?)`).run(c.id, c.name);
}
console.log(`✓ Created ${clients.length} clients`);

// 3. Create sample suppliers
const suppliers = [
    { id: 'supplier_001', name: 'Supplier Alpha', token: 'alpha_token_001' },
    { id: 'supplier_002', name: 'Supplier Beta', token: 'beta_token_002' },
    { id: 'supplier_003', name: 'Supplier Gamma', token: 'gamma_token_003' },
];
for (const s of suppliers) {
    db.prepare(`INSERT OR IGNORE INTO suppliers (id, name, supplier_token) VALUES (?, ?, ?)`).run(s.id, s.name, s.token);
}
console.log(`✓ Created ${suppliers.length} suppliers`);

// 4. Create sample projects with FULL fields
const projects = [
    {
        id: 'project_001',
        code: 'PROJ001',
        name: 'Healthcare Survey Q1',
        clientId: 'client_001',
        baseUrl: 'https://example.com/survey1',
        target: 5000,
        countryUrls: JSON.stringify([{ country: 'US', url: 'https://example.com/survey1?country=US' }]),
    },
    {
        id: 'project_002',
        code: 'PROJ002',
        name: 'Consumer Behavior Study',
        clientId: 'client_002',
        baseUrl: 'https://example.com/survey2',
        target: 3000,
        countryUrls: JSON.stringify([{ country: 'US', url: 'https://example.com/survey2?country=US' }]),
    },
];
for (const p of projects) {
    db.prepare(`INSERT OR IGNORE INTO projects (
        id, project_code, project_name, base_url, client_id, complete_target, 
        country_urls, status, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        p.id, p.code, p.name, p.baseUrl, p.clientId, p.target, p.countryUrls, 'active', 'manual'
    );
}
console.log(`✓ Created ${projects.length} projects`);

// 5. Link suppliers to projects
const links = [
    { id: 'link_001', supplierId: 'supplier_001', projectId: 'project_001', quota: 2500 },
    { id: 'link_002', supplierId: 'supplier_002', projectId: 'project_001', quota: 2500 },
    { id: 'link_003', supplierId: 'supplier_003', projectId: 'project_002', quota: 3000 },
];
for (const l of links) {
    db.prepare(`INSERT OR IGNORE INTO supplier_project_links (id, supplier_id, project_id, quota_allocated) VALUES (?, ?, ?, ?)`).run(
        l.id, l.supplierId, l.projectId, l.quota
    );
}
console.log(`✓ Created ${links.length} supplier-project links`);

// ============================================
// VERIFY
// ============================================
console.log('\n=== Database Summary ===\n');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

const tableCounts = tables.map(t => {
    const count = db.prepare(`SELECT COUNT(*) as cnt FROM ${t.name}`).get();
    return `${t.name}: ${count.cnt}`;
});
console.log('\nRow counts:');
tableCounts.forEach(tc => console.log(`  ${tc}`));

// Verify project columns
const projCols = db.prepare("PRAGMA table_info(projects)").all();
console.log('\nProjects columns:', projCols.map(c => c.name).join(', '));

// Verify response columns
const respCols = db.prepare("PRAGMA table_info(responses)").all();
console.log('\nResponses columns:', respCols.map(c => c.name).join(', '));

const admin = db.prepare("SELECT id, email, name, role FROM admins").get();
console.log('\nAdmin user:', admin);

db.close();
console.log('\n✅ Complete database setup finished!');
console.log('\nLogin credentials:');
console.log('  Email: admin@opinioninsights.in');
console.log('  Password: admin123');
