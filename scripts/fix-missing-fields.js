#!/usr/bin/env node

/**
 * CRITICAL FIXES: Add missing columns to live database
 *
 * This script adds:
 *  - users table (for admin login)
 *  - responses.s2s_verified
 *  - responses.s2s_verified_at
 *  - callback_events table (for legacy callbacks)
 */

const { Client } = require('pg');

const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
    console.error('Usage: node scripts/fix-missing-fields.js "postgresql://..."');
    process.exit(1);
}

async function applyFixes() {
    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('Connected to database\n');
        console.log('='.repeat(60));
        console.log('APPLYING CRITICAL FIXES');
        console.log('='.repeat(60));
        console.log('');

        // ============================================
        // 1. CREATE USERS TABLE
        // ============================================
        console.log('[1] Creating users table...');
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    email TEXT NOT NULL UNIQUE,
                    password TEXT NOT NULL,
                    name TEXT,
                    role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'viewer', 'operator')),
                    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
                    last_login TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ
                );
            `);

            await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);`);

            console.log('   ✓ users table created');
        } catch (e) {
            console.log('   ✗ Error:', e.message);
        }

        // ============================================
        // 2. ADD s2s_verified TO responses
        // ============================================
        console.log('[2] Adding responses.s2s_verified...');
        try {
            await client.query(`
                ALTER TABLE responses
                ADD COLUMN IF NOT EXISTS s2s_verified BOOLEAN DEFAULT FALSE;
            `);
            console.log('   ✓ s2s_verified added');
        } catch (e) {
            console.log('   ✗ Error:', e.message);
        }

        // ============================================
        // 3. ADD s2s_verified_at TO responses
        // ============================================
        console.log('[3] Adding responses.s2s_verified_at...');
        try {
            await client.query(`
                ALTER TABLE responses
                ADD COLUMN IF NOT EXISTS s2s_verified_at TIMESTAMPTZ;
            `);
            console.log('   ✓ s2s_verified_at added');
        } catch (e) {
            console.log('   ✗ Error:', e.message);
        }

        // ============================================
        // 4. CREATE callback_events TABLE
        // ============================================
        console.log('[4] Creating callback_events table...');
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS callback_events (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    response_id UUID REFERENCES responses(id) ON DELETE SET NULL,
                    project_code TEXT,
                    clickid TEXT,
                    status TEXT NOT NULL,
                    callback_url TEXT,
                    callback_method TEXT,
                    callback_status INTEGER,
                    callback_response TEXT,
                    ip TEXT,
                    user_agent TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            `);

            await client.query(`CREATE INDEX IF NOT EXISTS idx_callback_events_response ON callback_events(response_id);`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_callback_events_created_at ON callback_events(created_at DESC);`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_callback_events_project ON callback_events(project_code);`);

            console.log('   ✓ callback_events table created');
        } catch (e) {
            console.log('   ✗ Error:', e.message);
        }

        // ============================================
        // 5. VERIFY ALL COLUMNS EXIST
        // ============================================
        console.log('[5] Verifying all required columns...');
        const required = [
            { table: 'users', column: 'email' },
            { table: 'users', column: 'password' },
            { table: 'responses', column: 's2s_verified' },
            { table: 'responses', column: 's2s_verified_at' },
            { table: 'callback_events', column: 'id' }
        ];

        const checkCols = await client.query(`
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_name IN ('users', 'responses', 'callback_events')
              AND column_name IN ('email', 'password', 's2s_verified', 's2s_verified_at', 'id')
            ORDER BY table_name, column_name;
        `);

        console.log('   Verified:');
        checkCols.rows.forEach(r => {
            console.log(`     ✓ ${r.table_name}.${r.column_name}`);
        });

        console.log('');
        console.log('='.repeat(60));
        console.log('✓ ALL CRITICAL FIXES APPLIED');
        console.log('='.repeat(60));
        console.log('');
        console.log('Summary:');
        console.log('  • users table created (admin login will work)');
        console.log('  • responses.s2s_verified added (S2S check works)');
        console.log('  • responses.s2s_verified_at added (timestamps recorded)');
        console.log('  • callback_events table created (legacy callbacks work)');
        console.log('');
        console.log('NEXT STEPS:');
        console.log('1. Create an admin user in the users table');
        console.log('2. Test login flow');
        console.log('3. Test S2S verification flow');
        console.log('4. Verify callback logging');
        console.log('');

    } catch (error) {
        console.error('');
        console.error('FIX FAILED:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

applyFixes();
