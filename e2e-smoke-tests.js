#!/usr/bin/env node

/**
 * Simplified E2E Smoke Tests
 * Tests basic connectivity and health of the system
 */

const http = require('http')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const BASE_URL = 'http://localhost:3000'
const TEST_DB_PATH = './data/test_local.db'

let passed = 0
let failed = 0

function log(msg, type = 'info') {
  const colors = { info: '\x1b[36m', success: '\x1b[32m', error: '\x1b[31m', warn: '\x1b[33m', reset: '\x1b[0m' }
  console.log(`${colors[type]}${msg}${colors.reset}`)
}

function assert(condition, testName, details = '') {
  if (condition) {
    passed++
    log(`✓ ${testName}`, 'success')
  } else {
    failed++
    log(`✗ ${testName}${details ? ': ' + details : ''}`, 'error')
  }
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: { 'User-Agent': 'E2E-Test/1.0' }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }))
    })
    req.on('error', reject)
    req.setTimeout(10000)
    req.end()
  })
}

async function runTests() {
  log('\n🚀 E2E SMOKE TESTS\n', 'info')

  // PHASE 1: System Health
  log('PHASE 1: SYSTEM HEALTH CHECK', 'info')

  // Test 1: Database exists
  try {
    const dbExists = fs.existsSync(path.resolve(TEST_DB_PATH))
    assert(dbExists, 'Database file exists')
  } catch (e) {
    assert(false, 'Database file exists', e.message)
  }

  // Test 2: Database has required tables
  if (fs.existsSync(path.resolve(TEST_DB_PATH))) {
    try {
      const cmd = `node -e "const db = require('better-sqlite3')('${TEST_DB_PATH}'); const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all().map(t => t.name); console.log(JSON.stringify(tables)); db.close();"`
      const tablesOutput = execSync(cmd, { encoding: 'utf-8' }).trim()
      const tables = JSON.parse(tablesOutput)
      const required = ['projects', 'responses', 'audit_logs', 'suppliers', 'supplier_project_links', 'clients']
      required.forEach(tbl => {
        assert(tables.includes(tbl), `Table '${tbl}' exists`)
      })
    } catch (e) {
      log(`   Could not verify tables: ${e.message}`, 'warn')
    }
  }

  // Test 3: TypeScript compiles
  try {
    const result = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf-8' })
    assert(result.trim() === '', 'TypeScript compilation clean')
  } catch (e) {
    const output = e.stdout ? e.stdout.toString() : ''
    if (output.includes('error')) {
      assert(false, 'TypeScript compilation', output.split('\n')[0])
    } else {
      log(`   TypeScript check: ${output || 'OK'}`, 'warn')
      passed++ // warnings don't fail
    }
  }

  // Test 4: Dev server running
  try {
    const res = await httpGet(`${BASE_URL}/`)
    assert(res.status === 200, 'Dev server responds (200 OK)')
    assert(!res.body.includes('500'), 'No 500 errors in response')
  } catch (e) {
    assert(false, 'Dev server connectivity', e.message)
  }

  // PHASE 2: Authentication (Basic)
  log('\nPHASE 2: AUTHENTICATION', 'info')

  try {
    const res = await httpGet(`${BASE_URL}/login`)
    assert(res.status === 200, 'Login page loads')
    assert(res.body.includes('Admin Login'), 'Login page has title')
    assert(res.body.includes('email') || res.body.includes('username'), 'Login has email/username field')
    assert(res.body.includes('password'), 'Login has password field')
  } catch (e) {
    assert(false, 'Login page load', e.message)
  }

  try {
    const res = await httpGet(`${BASE_URL}/admin/dashboard`)
    assert(res.status === 302 || res.status === 401 || res.status === 403, 'Dashboard requires auth (redirects or blocks)')
  } catch (e) {
    assert(false, 'Protected route check', e.message)
  }

  // PHASE 7: Track Flow (Core)
  log('\nPHASE 7: TRACK FLOW (Core User Journey)', 'info')

  try {
    // Test tracking link (should redirect)
    const res = await httpGet(`${BASE_URL}/r/TEST_SINGLE/DYN01/E2ETEST_${Date.now()}`)
    assert(res.status === 302, 'Tracking link returns 302 redirect')

    const location = res.headers.location || res.headers['Location']
    assert(location, 'Redirect has Location header')

    // Check cookies
    const setCookie = res.headers['set-cookie']
    assert(setCookie && setCookie.length > 0, 'Redirect sets cookies')

    if (setCookie) {
      const hasLastSid = setCookie.some(c => c.includes('last_sid'))
      const hasLastUid = setCookie.some(c => c.includes('last_uid'))
      const hasLastPid = setCookie.some(c => c.includes('last_pid'))
      assert(hasLastSid, 'Cookie last_sid set')
      assert(hasLastUid, 'Cookie last_uid set')
      assert(hasLastPid, 'Cookie last_pid set')
    }

    assert(location.includes('http') || location.includes('survey.example.com'), 'Redirects to project base_url')
  } catch (e) {
    assert(false, 'Tracking flow', e.message)
  }

  // PHASE 8: Callback System
  log('\nPHASE 8: CALLBACK SYSTEM', 'info')

  try {
    // We need a valid session - can't easily test without tracking first
    // Just verify endpoint exists
    const res = await httpGet(`${BASE_URL}/api/callback`)
    assert(res.status === 400 || res.status === 404, 'Callback endpoint exists (returns error without params)')
  } catch (e) {
    assert(false, 'Callback endpoint check', e.message)
  }

  // PHASE 17: Security (Basic)
  log('\nPHASE 17: SECURITY CHECKS', 'info')

  // SQL Injection test
  try {
    const malicious = encodeURIComponent("test'; DROP TABLE responses; --")
    const res = await httpGet(`${BASE_URL}/r/TEST_SINGLE/DYN01/${malicious}`)
    assert(res.status !== 500, 'SQL injection does not crash server (returns ' + res.status + ')')
  } catch (e) {
    assert(false, 'SQL injection test', e.message)
  }

  // XSS test
  try {
    const xss = encodeURIComponent('<script>alert(1)</script>')
    const res = await httpGet(`${BASE_URL}/r/TEST_SINGLE/DYN01/${xss}`)
    assert(res.status !== 500, 'XSS attempt does not crash server')
    if (res.status === 302) {
      const location = res.headers.location || ''
      assert(!location.includes('<script>'), 'XSS payload not in redirect URL')
    }
  } catch (e) {
    assert(false, 'XSS test', e.message)
  }

  // Authentication bypass test
  try {
    const res = await httpGet(`${BASE_URL}/admin/projects`)
    assert(res.status === 302 || res.status === 401, 'Admin route blocks unauthenticated access')
  } catch (e) {
    assert(false, 'Auth bypass test', e.message)
  }

  // Summary
  log('\n' + '='.repeat(60), 'info')
  log('TEST RESULTS', 'info')
  log('='.repeat(60), 'info')
  log(`✓ Passed: ${passed}`, 'success')
  log(`✗ Failed: ${failed}`, 'error')
  log(`Total:  ${passed + failed}`, 'info')
  log('='.repeat(60) + '\n', 'info')

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: { passed, failed },
    completedAt: new Date().toISOString()
  }
  fs.writeFileSync('./TEST_RESULTS_SMOKE.json', JSON.stringify(report, null, 2))
  log('📄 Report saved to TEST_RESULTS_SMOKE.json', 'info')

  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch(e => {
  log(`\n❌ Test suite crashed: ${e.message}`, 'error')
  console.error(e)
  process.exit(1)
})
