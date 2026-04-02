/**
 * HMAC S2S Verification Test Script
 *
 * Tests the Server-to-Server callback signature verification in both:
 * - GET /api/callback (client callback)
 * - POST /api/s2s/callback (server callback)
 *
 * Run with: node test-hmac-s2s.js
 */

const crypto = require('crypto');

// Test configuration
const TEST_PROJECT_CODE = 'TEST_SINGLE';
const TEST_SUPPLIER_TOKEN = 'DYN01';
const TEST_SECRET = 'test-secret-key-123';
const TEST_SESSION = 'test-session-' + crypto.randomUUID();

// Build canonical string as per implementation
function buildCanonical(params) {
    return Object.keys(params)
        .sort()
        .map(k => `${k}=${params[k]}`)
        .join('&');
}

// Generate HMAC signature
function generateSignature(secret, params) {
    const canonical = buildCanonical(params);
    return crypto
        .createHmac('sha256', secret)
        .update(can)
        .digest('hex');
}

// Test 1: Create test data in database
async function setupTestData() {
    console.log('\n=== SETUP: Creating test data ===');

    const { database: db } = await getUnifiedDb();
    if (!db) throw new Error('Database not available');

    // Check if project exists
    const { data: project } = await db
        .from('projects')
        .select('id, project_code')
        .eq('project_code', TEST_PROJECT_CODE)
        .maybeSingle();

    if (!project) {
        throw new Error(`Test project '${TEST_PROJECT_CODE}' not found. Create it first in admin.`);
    }

    // Check if supplier exists and is linked
    const { data: supplier } = await db
        .from('suppliers')
        .select('id, supplier_token')
        .eq('supplier_token', TEST_SUPPLIER_TOKEN)
        .maybeSingle();

    if (!supplier) {
        throw new Error(`Test supplier '${TEST_SUPPLIER_TOKEN}' not found.`);
    }

    const { data: link } = await db
        .from('supplier_project_links')
        .select('*')
        .eq('supplier_id', supplier.id)
        .eq('project_id', project.id)
        .maybeSingle();

    if (!link) {
        throw new Error(`Supplier ${TEST_SUPPLIER_TOKEN} not linked to project ${TEST_PROJECT_CODE}`);
    }

    // Create s2s_config with secret key
    const { data: existingConfig } = await db
        .from('s2s_config')
        .select('*')
        .eq('project_id', project.id)
        .maybeSingle();

    if (existingConfig) {
        await db
            .from('s2s_config')
            .update({ secret_key: TEST_SECRET })
            .eq('project_id', project.id);
        console.log(`✓ Updated s2s_config for project ${TEST_PROJECT_CODE} with test secret`);
    } else {
        await db
            .from('s2s_config')
            .insert([{
                project_id: project.id,
                secret_key: TEST_SECRET,
                require_s2s_for_complete: true,
                unverified_action: 'reject'
            }]);
        console.log(`✓ Created s2s_config for project ${TEST_PROJECT_CODE} with test secret`);
    }

    // Create a response record to test callback on
    const { data: response } = await db
        .from('responses')
        .insert([{
            project_id: project.id,
            project_code: TEST_PROJECT_CODE,
            supplier_uid: 'TESTUSER123',
            uid: 'TESTUSER123',
            session_token: TEST_SESSION,
            oi_session: TEST_SESSION,
            clickid: TEST_SESSION,
            status: 'in_progress',
            s2s_token: crypto.randomBytes(16).toString('hex')
        }])
        .select('*')
        .single();

    console.log(`✓ Created test response: id=${response.id}, session=${TEST_SESSION}`);
    console.log(`\nTest Data Summary:`);
    console.log(`  Project: ${TEST_PROJECT_CODE} (id: ${project.id})`);
    console.log(`  Supplier: ${TEST_SUPPLIER_TOKEN} (id: ${supplier.id})`);
    console.log(`  Response ID: ${response.id}`);
    console.log(`  Session Token: ${TEST_SESSION}`);
    console.log(`  Shared Secret: ${TEST_SECRET}`);

    return { project, supplier, link, response };
}

// Test 2: Test callback endpoint with HMAC verification
async function testCallbackWithHmac(response) {
    console.log('\n=== TEST: Client Callback with HMAC ===');

    const { project, response: resp } = response;

    // Build signature params (matching implementation)
    const params = {
        pid: project.project_code,
        cid: resp.clickid,
        type: 'complete'
    };

    const signature = generateSignature(TEST_SECRET, params);
    console.log(`Generated signature: ${signature}`);
    console.log(`Canonical string: ${buildCanonical(params)}`);

    // Test URL construction
    const callbackUrl = `http://localhost:3000/api/callback?pid=${params.pid}&cid=${params.cid}&type=${params.type}&sig=${signature}`;
    console.log(`Callback URL: ${callbackUrl}`);

    // In actual test, you would:
    // 1. Fetch this URL with curl or node-fetch
    // 2. Check response status (should be 200)
    // 3. Verify response status updated to 'complete'
    // 4. Check audit logs

    console.log(`\nTo manually test:`);
    console.log(`  curl "${callbackUrl}"`);
    console.log(`\nExpected result:`);
    console.log(`  {"success":true,"status":"complete"}`);
    console.log(`  Response status in DB should change from 'in_progress' to 'complete'`);

    return callbackUrl;
}

// Test 3: Test S2S callback endpoint with HMAC verification
async function testS2SCallbackWithHmac(response) {
    console.log('\n=== TEST: S2S Callback with HMAC ===');

    const { response: resp } = response;

    // Build payload for POST
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        oi_session: resp.oi_session,
        status: 'complete',
        timestamp: now
    };

    const canonical = buildCanonical(payload);
    const signature = crypto
        .createHmac('sha256', TEST_SECRET)
        .update(canonical)
        .digest('hex');

    console.log(`Generated signature: ${signature}`);
    console.log(`Canonical string: ${canonical}`);

    const fullPayload = {
        ...payload,
        hash: signature
    };

    console.log(`\nS2S Payload:`);
    console.log(JSON.stringify(fullPayload, null, 2));

    console.log(`\nTo manually test (with node-fetch or curl):`);
    console.log(`  curl -X POST http://localhost:3000/api/s2s/callback \\`);
    console.log(`    -H "Content-Type: application/json" \\`);
    console.log(`    -d '${JSON.stringify(fullPayload)}'`);
    console.log(`\nExpected result:`);
    console.log(`  {"success":true,"verified":true}`);
    console.log(`  s2s_verified field should be true in responses table`);

    return fullPayload;
}

// Test 4: Test invalid signature rejection
async function testInvalidSignature(response) {
    console.log('\n=== TEST: Invalid Signature Rejection ===');

    const { project, response: resp } = response;

    const params = {
        pid: project.project_code,
        cid: resp.clickid,
        type: 'complete'
    };

    // Use wrong signature
    const wrongSignature = '0000000000000000000000000000000000000000000000000000000000000000';
    const callbackUrl = `http://localhost:3000/api/callback?pid=${params.pid}&cid=${params.cid}&type=${params.type}&sig=${wrongSignature}`;

    console.log(`Callback URL with invalid sig: ${callbackUrl}`);
    console.log(`\nExpected result:`);
    console.log(`  {"success":false,"error":"Invalid signature"}`);
    console.log(`  HTTP 403 status`);
    console.log(`  Should log failure in s2s_logs table`);

    return callbackUrl;
}

// Test 5: Verify database state after callbacks
async function verifyDatabaseState(response) {
    console.log('\n=== VERIFICATION: Database State ===');

    const { database: db } = await getUnifiedDb();
    const { response: resp } = response;

    // Check response record
    const { data: updatedResponse } = await db
        .from('responses')
        .select('status, s2s_verified, s2s_verified_at, completion_time')
        .eq('id', resp.id)
        .maybeSingle();

    console.log(`Response record:`);
    console.log(`  ID: ${resp.id}`);
    console.log(`  Status: ${updatedResponse?.status}`);
    console.log(`  S2S Verified: ${updatedResponse?.s2s_verified}`);
    console.log(`  S2S Verified At: ${updatedResponse?.s2s_verified_at}`);
    console.log(`  Completion Time: ${updatedResponse?.completion_time}`);

    // Check s2s_logs
    const { data: s2sLogs } = await db
        .from('s2s_logs')
        .select('*')
        .eq('response_id', resp.id)
        .order('created_at', { ascending: false })
        .limit(5);

    console.log(`\nS2S Logs (last ${s2sLogs?.length || 0} entries):`);
    s2sLogs?.forEach((log, idx) => {
        console.log(`  ${idx + 1}. created_at: ${log.created_at}`);
        console.log(`     hash_match: ${log.hash_match}`);
        console.log(`     overall_result: ${log.overall_result}`);
        console.log(`     payload: ${log.payload?.substring(0, 100)}...`);
    });

    // Check callback_logs
    const { data: callbackLogs } = await db
        .from('callback_logs')
        .select('*')
        .eq('clickid', resp.clickid)
        .order('created_at', { ascending: false })
        .limit(5);

    console.log(`\nCallback Logs (last ${callbackLogs?.length || 0} entries):`);
    callbackLogs?.forEach((log, idx) => {
        console.log(`  ${idx + 1}. created_at: ${log.created_at}`);
        console.log(`     success: ${log.success}`);
        console.log(`     status_mapped: ${log.status_mapped}`);
        console.log(`     error_message: ${log.error_message || 'none'}`);
    });
}

// Cleanup test data
async function cleanupTestData(response) {
    console.log('\n=== CLEANUP: Removing test data ===');

    const { database: db } = await getUnifiedDb();
    const { response: resp } = response;

    // Delete the test response (will cascade to logs)
    await db.from('responses').delete().eq('id', resp.id);
    console.log(`✓ Deleted test response: ${resp.id}`);
}

// Main test runner
async function runTests() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║   HMAC S2S Verification Test Suite                    ║');
    console.log('╚════════════════════════════════════════════════════════╝');

    try {
        const testData = await setupTestData();
        await testCallbackWithHmac(testData);
        await testS2SCallbackWithHmac(testData);
        await testInvalidSignature(testData);
        await verifyDatabaseState(testData);

        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║   ✓ ALL TESTS COMPLETED                               ║');
        console.log('╚════════════════════════════════════════════════════════╝');
        console.log('\nNext steps:');
        console.log('  1. Manually invoke the callback URLs to test real flow');
        console.log('  2. Check database to verify state changes');
        console.log('  3. Verify audit logs are created');
        console.log('  4. Test with missing/invalid signatures to verify rejection');
        console.log('  5. Run full E2E test plan');

        // Ask if we should cleanup
        console.log('\nNOTE: Test data is still in the database.');
        console.log('Clean up with: node test-hmac-s2s.js --cleanup');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Cleanup mode
if (process.argv.includes('--cleanup')) {
    (async () => {
        try {
            const { database: db } = await getUnifiedDb();
            if (!db) throw new Error('Database not available');

            // Delete responses for test project
            const { count } = await db
                .from('responses')
                .delete()
                .eq('project_code', TEST_PROJECT_CODE);

            console.log(`✓ Cleaned up ${count} test responses for project ${TEST_PROJECT_CODE}`);
        } catch (error) {
            console.error('Cleanup failed:', error.message);
            process.exit(1);
        }
    })();
} else {
    runTests();
}
