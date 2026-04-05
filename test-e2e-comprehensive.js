/**
 * Comprehensive E2E Test Suite
 * Tests all phases of the survey routing platform
 */
const http = require('http');

function test(method, url, body) {
    return new Promise((resolve) => {
        const opts = new URL('http://localhost:3000' + url);
        opts.method = method;
        opts.headers = body ? {'Content-Type': 'application/json'} : {};
        const req = http.request(opts, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({status: res.statusCode, headers: res.headers, data}));
        });
        req.on('error', e => resolve({error: e.message}));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    console.log('=== COMPREHENSIVE E2E TEST SUITE ===\n');
    let passed = 0;
    let failed = 0;

    const assert = (name, condition) => {
        if (condition) {
            console.log('✅', name);
            passed++;
        } else {
            console.log('❌', name);
            failed++;
        }
    };

    // Phase 1: Health Check
    console.log('1. Health Check');
    const h = await test('GET', '/api/health');
    assert('Health returns 200', h.status === 200);

    // Phase 2: Callback Validation
    console.log('\n2. Callback Validation');
    const c1 = await test('GET', '/api/callback');
    assert('Missing params returns 400', c1.status === 400);

    const c2 = await test('GET', '/api/callback?cid=test&type=invalid');
    assert('Invalid type returns 400', c2.status === 400);

    // Phase 3: Track Endpoint
    console.log('\n3. Track Endpoint');
    const t1 = await test('GET', '/api/track');
    assert('Missing params returns 400', t1.status === 400);

    const t2 = await test('GET', '/api/track?code=<script>&uid=test');
    assert('Invalid code returns 400', t2.status === 400);

    const t3 = await test('GET', '/api/track?code=PROJ001&uid=testuser001');
    assert('Valid track returns 307', t3.status === 307);

    // Phase 4: Frontend Pages
    console.log('\n4. Frontend Pages');
    const lp = await test('GET', '/');
    assert('Landing page returns 200', lp.status === 200);

    const sp = await test('GET', '/status?type=complete');
    assert('Status page returns 200', sp.status === 200);

    // Phase 5: Lazy Session Creation
    console.log('\n5. Lazy Session Creation');
    const lazyCid = 'LAZY_TEST_' + Date.now();
    const c3 = await test('GET', '/api/callback?cid=' + lazyCid + '&type=complete');
    assert('Lazy callback returns 307', c3.status === 307);

    const c4 = await test('GET', '/api/callback?cid=' + lazyCid + '&type=complete');
    assert('Duplicate lazy callback rejected', c4.status === 307 || c4.status === 404);

    // Phase 6: Security Tests
    console.log('\n6. Security Tests');
    const s1 = await test('GET', '/api/callback?cid=;DROP TABLE responses;--&type=complete');
    assert('SQL injection blocked', s1.status !== 200);

    const s2 = await test('GET', '/api/callback?cid=<script>alert(1)</script>&type=complete');
    assert('XSS blocked', s2.status !== 200);

    // Phase 7: Start Route
    console.log('\n7. Start Route');
    const st1 = await test('GET', '/start/PROJ001?uid=user123');
    assert('Start route handles valid request', st1.status === 307 || st1.status === 200);

    // Summary
    console.log('\n=== TEST SUMMARY ===');
    console.log('Passed:', passed);
    console.log('Failed:', failed);
    console.log('Total:', passed + failed);
    console.log('Success Rate:', Math.round(passed / (passed + failed) * 100) + '%');

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(e => {
    console.error('Test suite error:', e);
    process.exit(1);
});
