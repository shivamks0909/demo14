#!/usr/bin/env node

/**
 * Test S2S Callback endpoint with a mock response
 */

const http = require('http');

// Use live InsForge connection
const DATABASE_URL = 'postgresql://postgres:4ab5b1b8285f16fb0cbc6071ffa26100@6dt6nyi6.us-east.database.insforge.app:5432/insforge?sslmode=require';

// Step 1: Create a test response directly in DB with known s2s_token
const { Client } = require('pg');
const crypto = require('crypto');

async function testS2S() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        await client.connect();
        console.log('Connected to live database');

        // Create a test response
        const session = crypto.randomUUID();
        const s2sToken = crypto.randomBytes(16).toString('hex');
        const projectCode = 'TEST_SINGLE';

        // Get project_id
        const projRes = await client.query('SELECT id FROM projects WHERE project_code = $1', [projectCode]);
        if (!projRes.rows[0]) {
            throw new Error('Project not found');
        }
        const projectId = projRes.rows[0].id;

        // Insert test response
        await client.query(`
            INSERT INTO responses (
                id, project_id, project_code, supplier_uid, uid,
                oi_session, session_token, clickid, hash,
                s2s_token, status, start_time, created_at
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $6, $6, $6,
                $7, 'in_progress', NOW(), NOW()
            )
        `, [
            crypto.randomUUID(),
            projectId,
            projectCode,
            'TESTUSER',
            'TESTUSER',
            session,
            s2sToken
        ]);

        console.log(`Created test response:`);
        console.log(`  session: ${session}`);
        console.log(`  s2s_token: ${s2sToken}`);
        console.log('');

        // Create s2s_config for project (requiring S2S)
        await client.query(`
            INSERT INTO s2s_config (project_id, secret_key, require_s2s_for_complete, unverified_action)
            VALUES ($1, $2, true, 'terminate')
            ON CONFLICT (project_id) DO UPDATE SET
                secret_key = EXCLUDED.secret_key,
                require_s2s_for_complete = EXCLUDED.require_s2s_for_complete,
                unverified_action = EXCLUDED.unverified_action
        `, [projectId, s2sToken]);

        console.log('Configured S2S requirement: true, action: terminate');
        console.log('');

        // Now test the callback endpoint locally
        console.log('To test the S2S callback endpoint, start your dev server and run:');
        console.log(`  curl -X POST http://localhost:3000/api/s2s/callback -H "Content-Type: application/json" -d '{"oi_session":"${session}","status":"complete","timestamp":${Math.floor(Date.now()/1000)},"hash":"'${crypto.createHmac('sha256', s2sToken).update(`oi_session=${session}&status=complete&timestamp=${Math.floor(Date.now()/1000)}`).digest('hex')}'"}'`);
        console.log('');
        console.log('Expected: {"success":true,"verified":true}');

        // Clean up after test? Leave it for manual testing.

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.end();
    }
}

testS2S();
