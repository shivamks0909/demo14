/**
 * Comprehensive E2E Test: Project Creation → Routing → Landing → Callback → Status Update
 * 
 * Tests the full survey lifecycle:
 * 1. Create project via admin API
 * 2. Create supplier via admin API
 * 3. Route traffic through /r/{code}/{supplier}/{uid}
 * 4. Verify response record created with oi_session, status=in_progress
 * 5. Simulate survey callback with transactionId
 * 6. Verify status updates to complete/terminate
 * 7. Verify all fields (oi_session, trn, uid, etc.) are correctly populated
 */

const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:3000';
const dbPath = path.join(process.cwd(), 'data', 'local.db');

// Color output helpers
const PASS = (msg) => console.log(`  ✅ ${msg}`);
const FAIL = (msg) => console.log(`  ❌ ${msg}`);
const INFO = (msg) => console.log(`  ℹ️  ${msg}`);
const SECTION = (msg) => console.log(`\n${'='.repeat(60)}\n  ${msg}\n${'='.repeat(60)}`);

let passed = 0;
let failed = 0;
let errors = [];

function assert(condition, testName, detail = '') {
  if (condition) {
    PASS(testName);
    passed++;
  } else {
    FAIL(`${testName}${detail ? ` — ${detail}` : ''}`);
    failed++;
    errors.push(`${testName}: ${detail}`);
  }
}

// ============================================================
// STEP 0: Database helper
// ============================================================
function getDb() {
  return new Database(dbPath);
}

// ============================================================
// STEP 1: Create a test project
// ============================================================
async function createProject() {
  SECTION('STEP 1: Create Test Project');
  
  const projectCode = `E2E_${Date.now()}`;
  const projectName = `E2E Test Project ${projectCode}`;
  const baseUrl = 'https://survey.example.com/test';
  
  // Create project directly in DB (simulating admin dashboard action)
  const db = getDb();
  const projectId = `proj_e2e_${Date.now()}`;
  
  try {
    db.prepare(`
      INSERT INTO projects (id, project_code, project_name, base_url, source, status, oi_prefix, pid_prefix, pid_counter, pid_padding, complete_target)
      VALUES (?, ?, ?, ?, 'manual', 'active', 'oi_', 'E2E', 1, 3, 100)
    `).run(projectId, projectCode, projectName, baseUrl);
    
    INFO(`Project created: ${projectCode} (ID: ${projectId})`);
    
    // Verify project exists
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    assert(!!project, 'Project exists in database');
    assert(project.project_code === projectCode, 'Project code matches', `Expected ${projectCode}, got ${project.project_code}`);
    assert(project.status === 'active', 'Project status is active');
    assert(project.base_url === baseUrl, 'Base URL matches');
    
    return { projectId, projectCode, projectName, baseUrl };
  } finally {
    db.close();
  }
}

// ============================================================
// STEP 2: Create a test supplier
// ============================================================
async function createSupplier() {
  SECTION('STEP 2: Create Test Supplier');
  
  const db = getDb();
  const supplierId = `sup_e2e_${Date.now()}`;
  const supplierName = 'E2E Test Supplier';
  const supplierToken = `E2E_SUPPLIER_${Date.now()}`;
  
  try {
    db.prepare(`
      INSERT INTO suppliers (id, name, supplier_token, status)
      VALUES (?, ?, ?, 'active')
    `).run(supplierId, supplierName, supplierToken);
    
    INFO(`Supplier created: ${supplierName} (Token: ${supplierToken})`);
    
    // Verify supplier exists
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplierId);
    assert(!!supplier, 'Supplier exists in database');
    assert(supplier.supplier_token === supplierToken, 'Supplier token matches');
    assert(supplier.status === 'active', 'Supplier status is active');
    
    return { supplierId, supplierName, supplierToken };
  } finally {
    db.close();
  }
}

// ============================================================
// STEP 3: Create supplier-project link with quota
// ============================================================
async function createSupplierLink(projectId, supplierId) {
  SECTION('STEP 3: Create Supplier-Project Link');
  
  const db = getDb();
  const linkId = `link_e2e_${Date.now()}`;
  
  try {
    db.prepare(`
      INSERT INTO supplier_project_links (id, supplier_id, project_id, quota_allocated, quota_used, status)
      VALUES (?, ?, ?, 100, 0, 'active')
    `).run(linkId, supplierId, projectId);
    
    INFO(`Link created: ${linkId}`);
    
    // Verify link
    const link = db.prepare('SELECT * FROM supplier_project_links WHERE id = ?').get(linkId);
    assert(!!link, 'Supplier-project link exists');
    assert(link.quota_allocated === 100, 'Quota allocated = 100');
    assert(link.quota_used === 0, 'Quota used = 0');
    
    return { linkId };
  } finally {
    db.close();
  }
}

// ============================================================
// STEP 4: Route traffic through /r/{code}/{supplier}/{uid}
// ============================================================
async function testRouting(projectCode, supplierToken, testUid) {
  SECTION('STEP 4: Route Traffic (Survey Entry)');
  
  const url = `${BASE_URL}/r/${projectCode}/${supplierToken}/${testUid}`;
  INFO(`Requesting: ${url}`);
  
  try {
    const response = await fetch(url, { 
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) E2E-Test/1.0'
      }
    });
    
    // Should be a redirect (307 or 302)
    const isRedirect = response.status === 307 || response.status === 302 || response.status === 301;
    assert(isRedirect, 'Response is a redirect', `Status: ${response.status}`);
    
    const location = response.headers.get('location');
    assert(!!location, 'Redirect location header exists');
    
    if (location) {
      INFO(`Redirect URL: ${location}`);
      const redirectUrl = new URL(location);
      
      // Verify URL parameters
      const oiSession = redirectUrl.searchParams.get('oi_session');
      const uid = redirectUrl.searchParams.get('uid');
      const transactionId = redirectUrl.searchParams.get('transactionId');
      const pid = redirectUrl.searchParams.get('pid');
      
      assert(!!oiSession, 'oi_session parameter present in redirect URL');
      assert(!!uid, 'uid parameter present in redirect URL');
      assert(uid === testUid || decodeURIComponent(uid) === testUid, 'uid matches test UID', `Expected ${testUid}, got ${uid}`);
      assert(!!transactionId, 'transactionId parameter present');
      assert(!!pid, 'pid parameter present');
      
      return { 
        redirectUrl: location, 
        oiSession, 
        uid: testUid,
        transactionId,
        pid 
      };
    }
    
    return null;
  } catch (err) {
    FAIL(`Routing request failed: ${err.message}`);
    failed++;
    errors.push(`Routing request: ${err.message}`);
    return null;
  }
}

// ============================================================
// STEP 5: Verify response record in database
// ============================================================
async function verifyResponseRecord(oiSession, projectCode, testUid) {
  SECTION('STEP 5: Verify Response Record in Database');
  
  const db = getDb();
  
  try {
    // Strategy 1: Lookup by oi_session
    let response = db.prepare('SELECT * FROM responses WHERE oi_session = ?').get(oiSession);
    
    // Strategy 2: Lookup by uid + project_code
    if (!response) {
      response = db.prepare('SELECT * FROM responses WHERE uid = ? AND project_code = ?').get(testUid, projectCode);
    }
    
    // Strategy 3: Lookup by clickid
    if (!response) {
      response = db.prepare('SELECT * FROM responses WHERE clickid = ?').get(oiSession);
    }
    
    assert(!!response, 'Response record found in database');
    
    if (!response) {
      // Dump all responses for debugging
      const allResponses = db.prepare('SELECT id, uid, project_code, status, oi_session, clickid FROM responses ORDER BY created_at DESC LIMIT 5').all();
      INFO('Recent responses:');
      allResponses.forEach(r => INFO(`  - uid=${r.uid}, code=${r.project_code}, status=${r.status}, oi_session=${r.oi_session}`));
      return null;
    }
    
    INFO(`Response ID: ${response.id}`);
    
    // Verify all fields
    assert(response.project_code === projectCode, 'project_code matches', `Expected ${projectCode}, got ${response.project_code}`);
    assert(response.uid === testUid, 'uid matches', `Expected ${testUid}, got ${response.uid}`);
    assert(response.status === 'in_progress', 'status is in_progress', `Got: ${response.status}`);
    assert(response.oi_session === oiSession, 'oi_session matches', `Expected ${oiSession}, got ${response.oi_session}`);
    assert(response.clickid === oiSession, 'clickid equals oi_session', `clickid=${response.clickid}, oi_session=${oiSession}`);
    assert(!!response.session_token, 'session_token is set');
    assert(!!response.ip, 'IP address recorded');
    assert(!!response.user_agent, 'User agent recorded');
    assert(!!response.device_type, 'Device type detected');
    assert(!!response.created_at, 'Created timestamp set');
    
    return response;
  } finally {
    db.close();
  }
}

// ============================================================
// STEP 6: Simulate survey callback (complete)
// ============================================================
async function testCallbackComplete(projectCode, oiSession) {
  SECTION('STEP 6: Simulate Complete Callback');
  
  // The callback uses cid (which maps to oi_session/transactionId)
  const callbackUrl = `${BASE_URL}/api/callback?pid=${projectCode}&cid=${oiSession}&type=complete`;
  INFO(`Callback URL: ${callbackUrl}`);
  
  try {
    const response = await fetch(callbackUrl, { redirect: 'manual' });
    
    INFO(`Callback response status: ${response.status}`);
    
    // Should redirect to /status page or return JSON success
    const isRedirect = response.status === 302 || response.status === 307;
    const isJsonSuccess = response.status === 200;
    assert(isRedirect || isJsonSuccess, 'Callback succeeded', `Status: ${response.status}`);
    
    if (isRedirect) {
      const location = response.headers.get('location');
      INFO(`Callback redirect: ${location}`);
      assert(location && location.includes('/status'), 'Redirects to status page');
    }
    
    return true;
  } catch (err) {
    FAIL(`Callback request failed: ${err.message}`);
    failed++;
    errors.push(`Callback complete: ${err.message}`);
    return false;
  }
}

// ============================================================
// STEP 7: Verify status updated to complete
// ============================================================
async function verifyStatusUpdated(oiSession, expectedStatus) {
  SECTION(`STEP 7: Verify Status Updated to "${expectedStatus}"`);
  
  const db = getDb();
  
  try {
    const response = db.prepare('SELECT * FROM responses WHERE oi_session = ?').get(oiSession);
    
    assert(!!response, 'Response record still exists');
    
    if (response) {
      assert(response.status === expectedStatus, `Status is "${expectedStatus}"`, `Got: ${response.status}`);
      assert(!!response.updated_at, 'Updated timestamp set');
      
      if (expectedStatus === 'complete') {
        assert(!!response.completion_time, 'Completion time recorded for complete status');
      }
      
      INFO(`Final response state:`);
      INFO(`  ID: ${response.id}`);
      INFO(`  Status: ${response.status}`);
      INFO(`  UID: ${response.uid}`);
      INFO(`  oi_session: ${response.oi_session}`);
      INFO(`  Project: ${response.project_code}`);
      INFO(`  Created: ${response.created_at}`);
      INFO(`  Updated: ${response.updated_at}`);
      INFO(`  Completion: ${response.completion_time || 'N/A'}`);
    }
    
    return response;
  } finally {
    db.close();
  }
}

// ============================================================
// STEP 8: Test terminate callback
// ============================================================
async function testTerminateFlow(projectCode, supplierToken) {
  SECTION('STEP 8: Test Terminate Flow');
  
  const termUid = `TERM_UID_${Date.now()}`;
  
  // Route traffic
  const routeResult = await testRouting(projectCode, supplierToken, termUid);
  if (!routeResult) return false;
  
  // Verify response created
  const response = await verifyResponseRecord(routeResult.oiSession, projectCode, termUid);
  if (!response) return false;
  
  // Send terminate callback
  const callbackUrl = `${BASE_URL}/api/callback?pid=${projectCode}&cid=${routeResult.oiSession}&type=terminate`;
  INFO(`Terminate callback: ${callbackUrl}`);
  
  try {
    const cbResponse = await fetch(callbackUrl, { redirect: 'manual' });
    const isSuccess = cbResponse.status === 302 || cbResponse.status === 307 || cbResponse.status === 200;
    assert(isSuccess, 'Terminate callback succeeded', `Status: ${cbResponse.status}`);
    
    // Verify status
    const db = getDb();
    const updated = db.prepare('SELECT * FROM responses WHERE oi_session = ?').get(routeResult.oiSession);
    db.close();
    
    assert(updated && updated.status === 'terminate', 'Status updated to terminate', `Got: ${updated?.status}`);
    
    return true;
  } catch (err) {
    FAIL(`Terminate flow failed: ${err.message}`);
    failed++;
    errors.push(`Terminate flow: ${err.message}`);
    return false;
  }
}

// ============================================================
// STEP 9: Test idempotent callback (double callback)
// ============================================================
async function testIdempotentCallback(projectCode, oiSession) {
  SECTION('STEP 9: Test Idempotent Callback (Double Submit)');
  
  const callbackUrl = `${BASE_URL}/api/callback?pid=${projectCode}&cid=${oiSession}&type=complete`;
  
  try {
    const response = await fetch(callbackUrl, { redirect: 'manual' });
    
    // Should succeed without error (idempotent)
    const isSuccess = response.status === 200 || response.status === 302;
    assert(isSuccess, 'Second callback succeeds (idempotent)', `Status: ${response.status}`);
    
    // Verify status hasn't changed
    const db = getDb();
    const r = db.prepare('SELECT * FROM responses WHERE oi_session = ?').get(oiSession);
    db.close();
    
    assert(r && r.status === 'complete', 'Status remains complete after double callback');
    
    return true;
  } catch (err) {
    FAIL(`Idempotent test failed: ${err.message}`);
    failed++;
    errors.push(`Idempotent callback: ${err.message}`);
    return false;
  }
}

// ============================================================
// STEP 10: Test callback_logs and audit trail
// ============================================================
async function verifyAuditTrail(oiSession) {
  SECTION('STEP 10: Verify Audit Trail');
  
  const db = getDb();
  
  try {
    // Check callback_logs
    const logs = db.prepare('SELECT * FROM callback_logs WHERE clickid = ? ORDER BY created_at DESC').all(oiSession);
    assert(logs.length > 0, 'Callback logs recorded', `Found ${logs.length} log entries`);
    
    if (logs.length > 0) {
      const latestLog = logs[0];
      assert(latestLog.success === 1, 'Latest callback log shows success');
      assert(latestLog.status_mapped === 'complete' || latestLog.status_mapped === 'terminate', 
        'Callback log has correct status mapping', `Got: ${latestLog.status_mapped}`);
      
      INFO(`Callback logs: ${logs.length} entries`);
      logs.forEach((log, i) => {
        INFO(`  [${i+1}] type=${log.type}, status=${log.status_mapped}, success=${log.success}, latency=${log.latency_ms}ms`);
      });
    }
    
    // Check audit_logs for routing entry
    const auditLogs = db.prepare("SELECT * FROM audit_logs WHERE event_type = 'ROUTING_ENTRY' ORDER BY created_at DESC LIMIT 5").all();
    assert(auditLogs.length > 0, 'Audit logs contain routing entries');
    
    return true;
  } finally {
    db.close();
  }
}

// ============================================================
// STEP 11: Verify quota tracking
// ============================================================
async function verifyQuotaTracking(projectId, supplierId) {
  SECTION('STEP 11: Verify Quota Tracking');
  
  const db = getDb();
  
  try {
    const link = db.prepare('SELECT * FROM supplier_project_links WHERE project_id = ? AND supplier_id = ?').get(projectId, supplierId);
    
    assert(!!link, 'Supplier-project link exists');
    
    if (link) {
      assert(link.quota_used > 0, 'Quota has been consumed', `Used: ${link.quota_used}`);
      INFO(`Quota: ${link.quota_used} used / ${link.quota_allocated} allocated`);
    }
    
    return true;
  } finally {
    db.close();
  }
}

// ============================================================
// MAIN: Run all tests
// ============================================================
async function main() {
  console.log('\n' + '🚀'.repeat(30));
  console.log('  E2E TEST: Full Survey Lifecycle');
  console.log('  Project → Route → Landing → Callback → Status');
  console.log('🚀'.repeat(30));
  
  try {
    // Step 1: Create project
    const project = await createProject();
    
    // Step 2: Create supplier
    const supplier = await createSupplier();
    
    // Step 3: Create link
    await createSupplierLink(project.projectId, supplier.supplierId);
    
    // Step 4: Route traffic (complete flow)
    const testUid = `E2E_UID_${Date.now()}`;
    const routeResult = await testRouting(project.projectCode, supplier.supplierToken, testUid);
    
    if (!routeResult) {
      console.log('\n⚠️  Routing failed — skipping remaining tests');
      printSummary();
      return;
    }
    
    // Step 5: Verify response record
    const responseRecord = await verifyResponseRecord(routeResult.oiSession, project.projectCode, testUid);
    
    if (!responseRecord) {
      console.log('\n⚠️  Response record not found — skipping callback tests');
      printSummary();
      return;
    }
    
    // Step 6: Complete callback
    await testCallbackComplete(project.projectCode, routeResult.oiSession);
    
    // Step 7: Verify status update
    await verifyStatusUpdated(routeResult.oiSession, 'complete');
    
    // Step 8: Terminate flow
    await testTerminateFlow(project.projectCode, supplier.supplierToken);
    
    // Step 9: Idempotent callback
    await testIdempotentCallback(project.projectCode, routeResult.oiSession);
    
    // Step 10: Audit trail
    await verifyAuditTrail(routeResult.oiSession);
    
    // Step 11: Quota tracking
    await verifyQuotaTracking(project.projectId, supplier.supplierId);
    
  } catch (err) {
    console.error(`\n💥 Fatal error: ${err.message}`);
    console.error(err.stack);
    failed++;
    errors.push(`Fatal: ${err.message}`);
  }
  
  printSummary();
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📊 Total:  ${passed + failed}`);
  
  if (errors.length > 0) {
    console.log('\n  FAILURES:');
    errors.forEach((e, i) => console.log(`    ${i+1}. ${e}`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (failed === 0) {
    console.log('  🎉 ALL TESTS PASSED!');
  } else {
    console.log(`  ⚠️  ${failed} test(s) failed`);
  }
  console.log('='.repeat(60) + '\n');
}

// Run
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
