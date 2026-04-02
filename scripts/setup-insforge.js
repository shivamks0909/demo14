#!/usr/bin/env node

/**
 * INSFORGE PRODUCTION DATABASE SETUP
 * ===================================
 * This script creates the complete database schema on InsForge
 *
 * Usage:
 *   node scripts/setup-insforge.js postgresql://user:pass@host:5432/dbname
 *
 * Or set DATABASE_URL environment variable:
 *   DATABASE_URL=postgresql://user:pass@host:5432/dbname node scripts/setup-insforge.js
 *
 * WARNING: This will create all tables. Safe to run multiple times (IF NOT EXISTS).
 */

const { Client } = require('pg');

// Parse connection string from args or env
const databaseUrl = process.argv[2] || process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error(`
╔═══════════════════════════════════════════════════════════════╗
║   INSFORGE DATABASE SETUP                                     ║
╠═══════════════════════════════════════════════════════════════╣
║                                                            ║
║   ERROR: No database URL provided.                                         ║
║                                                            ║
║   Usage:                                                   ║
║     node scripts/setup-insforge.js postgresql://...      ║
║                                                            ║
║   Or set environment variable:                            ║
║     DATABASE_URL=postgresql://user:pass@host/db           ║
║                                                            ║
╚═══════════════════════════════════════════════════════════════╝
`);
    process.exit(1);
}

async function setupDatabase() {
    const client = new Client({ connectionString: databaseUrl });

    console.log('============================================================');
    console.log('INFORGE PRODUCTION DATABASE SETUP');
    console.log('============================================================');
    console.log('');
    console.log('Target:', maskPassword(databaseUrl));
    console.log('');

    try {
        await client.connect();
        console.log('✓ Connected to database');

        // =====================================================
        // 1. ENABLE EXTENSIONS
        // =====================================================
        console.log('');
        console.log('Step 1/8: Enabling required extensions...');

        await client.query(`
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
            CREATE EXTENSION IF NOT EXISTS "btree_gin";
        `);

        console.log('   ✓ Extensions enabled');

        // =====================================================
        // 2. CREATE TABLES
        // =====================================================
        console.log('');
        console.log('Step 2/8: Creating tables...');

        // CLIENTS - Drop first to ensure UNIQUE constraint (for ON CONFLICT)
        await client.query(`DROP TABLE IF EXISTS clients CASCADE;`);
        await client.query(`
            CREATE TABLE clients (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name TEXT NOT NULL UNIQUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);`);
        console.log('   ✓ clients');

        // PROJECTS
        await client.query(`
            CREATE TABLE IF NOT EXISTS projects (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                project_code TEXT NOT NULL UNIQUE,
                project_name TEXT NOT NULL,
                base_url TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
                client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
                country TEXT DEFAULT 'Global',
                is_multi_country BOOLEAN DEFAULT FALSE,
                country_urls JSONB,
                pid_prefix TEXT,
                pid_counter INTEGER DEFAULT 0,
                pid_padding INTEGER DEFAULT 2,
                force_pid_as_uid BOOLEAN DEFAULT FALSE,
                target_uid TEXT,
                client_pid_param TEXT DEFAULT 'pid',
                client_uid_param TEXT DEFAULT 'uid',
                has_prescreener BOOLEAN DEFAULT FALSE,
                prescreener_url TEXT,
                oi_prefix TEXT DEFAULT 'oi_',
                uid_params JSONB,
                source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'api', 'auto')),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ
            );
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(project_code);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);`);
        console.log('   ✓ projects');

        // SUPPLIERS
        await client.query(`
            CREATE TABLE IF NOT EXISTS suppliers (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name TEXT NOT NULL,
                supplier_token TEXT NOT NULL UNIQUE,
                contact_email TEXT,
                platform_type TEXT,
                uid_macro TEXT,
                complete_redirect_url TEXT,
                terminate_redirect_url TEXT,
                quotafull_redirect_url TEXT,
                notes TEXT,
                status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ
            );
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_suppliers_token ON suppliers(supplier_token);`);
        console.log('   ✓ suppliers');

        // SUPPLIER_PROJECT_LINKS
        await client.query(`
            CREATE TABLE IF NOT EXISTS supplier_project_links (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
                project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                quota_allocated INTEGER DEFAULT 0,
                quota_used INTEGER DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
                custom_complete_url TEXT,
                custom_terminate_url TEXT,
                custom_quotafull_url TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ,
                UNIQUE(supplier_id, project_id)
            );
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_supplier_project_links_supplier ON supplier_project_links(supplier_id, status);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_supplier_project_links_project ON supplier_project_links(project_id, status);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_supplier_project_links_quota ON supplier_project_links(supplier_id, project_id, status, quota_allocated, quota_used);`);
        console.log('   ✓ supplier_project_links');

        // RESPONSES (Core tracking)
        await client.query(`
            CREATE TABLE IF NOT EXISTS responses (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
                project_code TEXT NOT NULL,
                project_name TEXT,
                supplier_uid TEXT NOT NULL,
                client_uid_sent TEXT,
                uid TEXT NOT NULL,
                user_uid TEXT,
                hash_identifier TEXT,
                session_token TEXT UNIQUE NOT NULL,
                oi_session TEXT UNIQUE NOT NULL,
                clickid TEXT UNIQUE NOT NULL,
                hash TEXT,
                supplier_token TEXT,
                supplier_name TEXT,
                supplier TEXT,
                status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN (
                    'in_progress',
                    'complete',
                    'terminate',
                    'quota_full',
                    'security_terminate',
                    'duplicate_ip',
                    'duplicate_string',
                    'invalid_link',
                    'project_not_found',
                    'country_inactive',
                    'geo_mismatch',
                    'system_error'
                )),
                ip TEXT,
                user_agent TEXT,
                device_type TEXT CHECK (device_type IN ('Desktop', 'Mobile', 'Tablet', 'Unknown')),
                country_code TEXT,
                last_landing_page TEXT,
                raw_url TEXT,
                start_time TIMESTAMPTZ,
                entry_time TIMESTAMPTZ,
                completion_time TIMESTAMPTZ,
                duration_seconds INTEGER,
                source TEXT DEFAULT 'project' CHECK (source IN ('project', 'api', 'admin', 'test')),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ
            );
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_responses_project_id ON responses(project_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_responses_clickid ON responses(clickid);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_responses_oi_session ON responses(oi_session);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_responses_session_token ON responses(session_token);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_responses_status ON responses(status);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_responses_uid_project ON responses(uid, project_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_responses_supplier_uid ON responses(supplier_uid);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at DESC);`);
        console.log('   ✓ responses');

        // AUDIT_LOGS
        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                event_type TEXT NOT NULL CHECK (event_type IN (
                    'entry_denied',
                    'entry_created',
                    'quota_exceeded',
                    'tracking_failed',
                    'callback_attempt',
                    'callback_success',
                    'callback_idempotent',
                    'callback_failed',
                    's2s_verification',
                    'fraud_detected',
                    'admin_action',
                    'system_error'
                )),
                payload JSONB NOT NULL,
                ip TEXT,
                user_agent TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_ip ON audit_logs(ip);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_payload_gin ON audit_logs USING GIN(payload);`);
        console.log('   ✓ audit_logs');

        // S2S_CONFIG
        await client.query(`
            CREATE TABLE IF NOT EXISTS s2s_config (
                project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
                secret_key TEXT NOT NULL,
                allowed_ips TEXT,
                require_s2s_for_complete BOOLEAN DEFAULT TRUE,
                allow_test_mode BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ
            );
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_s2s_config_project ON s2s_config(project_id);`);
        console.log('   ✓ s2s_config');

        // S2S_LOGS
        await client.query(`
            CREATE TABLE IF NOT EXISTS s2s_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                response_id UUID REFERENCES responses(id) ON DELETE SET NULL,
                hash_match BOOLEAN,
                ip_match BOOLEAN,
                timestamp_check BOOLEAN,
                overall_result BOOLEAN,
                callback_url TEXT,
                callback_method TEXT,
                callback_status INTEGER,
                callback_response TEXT,
                verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                payload JSONB
            );
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_s2s_logs_response ON s2s_logs(response_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_s2s_logs_result ON s2s_logs(overall_result);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_s2s_logs_verified_at ON s2s_logs(verified_at DESC);`);
        console.log('   ✓ s2s_logs');

        // =====================================================
        // 3. INSERT FALLBACK PROJECT
        // =====================================================
        console.log('');
        console.log('Step 3/8: Creating fallback project...');

        await client.query(`
            INSERT INTO projects (
                id,
                project_code,
                project_name,
                base_url,
                status,
                source
            ) VALUES (
                uuid_generate_v4(),
                'external_traffic',
                'External Traffic Bucket',
                'https://external.fallback',
                'active',
                'auto'
            ) ON CONFLICT (project_code) DO NOTHING;
        `);

        console.log('   ✓ Fallback project ensured');

        // =====================================================
        // 4. VERIFY TABLE COUNT
        // =====================================================
        console.log('');
        console.log('Step 4/8: Verifying tables...');

        const tableCheck = await client.query(`
            SELECT COUNT(*) as count
            FROM information_schema.tables
            WHERE table_schema = 'public'
                AND table_type = 'BASE TABLE';
        `);

        console.log(`   ✓ ${tableCheck.rows[0].count} tables created`);

        // =====================================================
        // 5. INSERT SAMPLE CLIENT (if not exists)
        // =====================================================
        console.log('');
        console.log('Step 5/8: Seeding sample client...');

        await client.query(`
            INSERT INTO clients (id, name)
            VALUES (uuid_generate_v4(), 'Test Client')
            ON CONFLICT (name) DO NOTHING;
        `);

        console.log('   ✓ Sample client');

        // =====================================================
        // 6. INSERT SAMPLE PROJECTS
        // =====================================================
        console.log('');
        console.log('Step 6/8: Seeding sample projects...');

        // Get or create client ID
        const clientRes = await client.query(`SELECT id FROM clients WHERE name = 'Test Client' LIMIT 1;`);
        const clientId = clientRes.rows[0].id;

        // Insert projects
        const projects = [
            {
                code: 'TEST_SINGLE',
                name: 'Test Single Country Project',
                url: 'https://survey.example.com/study1',
                multi: false
            },
            {
                code: 'TEST_MULTI',
                name: 'Test Multi-Country Project',
                url: 'https://survey.example.com/study2',
                multi: true,
                countries: [
                    { code: 'US', url: 'https://survey.example.com/study2/us', active: true },
                    { code: 'GB', url: 'https://survey.example.com/study2/gb', active: true },
                    { code: 'DE', url: 'https://survey.example.com/study2/de', active: false }
                ]
            },
            {
                code: 'TEST_PAUSED',
                name: 'Test Paused Project',
                url: 'https://survey.example.com/study3',
                status: 'paused',
                multi: false
            }
        ];

        for (const p of projects) {
            await client.query(`
                INSERT INTO projects (
                    id,
                    project_code,
                    project_name,
                    base_url,
                    status,
                    client_id,
                    is_multi_country,
                    country_urls,
                    oi_prefix,
                    has_prescreener
                ) VALUES (
                    uuid_generate_v4(),
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    'oi_',
                    FALSE
                ) ON CONFLICT (project_code) DO NOTHING;
            `, [
                p.code,
                p.name,
                p.url,
                p.status || 'active',
                clientId,
                p.multi,
                p.multi ? JSON.stringify(p.countries) : null
            ]);
        }

        console.log(`   ✓ 3 sample projects inserted`);

        // =====================================================
        // 7. INSERT SAMPLE SUPPLIERS
        // =====================================================
        console.log('');
        console.log('Step 7/8: Seeding sample suppliers...');

        const suppliers = [
            { token: 'DYN01', name: 'Dynata Test', platform: 'dynata' },
            { token: 'LUC01', name: 'Lucid Test', platform: 'lucid' },
            { token: 'CIN01', name: 'Cint Test', platform: 'cint' }
        ];

        for (const s of suppliers) {
            await client.query(`
                INSERT INTO suppliers (
                    id,
                    name,
                    supplier_token,
                    platform_type,
                    uid_macro
                ) VALUES (
                    uuid_generate_v4(),
                    $1,
                    $2,
                    $3,
                    $4
                ) ON CONFLICT (supplier_token) DO NOTHING;
            `, [s.name, s.token, s.platform, '##RID##']);
        }

        console.log(`   ✓ 3 sample suppliers inserted`);

        // =====================================================
        // 8. INSERT SUPPLIER-PROJECT LINKS WITH QUOTA
        // =====================================================
        console.log('');
        console.log('Step 8/8: Seeding supplier-project links...');

        const insertLink = async (supplierToken, projectCode, quota) => {
            await client.query(`
                WITH sup AS (SELECT id FROM suppliers WHERE supplier_token = $1),
                     proj AS (SELECT id FROM projects WHERE project_code = $2)
                INSERT INTO supplier_project_links (
                    id,
                    supplier_id,
                    project_id,
                    quota_allocated,
                    quota_used,
                    status
                ) VALUES (
                    uuid_generate_v4(),
                    (SELECT id FROM sup),
                    (SELECT id FROM proj),
                    $3,
                    0,
                    'active'
                ) ON CONFLICT (supplier_id, project_id) DO NOTHING;
            `, [supplierToken, projectCode, quota]);
        };

        await insertLink('DYN01', 'TEST_SINGLE', 0);    // unlimited
        await insertLink('LUC01', 'TEST_MULTI', 50);    // 50 quota
        await insertLink('CIN01', 'TEST_SINGLE', 100);  // 100 quota

        console.log('   ✓ Supplier-project links created');
        console.log('');
        console.log('============================================================');
        console.log('✓ DATABASE SETUP COMPLETE');
        console.log('============================================================');
        console.log('');
        console.log('Schema Summary:');
        console.log('  • 8 tables created');
        console.log('  • Indexes created for performance');
        console.log('  • Sample data seeded');
        console.log('');
        console.log('Next steps:');
        console.log('  1. Verify with your application');
        console.log('  2. Test routing endpoints');
        console.log('  3. Check audit logs are working');
        console.log('');

    } catch (error) {
        console.error('');
        console.error('============================================================');
        console.error('✗ SETUP FAILED');
        console.error('============================================================');
        console.error('');
        console.error(error.message);
        console.error('');
        process.exit(1);
    } finally {
        await client.end();
    }
}

// Mask password in connection string for logging
function maskPassword(url) {
    try {
        const urlObj = new URL(url);
        if (urlObj.password) {
            urlObj.password = '********';
        }
        return urlObj.toString();
    } catch {
        // If URL parsing fails, just mask anything after :// until @
        return url.replace(/(:\/\/[^:]+:)[^@]+(@)/, '$1********$2');
    }
}

setupDatabase();
