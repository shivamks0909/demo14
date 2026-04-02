#!/usr/bin/env node

/**
 * Add callback_logs table to database
 * Works for both SQLite (local) and PostgreSQL (InsForge)
 */

const { Client } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Determine environment
const isLive = process.argv.includes('--live') || !!process.env.DATABASE_URL;
const connectionString = process.env.DATABASE_URL || (isLive ? null : null);

async function migrateLive() {
    if (!connectionString) {
        console.error('DATABASE_URL required for live migration');
        process.exit(1);
    }

    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('Connected to live InsForge database\n');
        console.log('Creating callback_logs table...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS callback_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                project_code TEXT NOT NULL,
                clickid TEXT NOT NULL,
                type TEXT NOT NULL,
                status_mapped TEXT,
                response_code INTEGER,
                response_body TEXT,
                latency_ms INTEGER,
                raw_query TEXT,
                ip_address TEXT,
                user_agent TEXT,
                success BOOLEAN DEFAULT FALSE,
                error_message TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_callback_logs_project ON callback_logs(project_code);
            CREATE INDEX IF NOT EXISTS idx_callback_logs_clickid ON callback_logs(clickid);
            CREATE INDEX IF NOT EXISTS idx_callback_logs_created_at ON callback_logs(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_callback_logs_success ON callback_logs(success);
        `);

        console.log('✅ callback_logs table created with indexes');
        console.log('');

        // Verify
        const tables = await client.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'callback_logs';
        `);

        if (tables.rows.length > 0) {
            console.log('✓ Verification: callback_logs exists');
        }

    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

function migrateLocal() {
    console.log('Migrating local SQLite database...');

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'local.db');
    const db = new Database(dbPath);

    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS callback_logs (
                id TEXT PRIMARY KEY,
                project_code TEXT NOT NULL,
                clickid TEXT NOT NULL,
                type TEXT NOT NULL,
                status_mapped TEXT,
                response_code INTEGER,
                response_body TEXT,
                latency_ms INTEGER,
                raw_query TEXT,
                ip_address TEXT,
                user_agent TEXT,
                success BOOLEAN DEFAULT 0,
                error_message TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        `);

        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_callback_logs_project ON callback_logs(project_code);
            CREATE INDEX IF NOT EXISTS idx_callback_logs_clickid ON callback_logs(clickid);
            CREATE INDEX IF NOT EXISTS idx_callback_logs_created_at ON callback_logs(created_at);
        `);

        console.log('✅ callback_logs table created (SQLite)');
        console.log(`   Database: ${dbPath}`);
    } catch (error) {
        console.error('SQLite migration failed:', error.message);
        process.exit(1);
    } finally {
        db.close();
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('CALLBACK_LOGS TABLE MIGRATION');
    console.log('='.repeat(60));
    console.log('');

    if (isLive) {
        await migrateLive();
    } else {
        migrateLocal();
    }

    console.log('='.repeat(60));
    console.log('✓ MIGRATION COMPLETE');
    console.log('='.repeat(60));
    console.log('');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
