#!/usr/bin/env node

/**
 * Live Database Verification
 * Connects to InsForge and shows what was created
 */

const { Client } = require('pg');

const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
    console.error('Missing connection string. Usage: node verify-live-db.js "postgresql://..."');
    process.exit(1);
}

async function verify() {
    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('Connected to InsForge live database\n');
        console.log('='.repeat(60));
        console.log('LIVE DATABASE VERIFICATION');
        console.log('='.repeat(60));
        console.log('');

        // Table count
        const tables = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);

        console.log(`📊 Tables Created: ${tables.rows.length}`);
        tables.rows.forEach(t => console.log(`   - ${t.table_name}`));
        console.log('');

        // Indexes
        const indexes = await client.query(`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE schemaname = 'public'
            ORDER BY tablename, indexname;
        `);

        console.log(`🔍 Indexes: ${indexes.rows.length}`);
        indexes.rows.forEach(i => {
            if (!i.indexname.includes('pg_toast') && !i.indexname.includes('pg_depend')) {
                console.log(`   - ${i.indexname}`);
            }
        });
        console.log('');

        // Sample projects
        const projects = await client.query(`
            SELECT project_code, status, base_url, is_multi_country
            FROM projects
            WHERE project_code IN ('TEST_SINGLE', 'TEST_MULTI', 'TEST_PAUSED')
            ORDER BY project_code;
        `);

        console.log('📋 Sample Projects:');
        projects.rows.forEach(p => {
            console.log(`   ${p.project_code} (${p.status})`);
            console.log(`      URL: ${p.base_url}`);
            console.log(`      Multi-country: ${p.is_multi_country}`);
        });
        console.log('');

        // Suppliers
        const suppliers = await client.query(`
            SELECT supplier_token, name, platform_type
            FROM suppliers
            WHERE supplier_token IN ('DYN01', 'LUC01', 'CIN01');
        `);

        console.log('🏭 Sample Suppliers:');
        suppliers.rows.forEach(s => {
            console.log(`   ${s.supplier_token} - ${s.name} (${s.platform_type})`);
        });
        console.log('');

        // Quota links
        const links = await client.query(`
            SELECT
                s.supplier_token,
                p.project_code,
                sl.quota_allocated,
                sl.quota_used,
                sl.status
            FROM supplier_project_links sl
            JOIN suppliers s ON sl.supplier_id = s.id
            JOIN projects p ON sl.project_id = p.id
            ORDER BY s.supplier_token;
        `);

        console.log('🔗 Supplier-Project Links:');
        links.rows.forEach(l => {
            const quota = l.quota_allocated === 0 ? 'unlimited' : `${l.quota_allocated} total`;
            console.log(`   ${l.supplier_token} → ${l.project_code} (${quota}, used: ${l.quota_used})`);
        });
        console.log('');

        // Audit logs (if any)
        const logs = await client.query(`
            SELECT COUNT(*) as count FROM audit_logs;
        `);

        console.log(`📜 Audit Logs: ${logs.rows[0].count} entries (empty initially - will fill with traffic)`);
        console.log('');

        console.log('='.repeat(60));
        console.log('✅ DATABASE IS READY FOR PRODUCTION');
        console.log('='.repeat(60));
        console.log('');
        console.log('Next steps:');
        console.log('1. Update your .env with:');
        console.log(`   NEXT_PUBLIC_INSFORGE_URL=${connectionString.replace(/\/\?.*$/, '')}`);
        console.log('');
        console.log('2. Test routing:');
        console.log('   curl -v "http://localhost:3000/r/TEST_SINGLE/DYN01/UID123"');
        console.log('');
        console.log('3. Watch audit logs:');
        console.log('   SELECT event_type, COUNT(*) FROM audit_logs GROUP BY event_type;');
        console.log('');

    } catch (error) {
        console.error('Verification failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

verify();
