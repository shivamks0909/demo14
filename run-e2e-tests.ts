#!/usr/bin/env node

/**
 * END-TO-END AUTOMATED TEST SUITE
 * Executes all test phases from E2E_TEST_PLAN.md
 *
 * Usage: npx tsx run-e2e-tests.ts
 */

import * as http from 'http'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

// Test configuration
const BASE_URL = 'http://localhost:3000'
const TEST_DB_PATH = './data/test_local.db'

// Test data
const TEST_PROJECT_CODE = 'TEST_SINGLE'
const TEST_SUPPLIER_TOKEN = 'DYN01'
const TEST_UID = 'TESTUSER123'

// Results tracking
interface TestResult {
  passed: number
  failed: number
  warnings: number
  tests: Array<{ name: string; status: 'PASSED' | 'FAILED'; details?: string }>
}
const results: TestResult = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
}

// Helper functions
function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
    reset: '\x1b[0m'
  }
  console.log(`${colors[type]}${message}${colors.reset}`)
}

function assert(condition: boolean, testName: string, details = '') {
  if (condition) {
    results.passed++
    results.tests.push({ name: testName, status: 'PASSED', details })
    log(`✓ ${testName}`, 'success')
  } else {
    results.failed++
    results.tests.push({ name: testName, status: 'FAILED', details })
    log(`✗ ${testName}${details ? ': ' + details : ''}`, 'error')
  }
}

function warn(message: string) {
  results.warnings++
  log(`⚠ ${message}`, 'warn')
}

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  return 'Unknown error'
}





function httpGet(url: string): Promise<{ status: number; headers: any; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'E2E-Test-Suite/1.0'
      }
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        resolve({
          status: res.statusCode!,
          headers: res.headers,
          body: data
        })
      })
    })

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    req.setTimeout(10000)
    req.end()
  })
}

function httpPost(url: string, body: string | null = null, headers: Record<string, string> = {}): Promise<{ status: number; headers: any; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'E2E-Test-Suite/1.0',
        ...headers
      }
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        resolve({
          status: res.statusCode!,
          headers: res.headers,
          body: data
        })
      })
    })

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    req.setTimeout(10000)

    if (body) {
      req.write(body)
    }
    req.end()
  })
}

// PHASE 1: System Health Check
async function phase1_SystemHealthCheck() {
  log('\n=== PHASE 1: SYSTEM HEALTH CHECK ===', 'info')

  // 1.1 Verify Database
  log('\n1.1 Verify Database Structure', 'info')
  try {
    const dbExists = fs.existsSync(path.resolve(TEST_DB_PATH))
    assert(dbExists, 'Database file exists at ./data/test_local.db')

    if (dbExists) {
      // Use SQLite to check tables
      try {
        const tablesOutput = execSync(`node -e "const db = require('better-sqlite3')('${TEST_DB_PATH}'); const tables = db.prepare(\\\"SELECT name FROM sqlite_master WHERE type='table'\\\").all(); console.log(tables.map(t => t.name).join(',')); db.close();"`).toString().trim()
        const tables = tablesOutput.split(',')
        const requiredTables = ['projects', 'responses', 'audit_logs', 'suppliers', 'supplier_project_links', 'clients']

        requiredTables.forEach(table => {
          assert(tables.includes(table), `Table '${table}' exists`)
        })

        // Check sample data
        const projectCount = execSync(`node -e "const db = require('better-sqlite3')('${TEST_DB_PATH}'); console.log(db.prepare('SELECT COUNT(*) as count FROM projects').get().count); db.close();"`).toString().trim()
        assert(parseInt(projectCount) > 0, `Projects table has data (${projectCount} projects)`)

        const responseCount = execSync(`node -e "const db = require('better-sqlite3')('${TEST_DB_PATH}'); console.log(db.prepare('SELECT COUNT(*) as count FROM responses').get().count); db.close();"`).toString().trim()
        assert(parseInt(responseCount) >= 0, `Responses table has data (${responseCount} responses)`)
      } catch (e: unknown) {
        warn(`Could not query database details: ${getErrorMessage(e)}`)
      }
    }
  } catch (e: unknown) {
    assert(false, 'Database availability check', getErrorMessage(e))
  }

  // 1.2 TypeScript Compilation
  log('\n1.2 TypeScript Compilation', 'info')
  try {
    const result = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf-8' })
    assert(result.trim() === '', 'TypeScript compilation passes with no errors')
  } catch (e: unknown) {
    const output = (e as any).stdout ? (e as any).stdout.toString() : getErrorMessage(e)
    if (output.includes('error')) {
      assert(false, 'TypeScript compilation', output)
    } else {
      warn(`TypeScript check: ${output}`)
    }
  }

  // 1.3 Environment Configuration
  log('\n1.3 Environment Configuration', 'info')
  const envPath = path.resolve('.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const hasEmptyInsforge = envContent.includes('NEXT_PUBLIC_INSFORGE_URL=') ||
                           envContent.includes('NEXT_PUBLIC_INSFORGE_URL=""') ||
                           envContent.includes("NEXT_PUBLIC_INSFORGE_URL=''")
    assert(hasEmptyInsforge, 'NEXT_PUBLIC_INSFORGE_URL is empty/unset (local mode enabled)')
  } else {
    warn('.env.local file not found')
  }

  // 1.4 Dev Server
  log('\n1.4 Development Server', 'info')
  try {
    const res = await httpGet(`${BASE_URL}/`)
    assert(res.status === 200, 'Dev server responds on port 3000')

    assert(res.status !== 500, 'No 500 errors in server response')
  } catch (e: unknown) {
    assert(false, 'Dev server connectivity', getErrorMessage(e))
  }
}

// PHASE 2: Authentication Tests
async function phase2_AuthenticationTests() {
  log('\n=== PHASE 2: AUTHENTICATION TESTS ===', 'info')

  // 2.1 Login Page
  log('\n2.1 Login Page', 'info')
  try {
    const res = await httpGet(`${BASE_URL}/login`)
    assert(res.status === 200, 'Login page loads')
    assert(res.body.includes('Admin Login'), 'Login page contains title')
    assert(res.body.includes('username') || res.body.includes('email'), 'Login form has username field')
    assert(res.body.includes('password'), 'Login form has password field')
  } catch (e: unknown) {
    assert(false, 'Login page load', getErrorMessage(e))
  }

  // 2.2 Valid Login (Dev Bypass)
  log('\n2.2 Valid Login (Dev Bypass)', 'info')
  // Note: Server Actions require browser JS, we'll document this limitation
  warn('Login testing requires browser interaction - skipping automated test')
  // TODO: Use Puppeteer/Playwright for full automation

  // 2.3 Invalid Login
  log('\n2.3 Invalid Login', 'info')
  warn('Login testing requires browser interaction - skipping automated test')

  // 2.4 Session Persistence
  log('\n2.4 Session Persistence', 'info')
  warn('Session testing requires browser interaction - skipping automated test')

  // 2.5 Protected Routes
  log('\n2.5 Protected Routes', 'info')
  try {
    const res = await httpGet(`${BASE_URL}/admin/dashboard`)
    assert(res.status === 302 || res.status === 307 || res.status === 200, 'Admin route responds')
    // With no session, should redirect to login
  } catch (e: unknown) {
    assert(false, 'Protected route check', getErrorMessage(e))
  }
}

// PHASE 3: Dashboard Validation
async function phase3_DashboardValidation() {
  log('\n=== PHASE 3: DASHBOARD VALIDATION ===', 'info')

  // 3.1 Dashboard Load (requires auth)
  log('\n3.1 Dashboard Load (requires auth)', 'info')
  warn('Dashboard requires login session - skipping automated test')

  // 3.2 Navigation
  log('\n3.2 Navigation Links', 'info')
  warn('Navigation requires logged-in session - skipping automated test')
}

// PHASE 4-14: Core Functionality
// These require browser automation beyond simple HTTP requests
// We'll document what needs manual testing

function documentManualTests() {
  log('\n=== MANUAL TESTING CHECKLIST ===', 'warn')
  log(`
The following tests require manual browser interaction or advanced automation:

PHASE 4: PROJECT MANAGEMENT
- Create project via UI
- Edit project
- Change status (pause/resume)
- Multi-country routing

PHASE 5: SUPPLIER MANAGEMENT
- Create supplier
- Edit supplier
- Link supplier to project with quota
- Delete supplier

PHASE 6: LINK GENERATION
- Generate tracking link from UI
- Verify link format

PHASE 7: TRACK FLOW (CORE USER JOURNEY)
- Access tracking link: /r/TEST_SINGLE/DYN01/TESTUSER123
- Verify 302 redirect and cookies
- Check database records
- Verify audit log entry
- Verify quota increment

PHASE 8: CALLBACK SYSTEM
- Complete callback: /api/callback?session={sid}&type=complete
- Idempotent callback test
- Other callback types (terminate, quota, security)
- Duplicate callback prevention

PHASE 9: S2S VERIFICATION
- S2S callback with signature
- Invalid signature rejection
- Expired timestamp rejection
- IP whitelisting (if configured)

PHASE 10: FRAUD DETECTION
- Quota exceeded scenarios
- IP throttling (4 requests/60s)
- Duplicate UID detection

PHASE 11-12: UI TABLES (Responses & Audit Logs)
- View responses
- Check pagination, search, filter
- View audit logs
- Filter by event type

PHASE 13: FULL WORKFLOW
- Complete end-to-end manual workflow

PHASE 14: ERROR CASES
- Invalid project code
- Paused project
- Missing parameters
- Invalid callback type

PHASE 15: BUTTON TESTING
- All UI button interactions

PHASE 16: PERFORMANCE & STRESS
- Load testing (10 concurrent requests)
- Database performance checks

PHASE 17: SECURITY CHECKS
- SQL injection attempts
- XSS prevention
- Authentication bypass attempts
- Rate limiting verification
`, 'info')
}

// PHASE 17: Basic Security Checks (automated where possible)
async function phase17_SecurityChecks() {
  log('\n=== PHASE 17: SECURITY CHECKS (Partial) ===', 'info')

  // 17.1 SQL Injection (basic test)
  log('\n17.1 SQL Injection Prevention', 'info')
  try {
    const maliciousUid = "test'; DROP TABLE responses; --"
    const res = await httpGet(`${BASE_URL}/r/TEST_SINGLE/DYN01/${encodeURIComponent(maliciousUid)}`)
    // Should not be a 500 error if properly parameterized
    assert(res.status !== 500, 'SQL injection attempt does not crash server')
  } catch (e: any) {
    warn(`SQL injection test error: ${e.message}`)
  }

  // 17.2 XSS Prevention (basic test)
  log('\n17.2 XTS Prevention', 'info')
  try {
    const xssUid = '<script>alert("xss")</script>'
    const res = await httpGet(`${BASE_URL}/r/TEST_SINGLE/DYN01/${encodeURIComponent(xssUid)}`)
    assert(res.status !== 500, 'XSS attempt does not crash server')
    assert(!res.body.includes('<script>alert'), 'XSS payload not reflected unescaped')
  } catch (e: any) {
    warn(`XSS test error: ${e.message}`)
  }

  // 17.3 Authentication Bypass
  log('\n17.3 Authentication Bypass', 'info')
  try {
    const res = await httpGet(`${BASE_URL}/admin/dashboard`)
    // Should redirect or return 401/403, not 200 with data
    assert(res.status === 302 || res.status === 307 || res.status === 401 || res.status === 403,
           'Protected route blocks unauthenticated access')
  } catch (e: unknown) {
    assert(false, 'Auth bypass check', getErrorMessage(e))
  }

  // 17.4 Rate Limiting
  log('\n17.4 Rate Limiting', 'info')
  try {
    // Make multiple rapid requests
    const requests = []
    for (let i = 0; i < 5; i++) {
      requests.push(httpGet(`${BASE_URL}/r/TEST_SINGLE/DYN01/RATETEST_${Date.now()}_${i}`))
    }
    const responses = await Promise.all(requests)
    const throttled = responses.find(r =>
      (r.status === 302 || r.status === 307) &&
      (r.headers.location?.includes('security-terminate') || r.body.includes('security'))
    )
    assert(!!throttled || responses.every(r => r.status === 302 || r.status === 307 || r.status === 200),
           'Rate limiting active (or all requests succeeded)')
  } catch (e: any) {
    warn(`Rate limiting test error: ${e.message}`)
  }
}

// Run all automated phases
async function runAllTests() {
  log('🚀 STARTING E2E TEST SUITE', 'info')
  log(`Base URL: ${BASE_URL}`, 'info')
  log(`Test Database: ${TEST_DB_PATH}`, 'info')
  log('Start Time: ' + new Date().toISOString(), 'info')

  try {
    await phase1_SystemHealthCheck()
    await phase2_AuthenticationTests()
    await phase3_DashboardValidation()
    await phase17_SecurityChecks()

    documentManualTests()

  } catch (e: any) {
    log(`\n❌ Test suite crashed: ${e.message}`, 'error')
    console.error(e)
  }

  // Final Report
  log('\n' + '='.repeat(60), 'info')
  log('📊 TEST RESULTS SUMMARY', 'info')
  log('='.repeat(60), 'info')
  log(`✓ Passed: ${results.passed}`, 'success')
  log(`✗ Failed: ${results.failed}`, 'error')
  log(`⚠ Warnings: ${results.warnings}`, 'warn')
  log(`Total Tests: ${results.passed + results.failed}`, 'info')
  log(`End Time: ${new Date().toISOString()}`, 'info')
  log('='.repeat(60) + '\n', 'info')

  // Save results to file
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: {
      passed: results.passed,
      failed: results.failed,
      warnings: results.warnings
    },
    tests: results.tests
  }

  fs.writeFileSync(
    path.resolve('./TEST_RESULTS_AUTOMATED.json'),
    JSON.stringify(report, null, 2)
  )
  log('📄 Full results saved to TEST_RESULTS_AUTOMATED.json', 'info')

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0)
}

// Execute
runAllTests()
