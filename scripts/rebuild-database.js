/**
 * Database Rebuild Script
 * Backs up existing database, recreates schema from scratch, seeds test data
 */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(process.cwd(), 'data', 'local.db');
const BACKUP_PATH = path.join(process.cwd(), 'data', 'local.db.backup');

function rebuildDatabase() {
    console.log('🔧 Starting database rebuild...\n');

    // Step 1: Backup existing database
    if (fs.existsSync(DB_PATH)) {
        console.log('📦 Backing up existing database...');
        fs.copyFileSync(DB_PATH, BACKUP_PATH);
        fs.unlinkSync(DB_PATH);
        console.log('✅ Backup created at local.db.backup\n');
    }

    // Step 2: Create fresh database
    console.log('🗄️  Creating fresh database...');
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Step 3: Create schema
    console.log('📋 Creating schema...\n');

    db.exec(`
        -- Clients table
        CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Projects table
        CREATE TABLE IF NOT EXISTS projects (
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
            allowed_callback_ips TEXT DEFAULT '[]',
            s2s_secret TEXT DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT
        );

        -- Responses table
        CREATE TABLE IF NOT EXISTS responses (
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
            completion_time TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
        );

        -- Suppliers table
        CREATE TABLE IF NOT EXISTS suppliers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            supplier_token TEXT NOT NULL UNIQUE,
            status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT
        );

        -- Supplier-Project Links table
        CREATE TABLE IF NOT EXISTS supplier_project_links (
            id TEXT PRIMARY KEY,
            project_id TEXT,
            supplier_id TEXT,
            quota_allocated INTEGER NOT NULL DEFAULT 0,
            quota_used INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
        );

        -- S2S Config table
        CREATE TABLE IF NOT EXISTS s2s_config (
            id TEXT PRIMARY KEY,
            project_id TEXT,
            secret_key TEXT NOT NULL,
            hash_algorithm TEXT NOT NULL DEFAULT 'sha256',
            ip_whitelist TEXT NOT NULL DEFAULT '[]',
            timestamp_tolerance INTEGER NOT NULL DEFAULT 300,
            enabled INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        -- Callback Logs table
        CREATE TABLE IF NOT EXISTS callback_logs (
            id TEXT PRIMARY KEY,
            project_code TEXT,
            clickid TEXT,
            type TEXT,
            status_mapped TEXT,
            response_code INTEGER,
            response_body TEXT,
            success INTEGER NOT NULL DEFAULT 0,
            error_message TEXT,
            raw_query TEXT,
            ip_address TEXT,
            user_agent TEXT,
            latency_ms INTEGER,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Audit Logs table
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            event_type TEXT NOT NULL,
            payload TEXT NOT NULL,
            ip TEXT,
            user_agent TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Admins table
        CREATE TABLE IF NOT EXISTS admins (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'admin',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    `);

    console.log('✅ Schema created\n');

    // Step 4: Create indexes
    console.log('📊 Creating indexes...');
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_responses_oi_session ON responses(oi_session);
        CREATE INDEX IF NOT EXISTS idx_responses_clickid ON responses(clickid);
        CREATE INDEX IF NOT EXISTS idx_responses_project_code ON responses(project_code);
        CREATE INDEX IF NOT EXISTS idx_responses_status ON responses(status);
        CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);
        CREATE INDEX IF NOT EXISTS idx_callback_logs_clickid ON callback_logs(clickid);
        CREATE INDEX IF NOT EXISTS idx_callback_logs_created_at ON callback_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(project_code);
        CREATE INDEX IF NOT EXISTS idx_suppliers_token ON suppliers(supplier_token);
    `);
    console.log('✅ Indexes created\n');

    // Step 5: Seed test data
    console.log('🌱 Seeding test data...');

    const now = new Date().toISOString();

    // Test project
    const projectId = `proj_${crypto.randomUUID()}`;
    db.prepare(`
        INSERT INTO projects (id, project_code, project_name, base_url, status, source)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(projectId, 'PROJ001', 'Healthcare Survey Q1', 'https://example.com/survey1', 'active', 'manual');

    // Test supplier
    const supplierId = `sup_${crypto.randomUUID()}`;
    db.prepare(`
        INSERT INTO suppliers (id, name, supplier_token, status)
        VALUES (?, ?, ?, ?)
    `).run(supplierId, 'Supplier Alpha', 'alpha_token_001', 'active');

    // Supplier-Project link
    const linkId = `link_${crypto.randomUUID()}`;
    db.prepare(`
        INSERT INTO supplier_project_links (id, project_id, supplier_id, quota_allocated, quota_used)
        VALUES (?, ?, ?, ?, ?)
    `).run(linkId, projectId, supplierId, 1000, 0);

    console.log('✅ Test data seeded\n');

    // Step 6: Verify
    console.log('🔍 Verifying database...\n');

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    console.log(`📋 Tables (${tables.length}):`);
    tables.forEach(t => console.log(`   ✅ ${t.name}`));

    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name").all();
    console.log(`\n📊 Indexes (${indexes.length}):`);
    indexes.forEach(i => console.log(`   ✅ ${i.name}`));

    const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
    const supplierCount = db.prepare('SELECT COUNT(*) as count FROM suppliers').get().count;
    const linkCount = db.prepare('SELECT COUNT(*) as count FROM supplier_project_links').get().count;

    console.log(`\n📈 Data:`);
    console.log(`   Projects: ${projectCount}`);
    console.log(`   Suppliers: ${supplierCount}`);
    console.log(`   Links: ${linkCount}`);

    db.close();

    console.log('\n🎉 Database rebuild complete!');
    console.log(`📁 Database: ${DB_PATH}`);
    console.log(`💾 Backup: ${BACKUP_PATH}`);
}

try {
    rebuildDatabase();
} catch (error) {
    console.error('❌ Database rebuild failed:', error);
    process.exit(1);
}
