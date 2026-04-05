const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'local.db');
const db = new Database(dbPath);

console.log('Seeding database with dummy data...\n');

// Enable WAL mode
db.pragma('journal_mode = WAL');

// 1. Create tables if not exist
db.exec(`
CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    company TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    company TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    project_code TEXT UNIQUE NOT NULL,
    project_name TEXT NOT NULL,
    client_id TEXT,
    status TEXT DEFAULT 'active',
    base_url TEXT,
    complete_target INTEGER DEFAULT 1000,
    country TEXT DEFAULT 'US',
    client_pid_param TEXT,
    client_uid_param TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    project_code TEXT,
    project_name TEXT,
    uid TEXT,
    oi_session TEXT,
    clickid TEXT,
    session_token TEXT,
    status TEXT DEFAULT 'in_progress',
    ip TEXT,
    user_agent TEXT,
    device_type TEXT,
    start_time TEXT,
    end_time TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    user_id TEXT,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS redirects (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    source_url TEXT,
    target_url TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS supplier_project_links (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    supplier_id TEXT,
    quota_allocated INTEGER DEFAULT 0,
    quota_used INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
);
`);

// 2. Seed Admin Users
const adminPassword = bcrypt.hashSync('admin123', 10);
const adminId = 'admin_001';

const existingAdmin = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
if (!existingAdmin) {
    db.prepare(`INSERT INTO admins (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`).run(
        adminId, 'admin', 'admin@demo14.com', adminPassword, 'admin'
    );
    console.log('✅ Admin user created: admin / admin123');
} else {
    console.log('⏭️ Admin user already exists');
}

// 3. Seed Supplier Users
const supplierPassword = bcrypt.hashSync('supplier123', 10);
const suppliers = [
    { id: 'sup_001', name: 'Sample Panel Co.', email: 'supplier@demo14.com', company: 'Sample Panel' },
    { id: 'sup_002', name: 'Global Surveys Ltd.', email: 'global@demo14.com', company: 'Global Surveys' },
    { id: 'sup_003', name: 'Quick Respond Inc.', email: 'quick@demo14.com', company: 'Quick Respond' },
];

for (const sup of suppliers) {
    const existing = db.prepare('SELECT id FROM suppliers WHERE email = ?').get(sup.email);
    if (!existing) {
        db.prepare(`INSERT INTO suppliers (id, name, email, password_hash, company, status) VALUES (?, ?, ?, ?, ?, ?)`).run(
            sup.id, sup.name, sup.email, supplierPassword, sup.company, 'active'
        );
        console.log(`✅ Supplier created: ${sup.email} / supplier123`);
    }
}

// 4. Seed Clients
const clients = [
    { id: 'cli_001', name: 'Acme Research', email: 'acme@client.com', company: 'Acme Corp' },
    { id: 'cli_002', name: 'Data Insights LLC', email: 'data@client.com', company: 'Data Insights' },
    { id: 'cli_003', name: 'Survey Masters', email: 'masters@client.com', company: 'Survey Masters Inc' },
];

for (const cli of clients) {
    const existing = db.prepare('SELECT id FROM clients WHERE email = ?').get(cli.email);
    if (!existing) {
        db.prepare(`INSERT INTO clients (id, name, email, company, status) VALUES (?, ?, ?, ?, ?)`).run(
            cli.id, cli.name, cli.email, cli.company, 'active'
        );
        console.log(`✅ Client created: ${cli.name}`);
    }
}

// 5. Seed Projects
const projects = [
    { id: 'proj_001', code: 'TEST001', name: 'Consumer Behavior Study Q1', client_id: 'cli_001', status: 'active', base_url: 'https://survey.example.com/consumer', complete_target: 5000, country: 'US' },
    { id: 'proj_002', code: 'TEST002', name: 'Health & Wellness Survey', client_id: 'cli_002', status: 'active', base_url: 'https://survey.example.com/health', complete_target: 3000, country: 'UK' },
    { id: 'proj_003', code: 'TEST003', name: 'Tech Adoption Research', client_id: 'cli_003', status: 'active', base_url: 'https://survey.example.com/tech', complete_target: 2000, country: 'CA' },
    { id: 'proj_004', code: 'PAUSE01', name: 'Paused Market Study', client_id: 'cli_001', status: 'paused', base_url: 'https://survey.example.com/paused', complete_target: 1000, country: 'US' },
    { id: 'proj_005', code: 'QUOTA01', name: 'Full Quota Study', client_id: 'cli_002', status: 'quota_full', base_url: 'https://survey.example.com/quota', complete_target: 500, country: 'DE' },
];

for (const proj of projects) {
    const existing = db.prepare('SELECT id FROM projects WHERE project_code = ?').get(proj.code);
    if (!existing) {
        db.prepare(`INSERT INTO projects (id, project_code, project_name, client_id, status, base_url, complete_target, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
            proj.id, proj.code, proj.name, proj.client_id, proj.status, proj.base_url, proj.complete_target, proj.country
        );
        console.log(`✅ Project created: ${proj.code} - ${proj.name}`);
    }
}

// 6. Seed Responses
const responseStatuses = ['complete', 'terminate', 'screenout', 'quota_full', 'in_progress'];
for (let i = 0; i < 50; i++) {
    const proj = projects[Math.floor(Math.random() * 3)]; // Only active projects
    const status = responseStatuses[Math.floor(Math.random() * responseStatuses.length)];
    const respId = `resp_${Date.now()}_${i}`;
    const existing = db.prepare('SELECT id FROM responses WHERE id = ?').get(respId);
    if (!existing) {
        db.prepare(`INSERT INTO responses (id, project_id, project_code, project_name, uid, oi_session, clickid, session_token, status, ip, user_agent, device_type, start_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            respId, proj.id, proj.code, proj.name, `uid_${i}`, `session_${i}`, `click_${i}`, `token_${i}`, status, `192.168.1.${i}`, 'Mozilla/5.0', Math.random() > 0.5 ? 'desktop' : 'mobile', new Date().toISOString()
        );
    }
}
console.log('✅ 50 responses seeded');

// 7. Seed Audit Logs
const actions = ['project_created', 'project_updated', 'response_completed', 'supplier_added', 'client_added', 'settings_updated', 'login_success'];
for (let i = 0; i < 30; i++) {
    const logId = `log_${Date.now()}_${i}`;
    const existing = db.prepare('SELECT id FROM audit_logs WHERE id = ?').get(logId);
    if (!existing) {
        db.prepare(`INSERT INTO audit_logs (id, action, entity_type, entity_id, user_id, details) VALUES (?, ?, ?, ?, ?, ?)`).run(
            logId, actions[Math.floor(Math.random() * actions.length)], 'project', `proj_00${Math.floor(Math.random() * 3) + 1}`, 'admin_001', `Automated log entry ${i}`
        );
    }
}
console.log('✅ 30 audit logs seeded');

// 8. Seed Redirects
for (let i = 0; i < 5; i++) {
    const proj = projects[i];
    const redirId = `redir_${i}`;
    const existing = db.prepare('SELECT id FROM redirects WHERE id = ?').get(redirId);
    if (!existing) {
        db.prepare(`INSERT INTO redirects (id, project_id, source_url, target_url, status) VALUES (?, ?, ?, ?, ?)`).run(
            redirId, proj.id, `https://track.example.com/r/${proj.code}`, proj.base_url, 'active'
        );
    }
}
console.log('✅ 5 redirects seeded');

// 9. Seed Supplier-Project Links
for (const sup of suppliers) {
    for (const proj of projects.filter(p => p.status === 'active')) {
        const linkId = `link_${sup.id}_${proj.id}`;
        const existing = db.prepare('SELECT id FROM supplier_project_links WHERE id = ?').get(linkId);
        if (!existing) {
            const quotaUsed = Math.floor(Math.random() * 500);
            db.prepare(`INSERT INTO supplier_project_links (id, project_id, supplier_id, quota_allocated, quota_used, status) VALUES (?, ?, ?, ?, ?, ?)`).run(
                linkId, proj.id, sup.id, 1000, quotaUsed, 'active'
            );
        }
    }
}
console.log('✅ Supplier-project links seeded');

db.close();
console.log('\n🎉 Database seeding complete!\n');
console.log('═══════════════════════════════════════════');
console.log('  LOGIN CREDENTIALS');
console.log('═══════════════════════════════════════════');
console.log('');
console.log('  Admin Dashboard:');
console.log('    Username: admin');
console.log('    Password: admin123');
console.log('');
console.log('  Supplier Portal:');
console.log('    Email: supplier@demo14.com');
console.log('    Password: supplier123');
console.log('');
console.log('═══════════════════════════════════════════');
