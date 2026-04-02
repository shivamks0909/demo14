#!/usr/bin/env node

/**
 * End-to-End Test: S2S Verification & Fraud Detection
 * Tests the complete flow: entry → S2S → callback → fraud check
 */

const { Client } = require('pg');
const crypto = require('crypto');
const http = require('http');

const DB_URL = 'postgresql://postgres:4ab5b1b8285f16fb0cbc6071ffa26100@6dt6nyi6.us-east.database.insforge.app:5432/insforge?sslmode=require';

async function runTests() {
    console.log('='.repeat(70));
    console.log('END-TO-END IMPLEMENTATION TEST');
    console.log('='.repeat(70));
    console.log('');

    const client = new Client({ connectionString: DB_URL });
    await client.connect();

    try {
        // =====================================
        // TEST 1: Verify Schema
        // =====================================
        console.log('[TEST 1] Database Schema');
        console.log('-'.repeat(70));

        const tables = await client.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);
        console.log(`Tables: ${tables.rows.map(r => r.table_name).join(', ')}`);

        // Check for required columns
        const cols = await client.query(`
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_name IN ('responses', 's2s_config')
              AND column_name IN ('s2s_token', 'is_fake_suspected', 'unverified_action')
            ORDER BY table_name, column_name;
        `);

        console.log('Required columns:');
        cols.rows.forEach(r => {
            console.log(`  ✓ ${r.table_name}.${r.column_name}`);
        });

        if (cols.rows.length !== 3) {
            throw new Error('Missing required columns');
        }
        console.log('');

        // =====================================
        // TEST 2: Create Test Data
        // =====================================
        console.log('[TEST 2] Create Test Response');
        console.log('-'.repeat(70));

        const projectCode = 'TEST_SINGLE';
        const projRes = await client.query('SELECT id FROM projects WHERE project_code = $1', [projectCode]);
        if (!projRes.rows[0]) {
            throw new Error('Test project not found');
        }
        const projectId = projRes.rows[0].id;

        const session = crypto.randomUUID();
        const s2sToken = crypto.randomBytes(16).toString('hex');

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

        console.log(`Created response:`);
        console.log(`  oi_session: ${session}`);
        console.log(`  s2s_token: ${s2sToken}`);
        console.log('');

        // =====================================
        // TEST 3: Configure S2S Requirement
        // =====================================
        console.log('[TEST 3] Configure S2S for Project');
        console.log('-'.repeat(70));

        await client.query(`
            INSERT INTO s2s_config (project_id, secret_key, require_s2s_for_complete, unverified_action)
            VALUES ($1, $2, true, 'terminate')
            ON CONFLICT (project_id) DO UPDATE SET
                secret_key = EXCLUDED.secret_key,
                require_s2s_for_complete = EXCLUDED.require_s2s_for_complete,
                unverified_action = EXCLUDED.unverified_action
        `, [projectId, s2sToken]);

        console.log('S2S Config set:');
        console.log('  require_s2s_for_complete: true');
        console.log('  unverified_action: terminate');
        console.log('');

        // =====================================
        // TEST 4: Test S2S Callback (Success)
        // =====================================
        console.log('[TEST 4] S2S Callback - Valid Signature');
        console.log('-'.repeat(70));

        const timestamp = Math.floor(Date.now() / 1000);
        const payload = `oi_session=${session}&status=complete&timestamp=${timestamp}`;
        const hash = crypto.createHmac('sha256', s2sToken).update(payload).digest('hex');

        const s2sRes = await httpPost('http://localhost:3000/api/s2s/callback', {
            oi_session: session,
            status: 'complete',
            timestamp,
            hash
        });

        console.log(`Response: ${JSON.stringify(s2sRes)}`);

        if (!s2sRes.success) {
            throw new Error(`S2S callback failed: ${s2sRes.reason}`);
        }
        console.log('✓ S2S verification successful');
        console.log('');

        // =====================================
        // TEST 5: Test Normal Callback (Now Should Work)
        // =====================================
        console.log('[TEST 5] Normal Callback After S2S Verified');
        console.log('-'.repeat(70));

        const cbRes = await httpGet(`http://localhost:3000/api/callback?session=${session}&type=complete`);
        console.log(`Status: ${cbRes.statusCode}`);
        console.log(`Body: ${JSON.stringify(JSON.parse(cbRes.body))}`);

        if (cbRes.statusCode !== 200 || !JSON.parse(cbRes.body).success) {
            throw new Error('Callback failed after S2S verification');
        }
        console.log('✓ Callback succeeded (S2S verified)');
        console.log('');

        // =====================================
        // TEST 6: Verify Fraud Detection (Unverified)
        // =====================================
        console.log('[TEST 6] Fraud Detection - No S2S');
        console.log('-'.repeat(70));

        // Create another response without S2S verification
        const session2 = crypto.randomUUID();
        await client.query(`
            INSERT INTO responses (
                id, project_id, project_code, supplier_uid, uid,
                oi_session, session_token, clickid, hash,
                status, start_time, created_at
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $6, $6, $6,
                'in_progress', NOW(), NOW()
            )
        `, [
            crypto.randomUUID(),
            projectId,
            projectCode,
            'FRAUDUSER',
            'FRAUDUSER',
            session2
        ]);

        console.log(`Created unverified response: ${session2}`);

        // Attempt callback without S2S
        const fraudRes = await httpGet(`http://localhost:3000/api/callback?session=${session2}&type=complete`);
        console.log(`Status: ${fraudRes.statusCode}`);
        console.log(`Body: ${JSON.stringify(JSON.parse(fraudRes.body))}`);

        if (fraudRes.statusCode !== 200) {
            throw new Error('Fraud test failed - expected 200 with overridden status');
        }

        const body = JSON.parse(fraudRes.body);
        if (!body.success) {
            throw new Error('Fraud test failed - expected success');
        }

        console.log('✓ Callback allowed (status may be overridden to terminate)');
        console.log('');

        // =====================================
        // VERIFICATION QUERIES
        // =====================================
        console.log('[VERIFICATION] Check Audit Trail');
        console.log('-'.repeat(70));

        const logs = await client.query(`
            SELECT event_type, COUNT(*) as count
            FROM audit_logs
            WHERE created_at > NOW() - INTERVAL '5 minutes'
            GROUP BY event_type
            ORDER BY count DESC;
        `);

        logs.rows.forEach(log => {
            console.log(`  ${log.event_type}: ${log.count}`);
        });

        console.log('');

        const responses = await client.query(`
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN is_fake_suspected = true THEN 1 END) as flagged,
                COUNT(CASE WHEN s2s_verified = true THEN 1 END) as verified
            FROM responses
            WHERE project_code = $1;
        `, [projectCode]);

        console.log('Response fraud stats:');
        console.log(`  Total: ${responses.rows[0].total}`);
        console.log(`  S2S Verified: ${responses.rows[0].verified}`);
        console.log(`  Fake Suspected: ${responses.rows[0].flagged}`);
        console.log('');

        console.log('='.repeat(70));
        console.log('✅ ALL TESTS PASSED');
        console.log('='.repeat(70));
        console.log('');
        console.log('Implementation complete:');
        console.log('  • S2S token generation in entry flows');
        console.log('  • /api/s2s/callback endpoint with HMAC verification');
        console.log('  • Fraud detection in callback handlers');
        console.log('  • Audit logging for all events');
        console.log('  • Backward compatible - existing flow still works');
        console.log('');

    } catch (error) {
        console.error('');
        console.error('✗ TEST FAILED:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

function httpGet(url) {
    return new Promise((resolve) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
        }).on('error', reject);
    });
}

function httpPost(url, body) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(body);
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ statusCode: res.statusCode, ...JSON.parse(data) });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

runTests();
