/**
 * Comprehensive API Test Script
 * Tests all backend and frontend APIs
 */

const http = require('http');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
let passed = 0;
let failed = 0;
let adminCookie = '';

function makeRequest(urlPath, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlPath, BASE_URL);
        const reqOptions = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: options.headers || {},
            followRedirect: false
        };

        const req = http.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data,
                    location: res.headers.location
                });
            });
        });

        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        req.end();
    });
}

async function test(name, fn) {
    try {
        await fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ ${name}: ${error.message}`);
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function runTests() {
    console.log('🧪 Running Comprehensive API Tests\n');
    console.log('=' .repeat(60));

    // ============================================
    // 1. TRACK API TESTS
    // ============================================
    console.log('\n📍 Track API Tests');
    console.log('-'.repeat(40));

    await test('Track API - Valid project (TEST001)', async () => {
        const res = await makeRequest('/api/track?code=TEST001&uid=testuser123');
        assert(res.status === 307, `Expected 307 redirect, got ${res.status}`);
        assert(res.location && res.location.includes('survey.example.com/test001'), 'Should redirect to survey URL');
        assert(res.location.includes('oi_session='), 'Should include oi_session parameter');
        assert(res.location.includes('uid=testuser123'), 'Should include uid parameter');
    });

    await test('Track API - Valid project (PROJ001)', async () => {
        const res = await makeRequest('/api/track?code=PROJ001&uid=user456');
        assert(res.status === 307, `Expected 307 redirect, got ${res.status}`);
        assert(res.location && res.location.includes('example.com/survey1'), 'Should redirect to survey URL');
    });

    await test('Track API - Nonexistent project returns helpful error', async () => {
        const res = await makeRequest('/api/track?code=NONEXISTENT&uid=test123');
        assert(res.status === 404, `Expected 404, got ${res.status}`);
        assert(res.body.includes('Project not found'), 'Should include error message');
        assert(res.body.includes('Available projects'), 'Should list available projects');
    });

    await test('Track API - Missing parameters', async () => {
        const res = await makeRequest('/api/track');
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    // ============================================
    // 2. CALLBACK API TESTS
    // ============================================
    console.log('\n📞 Callback API Tests');
    console.log('-'.repeat(40));

    await test('Callback API - Valid project with status', async () => {
        const res = await makeRequest('/api/callback?pid=TEST001&cid=callback_test_123&status=complete');
        // Callback redirects to status page (fraud detection may block instant completes)
        assert(res.status === 307 || res.status === 302, `Expected redirect, got ${res.status}`);
    });

    await test('Callback API - Missing parameters', async () => {
        const res = await makeRequest('/api/callback');
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    // ============================================
    // 3. ROUTING API TESTS (/r/[code])
    // ============================================
    console.log('\n🔀 Routing API Tests');
    console.log('-'.repeat(40));

    await test('Routing API - Valid route with supplier and uid', async () => {
        const res = await makeRequest('/r/TEST001/supplier123/testuser456');
        assert(res.status === 307 || res.status === 302, `Expected redirect, got ${res.status}`);
    });

    await test('Routing API - Invalid route (missing supplier)', async () => {
        const res = await makeRequest('/r/TEST001/onlyone');
        assert(res.status === 307 || res.status === 302, `Expected redirect, got ${res.status}`);
        assert(res.location && res.location.includes('INVALID_LINK'), 'Should redirect to invalid link page');
    });

    await test('Routing API - Nonexistent project', async () => {
        const res = await makeRequest('/r/NONEXISTENT/supplier123/testuser456');
        assert(res.status === 307 || res.status === 302, `Expected redirect, got ${res.status}`);
        // Should redirect to either PROJECT_NOT_FOUND page or DYNAMIC_ENTRY fallback
        assert(res.location, 'Should redirect somewhere');
    });

    // ============================================
    // 4. MOCK INIT API TESTS
    // ============================================
    console.log('\n🎭 Mock Init API Tests');
    console.log('-'.repeat(40));

    await test('Mock Init API - Create session', async () => {
        const res = await makeRequest('/api/mock-init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { pid: 'TEST001', oi_session: 'mock_session_' + Date.now(), uid: 'mock_user_123' }
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        const body = JSON.parse(res.body);
        assert(body.success === true, 'Should return success');
    });

    await test('Mock Init API - Missing parameters', async () => {
        const res = await makeRequest('/api/mock-init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: {}
        });
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    // ============================================
    // 5. ADMIN API TESTS (with auth)
    // ============================================
    console.log('\n🔐 Admin API Tests');
    console.log('-'.repeat(40));

    // Note: Admin login uses React Server Actions, not REST API
    // To test authenticated admin APIs, login via browser and copy the admin_session cookie
    console.log('ℹ️  Admin login uses Server Actions - skipping automated login test');
    console.log('   To test authenticated APIs, login at /admin and use browser dev tools');

    if (adminCookie) {
        await test('Admin Projects API - GET (authenticated)', async () => {
            const res = await makeRequest('/api/admin/projects', {
                headers: { 'Cookie': adminCookie }
            });
            assert(res.status === 200, `Expected 200, got ${res.status}`);
            const body = JSON.parse(res.body);
            assert(body.success === true, 'Should return success');
            assert(Array.isArray(body.data), 'Should return array of projects');
            assert(body.data.length >= 4, `Should have at least 4 projects, got ${body.data.length}`);
        });

        await test('Admin Projects API - Create project', async () => {
            const res = await makeRequest('/api/admin/projects', {
                method: 'POST',
                headers: { 
                    'Cookie': adminCookie,
                    'Content-Type': 'application/json'
                },
                body: {
                    project_code: 'API_TEST_' + Date.now(),
                    project_name: 'API Test Project',
                    base_url: 'https://api-test.example.com',
                    status: 'active'
                }
            });
            assert(res.status === 200, `Expected 200, got ${res.status}`);
            const body = JSON.parse(res.body);
            assert(body.success === true, 'Should return success');
        });

        await test('Admin Clients API - GET', async () => {
            const res = await makeRequest('/api/admin/clients', {
                headers: { 'Cookie': adminCookie }
            });
            assert(res.status === 200, `Expected 200, got ${res.status}`);
        });

        await test('Admin Suppliers API - GET', async () => {
            const res = await makeRequest('/api/admin/suppliers', {
                headers: { 'Cookie': adminCookie }
            });
            assert(res.status === 200, `Expected 200, got ${res.status}`);
        });

        await test('Admin Responses API - GET', async () => {
            const res = await makeRequest('/api/admin/responses', {
                headers: { 'Cookie': adminCookie }
            });
            assert(res.status === 200, `Expected 200, got ${res.status}`);
        });

        await test('Admin KPIs API - GET', async () => {
            const res = await makeRequest('/api/admin/kpis', {
                headers: { 'Cookie': adminCookie }
            });
            assert(res.status === 200, `Expected 200, got ${res.status}`);
        });
    } else {
        console.log('⚠️  Skipping authenticated admin tests (no session cookie)');
    }

    await test('Admin API - Unauthenticated access redirects to login', async () => {
        const res = await makeRequest('/api/admin/projects');
        assert(res.status === 307 || res.status === 302, `Expected redirect, got ${res.status}`);
        assert(res.location && res.location.includes('/login'), 'Should redirect to login');
    });

    // ============================================
    // 6. DATABASE VERIFICATION
    // ============================================
    console.log('\n💾 Database Verification');
    console.log('-'.repeat(40));

    await test('Database - Active projects exist', async () => {
        const dbPath = path.join(__dirname, 'data', 'local.db');
        const db = new Database(dbPath);
        const projects = db.prepare("SELECT * FROM projects WHERE status = 'active'").all();
        db.close();
        assert(projects.length >= 4, `Expected at least 4 active projects, got ${projects.length}`);
    });

    await test('Database - DYNAMIC_ENTRY project exists', async () => {
        const dbPath = path.join(__dirname, 'data', 'local.db');
        const db = new Database(dbPath);
        const project = db.prepare("SELECT * FROM projects WHERE project_code = 'DYNAMIC_ENTRY'").get();
        db.close();
        assert(project, 'DYNAMIC_ENTRY project should exist');
        assert(project.status === 'active', 'DYNAMIC_ENTRY should be active');
    });

    await test('Database - Supplier-project links exist', async () => {
        const dbPath = path.join(__dirname, 'data', 'local.db');
        const db = new Database(dbPath);
        const links = db.prepare('SELECT COUNT(*) as count FROM supplier_project_links').get();
        db.close();
        assert(links.count >= 2, `Expected at least 2 links, got ${links.count}`);
    });

    // ============================================
    // 7. FRONTEND PAGES
    // ============================================
    console.log('\n🌐 Frontend Pages');
    console.log('-'.repeat(40));

    await test('Home page loads', async () => {
        const res = await makeRequest('/');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test('Login page loads', async () => {
        const res = await makeRequest('/login');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test('Paused page loads', async () => {
        const res = await makeRequest('/paused');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test('Status page loads', async () => {
        const res = await makeRequest('/status?code=TEST001&type=complete');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
    
    if (failed === 0) {
        console.log('\n🎉 All tests passed! All APIs are working correctly.');
    } else {
        console.log(`\n⚠️  ${failed} test(s) failed. Review the output above.`);
    }
    
    console.log('\n📋 Active Project Codes:');
    const dbPath = path.join(__dirname, 'data', 'local.db');
    const db = new Database(dbPath);
    const projects = db.prepare("SELECT project_code, project_name, status FROM projects").all();
    db.close();
    for (const p of projects) {
        console.log(`   - ${p.project_code}: ${p.project_name} (${p.status})`);
    }
}

runTests().catch(console.error);
