# Production Finalization - Survey Routing Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete all production finalization tasks for the Survey Routing Platform to make it ready for deployment

**Architecture:** Multi-phase approach covering environment validation, database verification, API testing, E2E validation, deployment, and documentation

**Tech Stack:** Next.js 15, React, TypeScript, PostgreSQL/SQLite, InsForge, Node.js scripts

---

## PHASE 1: Environment & Configuration Validation

### Task 1: Verify Required Environment Variables

**Files:**
- Check: `.env.example`
- Check: `.env.local`
- Check: `package.json`

#### Step 1: Verify GEOIP_PROVIDER is set
Run: `grep -E "^GEOIP_PROVIDER=" .env.local .env.example 2>/dev/null || echo "Not set"`
Expected: Should show either 'maxmind', 'ipinfo', or 'auto'

#### Step 2: Verify MAXMIND_DB_PATH (if using maxmind)
Run: `grep "^MAXMIND_DB_PATH=" .env.local .env.example 2>/dev/null || echo "Not set (ok if using ipinfo)"`
Expected: Path to GeoLite2-Country.mmdb or empty if using ipinfo

#### Step 3: Verify IPINFO_TOKEN (if using ipinfo)
Run: `grep "^IPINFO_TOKEN=" .env.local .env.example 2>/dev/null || echo "Not set (ok if using maxmind)"`
Expected: Non-empty token string if using ipinfo provider

#### Step 4: Verify ADMIN_MASTER_KEY
Run: `grep "^ADMIN_MASTER_KEY=" .env.local 2>/dev/null || echo "Missing in .env.local"`
Expected: 32+ byte random hex/base64 string

#### Step 5: Verify NODE_ENV
Run: `grep "^NODE_ENV=" .env.local 2>/dev/null || echo "Missing"`
Expected: 'development' or 'production'

#### Step 6: Document current configuration
Create file: `data/env-config-report.txt` with all findings

#### Step 7: Commit any needed changes to .env.local
If any variables missing, add them based on .env.example template

---

### Task 2: Validate Database Connectivity

**Files:**
- Check: `lib/unified-db.ts`
- Check: `.env.local`
- Script: `scripts/check_db.ts` (if exists)

#### Step 1: Check InsForge connection configuration
Read `lib/unified-db.ts` to understand connection logic
Expected: Should have NEXT_PUBLIC_INSFORGE_URL handling

#### Step 2: Test InsForge connection
Run: `node -e "const db = require('./lib/unified-db.ts'); console.log('InsForge check');"` 2>&1 || echo "Need to create test script"

Create test script if needed:
```bash
cat > scripts/test-insforge-connection.js << 'EOF'
const { db } = require('../lib/unified-db.ts');

async function test() {
  try {
    const result = await db.query('SELECT 1 as test');
    console.log('✅ Database connection successful:', result);
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

test();
EOF
```

Run: `node scripts/test-insforge-connection.js`

#### Step 3: Verify SQLite fallback works
Temporarily set `NEXT_PUBLIC_INSFORGE_URL=` (empty) and test connection again
Expected: Should connect to local data/test_local.db

#### Step 4: Test SQLite database exists
Run: `ls -la data/test_local.db 2>/dev/null || echo "Missing"`
If missing, create: `mkdir -p data && touch data/test_local.db` (but schema should be in another task)

#### Step 5: Commit connection test results
Update `data/db-connection-status.txt` with timestamps and results

---

### Task 3: Verify Security Configurations

**Files:**
- Check: `middleware-security.ts`
- Check: `app/api/callback/route.ts`
- Check: `app/api/s2s/callback/route.ts`

#### Step 1: Check HMAC signature verification implementation
Read `app/api/callback/route.ts` line 1-100
Expected: Should use `crypto.timingSafeEqual` for signature check

#### Step 2: Check rate limiting active
Read `middleware-security.ts` or rate limiting middleware
Expected: Should have rate limit configuration (3/min for routing, 5/15min for login)

#### Step 3: Verify duplicate detection enabled
Search responses table for `is_fake_suspected` or duplicate UID logic
Run: `grep -r "duplicate.*uid" app/ lib/ --include="*.ts" --include="*.tsx" | head -5`

#### Step 4: Check audit logging in place
Read `app/actions.ts` and check for audit function calls
Expected: All major actions should call audit logging

#### Step 5: Generate security configuration report
Create `data/security-config-report.txt` with findings

#### Step 6: Commit security report

---

## PHASE 2: Database & Schema Verification

### Task 4: Run Full Schema Migration on Production Database

**Files:**
- Script: `scripts/migrate-full-schema.sql`
- Script: `scripts/migrate-audit-logs.sql` (if separate)
- Script: `scripts/create-s2s-config.sql` (if exists)

#### Step 1: Verify migration scripts exist
Check: `ls -la scripts/migrate-*.sql`
Expected: At least migrate-full-schema.sql and migrate-audit-logs.sql present

#### Step 2: Read migration script to verify tables
Read `scripts/migrate-full-schema.sql` lines 1-200
Verify these tables are created:
- clients
- projects
- suppliers
- supplier_project_links
- responses
- audit_logs
- s2s_config
- s2s_logs
- callback_logs (if separate)

#### Step 3: Run migration on production database
```bash
# Set DATABASE_URL from production env
export DATABASE_URL="${DATABASE_URL}"

# Run full migration
psql $DATABASE_URL -f scripts/migrate-full-schema.sql

# Check exit code
if [ $? -eq 0 ]; then
  echo "✅ Migration successful"
else
  echo "❌ Migration failed"
  exit 1
fi
```

#### Step 4: Verify tables created
```bash
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
```

Expected output includes all 9 tables listed above.

#### Step 5: Record migration success
Create `data/migration-status.txt` with timestamp and checklist

---

### Task 5: Verify Critical Indexes Exist

**Files:**
- Script: `scripts/migrate-full-schema.sql` (check CREATE INDEX statements)

#### Step 1: Check index creation in migration
Read `scripts/migrate-full-schema.sql` for lines containing "CREATE INDEX"
Verify these indexes present:
- `responses_clickid_idx` on responses(clickid)
- `responses_supplier_uid_idx` on responses(supplier_token, uid) or similar
- `responses_status_idx` on responses(status)
- `s2s_logs_timestamp_idx` on s2s_logs(created_at) or response_id + timestamp

#### Step 2: Query database to verify indexes
```bash
psql $DATABASE_URL -c "\d responses" | grep -E "(responses_clickid_idx|responses_supplier_uid_idx|responses_status_idx)"
psql $DATABASE_URL -c "\d s2s_logs" | grep "s2s_logs_timestamp_idx"
```

Expected: Index names should appear in output

#### Step 3: Document indexes in report
Create/append to `data/indexes-verification.txt` with findings

#### Step 4: Commit verification results

---

### Task 6: Test Database Connection Pooling

**Files:**
- Check: `lib/unified-db.ts` (connection pool configuration)

#### Step 1: Check connection pool settings
Read `lib/unified-db.ts` for pool configuration
Expected: Should have pool size, timeout settings

#### Step 2: Verify pool is active
Create test script:
```javascript
// scripts/test-connection-pool.js
const { db } = require('../lib/unified-db.ts');

async function test() {
  console.log('Testing connection pool...');
  const start = Date.now();

  // Execute 10 concurrent queries
  const promises = Array(10).fill(null).map(() =>
    db.query('SELECT 1 as test')
  );

  try {
    await Promise.all(promises);
    const duration = Date.now() - start;
    console.log(`✅ Pool test passed: 10 queries in ${duration}ms`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Pool test failed:', error.message);
    process.exit(1);
  }
}

test();
```

Run: `node scripts/test-connection-pool.js`

#### Step 3: Document pool configuration
Record pool size, max connections in `data/pool-config.txt`

#### Step 4: Commit results

---

### Task 7: Validate RLS Policies (PostgreSQL Only)

**Files:**
- Migration scripts may include RLS

#### Step 1: Check if RLS enabled on tables
```bash
psql $DATABASE_URL -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"
```

Expected: Might show 'on' for some tables or all 'off' if not used

#### Step 2: List RLS policies
```bash
psql $DATABASE_URL -c "SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public';"
```

If no rows returned, RLS not used - that's OK

#### Step 3: Document RLS status
Create `data/rls-policies.txt` with findings

#### Step 4: Commit documentation

---

## PHASE 3: API Endpoint Testing

### Task 8: Test /init/[transactionId]/[rid] Endpoint

**Files:**
- Route: `app/init/[transactionId]/[rid]/page.tsx` or similar
- Check: `app/api/init/` if separate API

#### Step 1: Locate the endpoint
Find route file:
```bash
find app -name "*init*" -type f | grep -E "\.(ts|tsx)$"
```

Expected: Should find either page or API route

#### Step 2: Test security validation (HMAC)
Create test script:
```javascript
// scripts/test-init-hmac.js
const crypto = require('crypto');

// Get test data from database or create test values
const transactionId = 'test-trans-123';
const rid = 'test-rid-456';
const secret = 'test-secret-key';

// Generate valid HMAC
const hmac = crypto.createHmac('sha256', secret);
hmac.update(`${transactionId}:${rid}`);
const signature = hmac.digest('hex');

console.log('Testing HMAC verification on /init endpoint...');
console.log('Signature:', signature);

// Make test request
// Use curl or fetch from Node
```

Test both valid and invalid signatures

#### Step 3: Test IP throttling
Make 4 requests from same IP within 60s, verify 4th gets blocked or delayed

#### Step 4: Test duplicate UID detection
Same RID twice - verify second triggers duplicate handling

#### Step 5: Test quota enforcement
Check `supplier_project_links.quota_used` increments, blocks when quota reached

#### Step 6: Test audit logging
After each request, query `audit_logs` table for entry_created events

#### Step 7: Document test results in `data/api-init-test-results.txt`

---

### Task 9: Test /api/callback/[project]/[clickid]/[status] Endpoint

**Files:**
- Route: `app/api/callback/[project]/[clickid]/[status]/route.ts`

#### Step 1: Locate and read route file
Read file to verify:
- HMAC verification logic
- Response status updates
- Audit trail creation

#### Step 2: Test HMAC verification
Create test script similar to Task 8 but for callback endpoint
Expected: Invalid signature returns 401/400

#### Step 3: Test valid callback updates response
1. Create test response in DB (INSERT into responses with status='in_progress')
2. Call callback endpoint with valid signature
3. Verify response.status changed to requested status
4. Verify `completion_time` or `updated_at` populated

#### Step 4: Check audit trail entry
Query `audit_logs` for event_type='callback_success'

#### Step 5: Test idempotency
Call same callback again, verify response returns idempotent flag, no double updates

#### Step 6: Test other status values: complete, terminate, quotafull, security

#### Step 7: Document results in `data/api-callback-test-results.txt`

---

### Task 10: Test /api/respondent-stats/[session] Endpoint

**Files:**
- Route: `app/api/respondent-stats/[session]/route.ts`

#### Step 1: Read route implementation
Verify it returns:
- supplier_uid
- project_code
- status
- LOI (if available)
- Proper error handling (404 if not found)

#### Step 2: Create test script
```javascript
// scripts/test-respondent-stats.js
const sessionId = 'test-session-123';

// Insert test response
// Then call endpoint: GET /api/respondent-stats/[session]
// Verify JSON response contains expected fields

console.log('Testing respondent stats endpoint...');
```

#### Step 3: Test with valid session
Expected: 200 with JSON data

#### Step 4: Test with invalid session
Expected: 404 or appropriate error

#### Step 5: Document results

---

### Task 11: Test Admin APIs

**Files:**
- `app/api/admin/projects/route.ts`
- `app/api/admin/suppliers/route.ts`
- `app/api/admin/responses/route.ts`
- `app/api/admin/clients/route.ts`

#### Step 1: Verify authentication required
Each admin API should check for admin session
Test without session - expect redirect or 401

#### Step 2: Test GET /api/admin/projects
Create test script:
```javascript
// scripts/test-admin-projects.js
const fetch = require('node-fetch');
// Use admin session cookie from login
const cookie = 'admin_session=...';

fetch('http://localhost:3000/api/admin/projects', {
  headers: { 'Cookie': cookie }
})
.then(r => r.json())
.then(data => {
  console.log('Projects:', data.length);
  process.exit(0);
})
.catch(err => {
  console.error(err);
  process.exit(1);
});
```

#### Step 3: Test other admin endpoints similarly
Document each one's functionality

#### Step 4: Document results in `data/admin-apis-test-results.txt`

---

## PHASE 4: E2E Test Suite Execution (17 Phases)

### Task 12: Execute E2E Test Phase 1 - Basic Routing

**Reference:** `E2E_TEST_PLAN.md` Phase 1 & 7

#### Step 1: Create test project in DB
```sql
INSERT INTO projects (project_code, base_url, status, created_at)
VALUES ('TEST_E2E', 'https://example.com', 'active', NOW());
```

#### Step 2: Create test supplier
```sql
INSERT INTO suppliers (supplier_token, name, platform, complete_redirect_url, terminate_redirect_url)
VALUES ('TESTSUP', 'E2E Test Supplier', 'test', 'https://example.com/complete', 'https://example.com/terminate');
```

#### Step 3: Link supplier to project with quota
```sql
INSERT INTO supplier_project_links (supplier_id, project_id, quota_allocated, quota_used)
SELECT s.id, p.id, 100, 0 FROM suppliers s, projects p
WHERE s.supplier_token='TESTSUP' AND p.project_code='TEST_E2E';
```

#### Step 4: Test simple routing
```bash
curl -v "http://localhost:3000/r/TEST_E2E/TESTSUP/TESTUSER123"
```

Expected: 302 redirect, Set-Cookie headers, DB entry created

#### Step 5: Verify DB entry
```sql
SELECT * FROM responses WHERE uid='TESTUSER123' AND project_code='TEST_E2E';
```

Expected: status='in_progress', supplier_token='TESTSUP', etc.

#### Step 6: Document results in `data/e2e-phase1-results.txt`

---

### Task 13: Execute E2E Test Phase 2 - Security Validation

**Reference:** `E2E_TEST_PLAN.md` Phase 2

#### Step 1: Test HMAC signature verification
Use callback endpoint with valid and invalid signatures
Expected: Valid succeeds, invalid fails with 401/400

#### Step 2: Test invalid signature rejection
Create corrupted signature, verify rejection

#### Step 3: Document security test results

---

### Task 14: Execute E2E Test Phase 3 - Rate Limiting

**Reference:** `E2E_TEST_PLAN.md` Phase 3

#### Step 1: Test IP-based throttling
Make 4 requests from same IP within 60 seconds
Expected: 4th request redirects to security-terminate or returns 429

#### Step 2: Verify rate limit resets after window
Wait 60s, make another request, verify it succeeds

#### Step 3: Document rate limiting behavior

---

### Task 15: Execute E2E Test Phase 4 - Quota Management

**Reference:** `E2E_TEST_PLAN.md` Phase 4

#### Step 1: Set quota to 2
```sql
UPDATE supplier_project_links SET quota_allocated=2 WHERE supplier_token='TESTSUP' AND project_code='TEST_E2E';
```

#### Step 2: Exceed quota
Make 3 routing requests (1 will create entry, 2 more use quota)
Third should redirect to quotafull

#### Step 3: Verify quota_used increments correctly
Check `supplier_project_links.quota_used` after each request

#### Step 4: Document quota enforcement

---

### Task 16: Execute E2E Test Phase 5 - Audit Logging

**Reference:** `E2E_TEST_PLAN.md` Phase 5

#### Step 1: Perform routing action
Make one track request

#### Step 2: Check audit_logs table
```sql
SELECT event_type, payload FROM audit_logs WHERE payload @> '{"uid":"TESTUSER123"}' ORDER BY created_at DESC LIMIT 1;
```

Expected: event_type='entry_created', payload contains project_code, supplier_token, uid, ip, user_agent

#### Step 3: Trigger callback and check audit log
Expected: event_type='callback_success'

#### Step 4: Verify all critical events are logged
List all event types from `E2E_TEST_PLAN.md` Phase 5

#### Step 5: Document audit coverage

---

### Task 17: Execute E2E Test Phase 6 - GeoIP Integration

**Reference:** `E2E_TEST_PLAN.md` Phase 6

#### Step 1: Verify GeoIP provider loaded
Check logs for "GeoIP service initialized" or similar

#### Step 2: Test IP geolocation
Make request with test IP (use X-Forwarded-For header if needed)
```bash
curl -H "X-Forwarded-For: 8.8.8.8" "http://localhost:3000/r/TEST_E2E/TESTSUP/USER1"
```

#### Step 3: Check country_code populated in responses table
```sql
SELECT country_code FROM responses WHERE uid='USER1';
```

Expected: 'US' for 8.8.8.8

#### Step 4: Test country-based routing if configured
If project has multi-country config, verify correct redirect

#### Step 5: Document GeoIP functionality

---

### Task 18: Execute E2E Test Phase 7 - Supplier UID Flow

**Reference:** `E2E_TEST_PLAN.md` Phase 7

#### Step 1: Test UID generation and tracking
Verify UID is captured correctly in request

#### Step 2: Test duplicate detection across suppliers
Same UID, different supplier - should be allowed
```bash
curl "http://localhost:3000/r/TEST_E2E/OTHERSUP/SAMEUSER"
```
Expected: Should succeed (different supplier)

#### Step 3: Test duplicate detection same supplier
Same UID, same supplier - should redirect to duplicate-string
```bash
curl "http://localhost:3000/r/TEST_E2E/TESTSUP/SAMEUSER"
```
Expected: duplicate-string redirect

#### Step 4: Document duplicate detection behavior

---

### Task 19: Execute E2E Test Phase 8 - Client UID Flow

**Reference:** `E2E_TEST_PLAN.md` Phase 8

#### Step 1: Test client-side UID handling
Check cookies set: last_uid, last_sid, last_pid

#### Step 2: Verify UID sanitization
Test with special characters in UID
Expected: Should be sanitized or rejected appropriately

#### Step 3: Document UID handling

---

### Task 20: Execute E2E Test Phase 9 - Multi-Project Support

**Reference:** `E2E_TEST_PLAN.md` Phase 9

#### Step 1: Create second project
```sql
INSERT INTO projects (project_code, base_url, status) VALUES ('PROJ2', 'https://proj2.com', 'active');
```

#### Step 2: Link same supplier to both projects
```sql
INSERT INTO supplier_project_links (supplier_id, project_id, quota_allocated)
SELECT s.id, p.id, 50 FROM suppliers s, projects p
WHERE s.supplier_token='TESTSUP' AND p.project_code='PROJ2';
```

#### Step 3: Test routing for both projects
Verify responses table correctly associates with correct project

#### Step 4: Verify project-specific routing rules (if any)
Each project can have different base_urls, country configs

#### Step 5: Document multi-project isolation

---

### Task 21: Execute E2E Test Phase 10 - Multi-Supplier Support

**Reference:** `E2E_TEST_PLAN.md` Phase 10

#### Step 1: Create second supplier
```sql
INSERT INTO suppliers (supplier_token, name) VALUES ('SUP2', 'Supplier 2');
```

#### Step 2: Link to project with separate quota
```sql
INSERT INTO supplier_project_links (supplier_id, project_id, quota_allocated)
SELECT s.id, p.id, 75 FROM suppliers s, projects p
WHERE s.supplier_token='SUP2' AND p.project_code='TEST_E2E';
```

#### Step 3: Route through each supplier
Verify each supplier's quota tracked separately

#### Step 4: Document supplier isolation

---

### Task 22: Execute E2E Test Phase 11 - Status Transitions

**Reference:** `E2E_TEST_PLAN.md` Phase 11

#### Step 1: Test all status transitions
- in_progress → complete (via callback type=complete)
- in_progress → terminate (type=terminate)
- in_progress → quotafull (quota exceeded)
- in_progress → security_terminate (rate limit exceeded)

#### Step 2: Verify status cannot transition to invalid states
Already terminated should not allow further callbacks

#### Step 3: Check timestamps: created_at, updated_at, completion_time

#### Step 4: Document all status flows

---

### Task 23: Execute E2E Test Phase 12 - Error Handling

**Reference:** `E2E_TEST_PLAN.md` Phase 12

#### Step 1: Test invalid parameters
Missing UID, invalid project code, malformed URLs
Expected: Graceful errors, redirects to error pages

#### Step 2: Test missing records
Non-existent supplier_token, project_code
Expected: redirect to /paused or error page

#### Step 3: Simulate database errors (if possible)
Test behavior when DB is down or query fails
Expected: No crash, appropriate error response

#### Step 4: Document error handling coverage

---

### Task 24: Execute E2E Test Phase 13 - Performance Under Load

**Reference:** `E2E_TEST_PLAN.md` Phase 13

#### Step 1: Run load test script
Use existing `load-test.js` or create simple one:
```bash
node load-test.js --concurrent 10 --requests 50 --url "http://localhost:3000/r/TEST_E2E/TESTSUP/LDUSER"
```

#### Step 2: Monitor response times
Average should be <200ms, max <500ms

#### Step 3: Check for database locks or slow queries
Monitor with: `psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"`

#### Step 4: Verify all requests succeed (200-302 codes)

#### Step 5: Document performance metrics

---

### Task 25: Execute E2E Test Phase 14 - Data Consistency

**Reference:** `E2E_TEST_PLAN.md` Phase 14

#### Step 1: Check for duplicate clickid values
```sql
SELECT clickid, COUNT(*) FROM responses GROUP BY clickid HAVING COUNT(*) > 1;
```
Expected: 0 rows

#### Step 2: Verify status transitions are valid
Check that all terminal statuses are only set once

#### Step 3: Check timestamp consistency
```sql
SELECT * FROM responses WHERE updated_at < created_at;
```
Expected: 0 rows

#### Step 4: Verify foreign keys intact
```sql
SELECT r.id FROM responses r LEFT JOIN projects p ON r.project_id = p.id WHERE p.id IS NULL;
```
Expected: 0 rows (no orphans)

#### Step 5: Document data integrity

---

### Task 26: Execute E2E Test Phase 15 - Edge Cases

**Reference:** `E2E_TEST_PLAN.md` Phase 15

#### Step 1: Test missing parameters
`/r/TEST_E2E/TESTSUP` (no UID)
Expected: Error or redirect, no crash

#### Step 2: Test malformed URLs
Extra slashes, special characters, very long UIDs

#### Step 3: Test expired sessions (if session expiry implemented)
Create old session, verify handling

#### Step 4: Document edge case handling

---

### Task 27: Execute E2E Test Phase 16 - Integration Testing

**Reference:** `E2E_TEST_PLAN.md` Phase 16

#### Step 1: Complete full flow with real data
1. Create project with real settings
2. Create supplier with real redirect URLs
3. Generate link
4. Simulate user journey: click link → survey → callback
5. Verify all systems work together

#### Step 2: Cross-system validation
- DB records match callback results
- Audit logs capture full trail
- Metrics update correctly

#### Step 3: Document integration test results

---

### Task 28: Execute E2E Test Phase 17 - Production Readiness

**Reference:** `E2E_TEST_PLAN.md` Phase 17

#### Step 1: Run all previous phases in sequence
Confirm no regressions

#### Step 2: Final verification checklist
Go through PRODUCTION_DEPLOYMENT_CHECKLIST.md and verify all green checks

#### Step 3: Sign-off criteria
Document that all 17 phases passed

#### Step 4: Create final E2E test report: `data/e2e-final-report.txt`

---

## PHASE 5: Production Deployment

### Task 29: Create Admin User

**Files:**
- Script: `create-admin.js` or `scripts/create-admin-user.js`

#### Step 1: Locate admin creation script
Find: `ls -la create-admin.js scripts/create-admin*.js 2>/dev/null`

If not exists, create from template in DEPLOYMENT_GUIDE.md

#### Step 2: Create admin user via script
```bash
node scripts/create-admin-user.js admin@yourcompany.com "SecurePass123!" "System Administrator"
```

Adjust email/password as needed for production

#### Step 3: Verify admin user created
```sql
SELECT * FROM admin_users WHERE email='admin@yourcompany.com';
```
Or check `users` table if using InsForge Auth

#### Step 4: Test admin login
Visit `/login` with created credentials
Expected: Success, redirect to `/admin`

#### Step 5: Record credentials securely (outside git)
Update `.env.production` with admin email reference

#### Step 6: Document admin creation in deployment log

---

### Task 30: Insert S2S Configurations

**Files:**
- SQL: `scripts/s2s-config-example.sql` or create manually

#### Step 1: Generate unique secret keys for each project
For production projects needing HMAC verification:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Generate one per project

#### Step 2: Insert into s2s_config table
```sql
INSERT INTO s2s_config (project_id, secret_key, require_s2s_for_complete, created_at)
VALUES (
  (SELECT id FROM projects WHERE project_code='PROD_PROJECT_1'),
  'generated-64-char-hex-key-here',
  TRUE,
  NOW()
);
```

Repeat for each project

#### Step 3: Verify S2S configs
```sql
SELECT p.project_code, s.secret_key FROM s2s_config s
JOIN projects p ON s.project_id = p.id;
```

#### Step 4: Share secret keys securely with suppliers
Do NOT commit to git. Use secure channel.

#### Step 5: Document which projects have S2S enabled

---

### Task 31: Deploy to Production (Vercel/InsForge)

**Files:**
- Deploy config: `.vercel/` if Vercel
- InsForge: use MCP tool or CLI

#### Step 1: Build production bundle
```bash
npm ci --only=production
npm run build
```

Expected: No errors, complete successfully

#### Step 2: Deploy to Vercel (if using Vercel)
```bash
vercel --prod
```

Or link git repo to Vercel and push to main

#### Step 3: Deploy to InsForge (if using InsForge)
Use MCP tool: `mcp__insforge__create-deployment` or similar
Or follow `DEPLOYMENT_GUIDE.md` InsForge section

#### Step 4: Verify deployment succeeds
Check deployment URL responds with 200

#### Step 5: Test health endpoint
```bash
curl https://your-production-domain.com/api/health
```
Expected: {"status":"ok"}

#### Step 6: Document deployment details
Deployment URL, commit SHA, timestamp in `data/deployment-records.txt`

---

### Task 32: Configure Production Environment Variables

**Files:**
- `.env.production` (not in git)
- Vercel dashboard environment settings
- InsForge project environment settings

#### Step 1: Set required production variables
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
DATABASE_URL=postgresql://user:pass@host:5432/dbname
NEXT_PUBLIC_INSFORGE_URL=postgresql://user:pass@host:5432/dbname
INSFORGE_API_KEY=your-insforge-api-key
NEXTAUTH_SECRET=generate-32-byte-random
ADMIN_MASTER_KEY=generate-32-byte-random
GEOIP_PROVIDER=maxmind  # or ipinfo
MAXMIND_DB_PATH=/path/to/GeoLite2-Country.mmdb  # if using maxmind
IPINFO_TOKEN=your-token  # if using ipinfo
CALLBACK_SECRET=generate-32-byte-for-callback-hmac  # if using callback HMAC
```

#### Step 2: Remove any development bypasses
Ensure `NEXT_PUBLIC_INSFORGE_URL` is NOT empty in production

#### Step 3: Configure in hosting platform
Vercel: Project Settings → Environment Variables
InsForge: Project Settings → Environment

#### Step 4: Verify all secrets are set
Create script to check required vars:
```bash
node -e "require('dotenv').config(); console.log('Vars:', Object.keys(process.env).filter(k => k.includes('URL') || k.includes('SECRET') || k.includes('KEY')));"
```

#### Step 5: Restart production instance to pick up env vars

#### Step 6: Document environment configuration (without secrets)

---

### Task 33: Update DNS/Domain Settings (if needed)

**Files:**
- Documentation only

#### Step 1: Verify domain points to deployment
Check DNS A/AAAA records or CNAME

#### Step 2: Configure SSL (usually automatic with Vercel/InsForge)
Verify `https://` works

#### Step 3: Test all endpoints with production domain
- `/api/health`
- `/r/TEST/SUP/UID`
- `/admin`

#### Step 4: Document final domain configuration

---

## PHASE 6: Post-Deployment Validation

### Task 34: Smoke Tests on Production URL

**Files:**
- Create: `data/production-smoke-tests.sh`

#### Step 1: Create smoke test script
```bash
#!/bin/bash
# data/production-smoke-tests.sh

DOMAIN="https://your-production-domain.com"

echo "Running smoke tests on $DOMAIN..."

# Test 1: Health check
echo "1. Health check..."
curl -f "$DOMAIN/api/health" > /dev/null && echo "✅ Health OK" || echo "❌ Health failed"

# Test 2: Basic routing
echo "2. Basic routing test..."
curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/r/TEST/SUP/USER123" | grep -E "^3[0-9]{2}$" > /dev/null && echo "✅ Routing returns redirect" || echo "❌ Routing failed"

# Test 3: Admin page loads
echo "3. Admin page..."
curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/admin" | grep -E "^2[0-9]{2}$" > /dev/null && echo "✅ Admin loads" || echo "❌ Admin failed"

# Test 4: Login page
echo "4. Login page..."
curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/login" | grep -E "^2[0-9]{2}$" > /dev/null && echo "✅ Login loads" || echo "❌ Login failed"

echo "Smoke tests complete."
```

#### Step 2: Make script executable and run
```bash
chmod +x data/production-smoke-tests.sh
./data/production-smoke-tests.sh
```

Expected: All tests pass

#### Step 3: Capture output to `data/smoke-test-results.txt`

#### Step 4: Document any failures and fix before proceeding

---

### Task 35: Verify Logging and Monitoring

**Files:**
- Check: `lib/audit-service.ts` or similar
- Production logs: InsForge/Vercel log viewer

#### Step 1: Verify audit logging to database
Perform a test routing request, then:
```sql
SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '5 minutes';
```
Expected: At least 1 entry (entry_created)

#### Step 2: Check application logs
View Vercel/InsForge logs for errors or warnings

#### Step 3: Verify error logging
Trigger a known error (invalid callback), check error appears in logs

#### Step 4: Check callback logs
After S2S callback test, verify entry in `s2s_logs` table

#### Step 5: Document logging configuration

---

### Task 36: Test Admin Dashboard

**Files:**
- Admin pages in `app/admin/`

#### Step 1: Login to admin dashboard
Use admin credentials from Task 29

#### Step 2: Verify dashboard KPI cards load
Check Total Projects, Responses, etc. display without errors

#### Step 3: Test each admin page:
- Projects page: create, edit, delete project
- Responses page: view responses, search, filter
- Suppliers page: CRUD operations
- Clients page (if exists)
- Audit Logs page: view audit entries
- Settings page (if exists)

#### Step 4: Verify data updates in real-time
Create new response via routing, check if appears in admin

#### Step 5: Document admin dashboard functionality

---

### Task 37: Confirm Backup Procedures

**Files:**
- Documentation: `docs/backup-procedure.md` (create if not exists)

#### Step 1: Check current backup setup
Is automated backup configured? (Vercel has automatic pg_dump)

#### Step 2: Create backup procedure document
If none exists, create `docs/backup-procedure.md` with:
- Daily backup command or configuration
- Retention policy
- Restoration steps
- Storage location (S3, Dropbox, etc.)
- Backup verification steps

#### Step 3: Test backup (if manual)
```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

Verify dump file created and is non-empty

#### Step 4: Test restore (to staging or test DB)
```bash
createdb test_restore
psql test_restore < backup-$(date +%Y%m%d).sql
```
Verify no errors, tables exist

#### Step 5: Document backup schedule and retention

---

### Task 38: Document Rollback Plan

**Files:**
- Create: `docs/rollback-procedure.md`

#### Step 1: Document database rollback
```markdown
## Database Rollback

1. Restore from most recent backup:
   pg_restore -d $DATABASE_URL backup.dump

2. Verify data integrity after restore
3. Run verification queries (counts, foreign keys)

## Application Rollback

1. Deploy previous version:
   git checkout <previous-tag>
   npm run build
   vercel --prod (or redeploy)

2. Verify rollback version runs
3. Check logs for errors

## Emergency Contacts

- DevOps: [contact]
- Database Admin: [contact]
```

#### Step 2: Include decision tree: when to rollback vs fix forward

#### Step 3: Test rollback plan (optional but recommended)
Perform dry-run on staging if available

#### Step 4: Share rollback plan with team

---

## PHASE 7: Documentation & Handoff

### Task 39: Update README with Production Notes

**Files:**
- `README.md`

#### Step 1: Read current README
Understand existing content

#### Step 2: Add Production Deployment section
Update README.md to include:
- Production environment variables list
- Database migration instructions
- Build and deploy steps
- Post-deployment validation checklist
- Monitoring and troubleshooting

#### Step 3: Add API documentation
Create section documenting all API endpoints:
- `/api/health`
- `/r/{code}/{supplier}/{uid}`
- `/track?code=...&uid=...`
- `/api/callback?session=...&type=...`
- `/api/s2s/callback`
- `/api/respondent-stats/[session]`
- Admin APIs

#### Step 4: Add troubleshooting section
Common issues and solutions from deployment experience

#### Step 5: Update badges and metadata (version, status)

#### Step 6: Commit README changes

---

### Task 40: Document API Endpoints

**Files:**
- Create: `docs/api-endpoints.md`

#### Step 1: Create comprehensive API documentation
Use OpenAPI/Swagger format or markdown table

```markdown
# API Endpoints

## Public Endpoints

### GET /api/health
Health check endpoint.
**Response:** 200 OK, JSON: `{"status":"ok","timestamp":"..."}`

### GET /r/{code}/{supplier}/{uid}
Main routing endpoint.
**Parameters:**
- `code`: project code
- `supplier`: supplier token
- `uid`: user identifier (sanitized)
**Response:** 302 redirect to project base_url with cookies

... etc for all endpoints
```

#### Step 2: Document request/response examples
Include curl examples for each endpoint

#### Step 3: Document error codes and handling

#### Step 4: Document authentication requirements

#### Step 5: Commit API documentation

---

### Task 41: Create Runbook for Operations

**Files:**
- Create: `docs/operations-runbook.md`

#### Step 1: Document daily operational tasks
- How to check system health
- How to view logs
- How to restart services
- How to rotate secrets

#### Step 2: Document alert response procedures
- High error rate
- Database down
- Quota exceeded notifications
- Security incidents

#### Step 3: Create troubleshooting decision tree

#### Step 4: Document escalation contacts

#### Step 5: Add monitoring dashboard links
(if using Grafana, Datadog, etc.)

#### Step 6: Commit runbook

---

### Task 42: Share Credentials Securely

**Files:**
- NOT in git - use secure channel

#### Step 1: Compile list of all credentials
- Admin user email/password
- Database connection string
- S2S secret keys (per project)
- API tokens (ipinfo, etc.)
- ADMIN_MASTER_KEY
- NEXTAUTH_SECRET
- CALLBACK_SECRET

#### Step 2: Use secure sharing method
- Encrypted file (GPG)
- Password manager (1Password, LastPass)
- Secure corporate vault
- Direct message (Signal, encrypted email)

#### Step 3: Provide instructions to operations team

#### Step 4: Document credential rotation procedures

---

### Task 43: Schedule Knowledge Transfer

**Files:**
- Create: `docs/knowledge-transfer-plan.md`

#### Step 1: Schedule training sessions
With operations team covering:
- System architecture overview
- Admin dashboard usage
- Monitoring and alerting
- Troubleshooting common issues
- Backup and restore procedures
- Deployment and rollback

#### Step 2: Create training materials
Slides or documents for each topic

#### Step 3: Record sessions (optional)

#### Step 4: Create Q&A document
Frequently asked questions from training

#### Step 5: Document handoff completion
Sign-off sheet with names and dates

---

### Task 44: Final Production Sign-Off

**Files:**
- Update: `PRODUCTION_DEPLOYMENT_CHECKLIST.md`
- Create: `data/production-signoff.md`

#### Step 1: Complete ALL checklist items in PRODUCTION_DEPLOYMENT_CHECKLIST.md
Go through each item, mark as complete with date

#### Step 2: Get sign-offs from required roles:
- DevOps Engineer
- Security Officer
- Database Admin
- Product Owner

#### Step 3: Create final sign-off document
```markdown
# Production Deployment Sign-Off

**Date:** [date]

**Version:** [commit SHA]

**Environment:** Production

**Sign-offs:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| DevOps Engineer | | | |
| Security Officer | | | |
| Database Admin | | | |
| Product Owner | | | |

**Deployment ID:** [deployment ID if any]

**Production URL:** [URL]

**Monitoring Dashboard:** [link]

**Rollback Plan:** [link]

✅ All tasks completed
✅ All tests passing
✅ Documentation complete
✅ Team trained
✅ Ready for production traffic
```

#### Step 4: Archive all test reports and validation results

#### Step 5: Update project status to "Production Ready" in README

---

## Post-Implementation Checklist

After completing all 44 tasks:

1. Run final verification: `node verify-production-readiness.js`
2. Check git status: all tasks should have commits
3. Review documentation: all docs files created and populated
4. Verify no sensitive data in git: `git grep -i "password\|secret\|token"`
5. Create final summary report with links to all deliverables

---

**Total Tasks:** 44

**Estimated Time:** 16-24 hours depending on environment setup

**Success Criteria:** All tasks completed, all tests passing, documentation complete, team trained, production deployment successful and stable for 24 hours.

---

**Notes:**
- Use `superpowers:test-driven-development` for implementation tasks whenever applicable
- Commit frequently with descriptive messages
- Run verification scripts after each phase
- Don't proceed to next phase if current phase has unresolved failures
- Always preserve backups before database operations
- Never commit credentials or secrets to git
