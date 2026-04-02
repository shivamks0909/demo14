#!/usr/bin/env node

/**
 * PHASE 1: Add S2S fields to existing database
 * Adds: responses.s2s_token, responses.is_fake_suspected, s2s_config.unverified_action
 */

const { Client } = require('pg');

const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
    console.error('Missing connection string. Usage: node scripts/migrate-s2s-fields.js "postgresql://..."');
    process.exit(1);
}

async function migrate() {
    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('Connected to database\n');
        console.log('='.repeat(60));
        console.log('PHASE 1: S2S FIELDS MIGRATION');
        console.log('='.repeat(60));
        console.log('');

        // 1. Add s2s_token to responses
        console.log('Adding responses.s2s_token...');
        try {
            await client.query(`
                ALTER TABLE responses
                ADD COLUMN IF NOT EXISTS s2s_token TEXT;
            `);
            console.log('   ✓ s2s_token added');
        } catch (e) {
            console.log('   ✗ Failed:', e.message);
        }

        // 2. Add is_fake_suspected to responses
        console.log('Adding responses.is_fake_suspected...');
        try {
            await client.query(`
                ALTER TABLE responses
                ADD COLUMN IF NOT EXISTS is_fake_suspected BOOLEAN DEFAULT FALSE;
            `);
            console.log('   ✓ is_fake_suspected added');
        } catch (e) {
            console.log('   ✗ Failed:', e.message);
        }

        // 3. Add unverified_action to s2s_config
        console.log('Adding s2s_config.unverified_action...');
        try {
            await client.query(`
                ALTER TABLE s2s_config
                ADD COLUMN IF NOT EXISTS unverified_action TEXT DEFAULT 'terminate'
                CHECK (unverified_action IN ('terminate', 'allow', 'flag'));
            `);
            console.log('   ✓ unverified_action added');
        } catch (e) {
            console.log('   ✗ Failed:', e.message);
        }

        // 4. Create indexes
        console.log('Creating performance indexes...');
        try {
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_responses_s2s_token ON responses(s2s_token);
            `);
            console.log('   ✓ idx_responses_s2s_token');
        } catch (e) {
            console.log('   ✗ Index failed:', e.message);
        }

        try {
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_responses_fake_suspected ON responses(is_fake_suspected);
            `);
            console.log('   ✓ idx_responses_fake_suspected');
        } catch (e) {
            console.log('   ✗ Index failed:', e.message);
        }

        console.log('');
        console.log('='.repeat(60));
        console.log('✓ PHASE 1 COMPLETE');
        console.log('='.repeat(60));
        console.log('');
        console.log('Added fields:');
        console.log('  • responses.s2s_token');
        console.log('  • responses.is_fake_suspected');
        console.log('  • s2s_config.unverified_action');
        console.log('');
        console.log('Next: PHASE 2 - Create /api/s2s/callback endpoint');
        console.log('');

        // Verify
        const cols = await client.query(`
            SELECT table_name, column_name, data_type
            FROM information_schema.columns
            WHERE table_name IN ('responses', 's2s_config')
                AND column_name IN ('s2s_token', 'is_fake_suspected', 'unverified_action')
            ORDER BY table_name, column_name;
        `);

        if (cols.rows.length > 0) {
            console.log('Verification:');
            cols.rows.forEach(r => {
                console.log(`  ✓ ${r.table_name}.${r.column_name} (${r.data_type})`);
            });
        }

    } catch (error) {
        console.error('');
        console.error('Migration failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();
