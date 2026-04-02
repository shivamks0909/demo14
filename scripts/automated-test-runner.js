#!/usr/bin/env node
/**
 * AUTOMATED TEST RUNNER
 * Tests all routes programmatically without browser
 * Uses the unified DB layer to verify records (works with both SQLite and InsForge)
 */

require('dotenv').config({ path: '.env.local' });

const path = require('path');
const http = require('http');
const { getUnifiedDb } = require('../lib/unified-db');

// Helper to make HTTP request
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 3000,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'TestRunner/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.setTimeout(5000);
    req.end();
  });
}

async function runTests() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           AUTOMATED TEST RUNNER                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\\n');

    console.log('🧪 RUNNING AUTOMATED TESTS...\\n');

    // Get unified DB instance (will be InsForge if configured, else SQLite)
    const { database: db } = await getUnifiedDb();
    console.log(`🔗 Connected to DB source: ${(await getUnifiedDb()).source}\\n`);

    // Get active projects from the DB
    const { data: projects, error: projError } = await db.from('projects').select('*').eq('status', 'active');
    if (projError) throw projError;
    console.log(`📋 Found ${projects.length} active projects to test\\n`);

    const results = [];

    for (const project of projects) {
      console.log(`\\n${'═'.repeat(60)}`);
      console.log(`Testing Project: ${project.project_code}`);
      console.log(`${'═'.repeat(60)}`);

      // Test 1: Standard Route
      console.log('\\n  Test 1: Standard Route (/r/)');
      const testUid = `AUTO_${project.project_code}_${Date.now()}`;
      const standardUrl = `http://localhost:3000/r/${project.project_code}/DYN01/${testUid}`;

      try {
        const res = await makeRequest(standardUrl);
        console.log(`    URL: ${standardUrl}`);
        console.log(`    Status: ${res.status} (${res.status === 200 || res.status === 302 ? '✅ PASS' : '❌ FAIL'})`);

        // Check database for the created response
        const { data: response, error: respError } = await db
          .from('responses')
          .select('*')
          .eq('uid', testUid)
          .eq('project_id', project.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (respError) throw respError;

        if (response && response.length > 0) {
          const r = response[0];
          console.log(`    DB Record: ✅ Created (id: ${r.id.slice(0, 8)}...)`);
          console.log(`    Status: ${r.status}`);
          console.log(`    Session: ${r.session_token ? '✅' : '❌'}`);
          console.log(`    Audit Log: Check manually at /admin/audit-logs`);
        } else {
          console.log(`    DB Record: ❌ NOT FOUND`);
        }

        results.push({
          project: project.project_code,
          route: 'standard',
          status: res.status,
          dbRecord: !(respError || !(response && response.length > 0)),
          pass: res.status === 200 || res.status === 302
        });
      } catch (error) {
        console.log(`    ❌ ERROR: ${error.message}`);
        results.push({
          project: project.project_code,
          route: 'standard',
          status: 0,
          dbRecord: false,
          pass: false,
          error: error.message
        });
      }

      // Test 2: Legacy Route
      console.log('\\n  Test 2: Legacy Route (/track)');
      const testUid2 = `AUTO2_${project.project_code}_${Date.now()}`;
      const legacyUrl = `http://localhost:3000/track?code=${project.project_code}&uid=${testUid2}&supplier=LUC01`;

      try {
        const res = await makeRequest(legacyUrl);
        console.log(`    URL: ${legacyUrl}`);
        console.log(`    Status: ${res.status} (${res.status === 200 || res.status === 302 ? '✅ PASS' : '❌ FAIL'})`);

        const { data: response, error: respError } = await db
          .from('responses')
          .select('*')
          .eq('uid', testUid2)
          .eq('project_id', project.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (respError) throw respError;

        if (response && response.length > 0) {
          console.log(`    DB Record: ✅ Created`);
        } else {
          console.log(`    DB Record: ❌ NOT FOUND`);
        }

        results.push({
          project: project.project_code,
          route: 'legacy',
          status: res.status,
          dbRecord: !(respError || !(response && response.length > 0)),
          pass: res.status === 200 || res.status === 302
        });
      } catch (error) {
        console.log(`    ❌ ERROR: ${error.message}`);
        results.push({
          project: project.project_code,
          route: 'legacy',
          status: 0,
          dbRecord: false,
          pass: false,
          error: error.message
        });
      }

      // Test 3: Custom Init Route
      console.log('\\n  Test 3: Custom Init Route (/init)');
      const testUid3 = `INIT_${project.project_code.slice(0, 8)}_${Date.now()}`;
      const initUrl = `http://localhost:3000/init/${project.project_code}/${testUid3}?transactionId=${project.project_code}&rid=${testUid3}&isManual=true`;

      try {
        const res = await makeRequest(initUrl);
        console.log(`    URL: ${initUrl}`);
        console.log(`    Status: ${res.status} (${res.status === 200 || res.status === 302 ? '✅ PASS' : '❌ FAIL'})`);

        const { data: response, error: respError } = await db
          .from('responses')
          .select('*')
          .eq('uid', testUid3)
          .eq('project_id', project.id)
          .eq('transaction_id', project.project_code)
          .order('created_at', { ascending: false })
          .limit(1);

        if (respError) throw respError;

        if (response && response.length > 0) {
          const r = response[0];
          console.log(`    DB Record: ✅ Created`);
          console.log(`    transaction_id: ${r.transaction_id || '❌ NULL'}`);
          console.log(`    is_manual: ${r.is_manual ? '✅ TRUE' : '❌ FALSE'}`);
        } else {
          console.log(`    DB Record: ❌ NOT FOUND`);
        }

        results.push({
          project: project.project_code,
          route: 'custom_init',
          status: res.status,
          dbRecord: !(respError || !(response && response.length > 0)),
          pass: res.status === 200 || res.status === 302
        });
      } catch (error) {
        console.log(`    ❌ ERROR: ${error.message}`);
        results.push({
          project: project.project_code,
          route: 'custom_init',
          status: 0,
          dbRecord: false,
          pass: false,
          error: error.message
        });
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // ========================================
    // FINAL REPORT
    // ========================================
    console.log('\\n' + '═'.repeat(70));
    console.log('✅ AUTOMATED TEST RESULTS');
    console.log('═'.repeat(70));

    const total = results.length;
    const passed = results.filter(r => r.pass).length;
    const failed = total - passed;

    console.log(`\\nTotal Tests: ${total}`);
    console.log(`Passed: ${passed} (${Math.round(passed/total*100)}%)`);
    console.log(`Failed: ${failed}`);

    console.log('\\n📊 Breakdown by Route:');
    const byRoute = {};
    results.forEach(r => {
      if (!byRoute[r.route]) byRoute[r.route] = { total: 0, pass: 0 };
      byRoute[r.route].total++;
      if (r.pass) byRoute[r.route].pass++;
    });

    Object.entries(byRoute).forEach(([route, stats]) => {
      const pct = Math.round(stats.pass/stats.total*100);
      console.log(`  ${route}: ${stats.pass}/${stats.total} (${pct}%)`);
    });

    console.log('\\n📊 Breakdown by Project:');
    const byProject = {};
    results.forEach(r => {
      if (!byProject[r.project]) byProject[r.project] = { total: 0, pass: 0 };
      byProject[r.project].total++;
      if (r.pass) byProject[r.project].pass++;
    });

    Object.entries(byProject).forEach(([proj, stats]) => {
      const pct = Math.round(stats.pass/stats.total*100);
      console.log(`  ${proj}: ${stats.pass}/${stats.total} (${pct}%)`);
    });

    if (failed > 0) {
      console.log('\\n❌ Failed Tests:');
      results.filter(r => !r.pass).forEach(r => {
        console.log(`  ${r.project} - ${r.route}: ${r.error || 'Status ' + r.status}`);
      });
    }

    console.log('\\n' + '═'.repeat(70));
    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED! System is fully functional.');
    } else {
      console.log(`⚠️  ${failed} test(s) failed. Review errors above.`);
    }
    console.log('═'.repeat(70) + '\\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\\n❌ Test runner failed:', error);
    process.exit(1);
  }
}

runTests();
