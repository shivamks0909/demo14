# Fix Automated Test Runner TypeScript Compatibility

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the automated test runner so it can execute TypeScript modules by adding ts-node runtime transpilation with proper configuration.

**Architecture:** Add ts-node as a dev dependency, create a CommonJS-compatible tsconfig for scripts, and update package.json to run the test runner through ts-node. This allows the existing JavaScript test runner to import TypeScript modules without pre-compilation.

**Tech Stack:** Node.js, TypeScript, ts-node, CommonJS modules

---

## File Structure

**Files to modify:**
- `package.json` - Add test:runner script and dev dependency
- `tsconfig.scripts.json` - New file: CommonJS config for script execution
- `scripts/automated-test-runner.js` - May need minor adjustments for CJS compatibility

---

### Task 1: Install ts-node and TypeScript runtime

**Files:**
- Modify: `package.json` (devDependencies section)

- [ ] **Step 1: Check if ts-node is already installed**

```bash
npm list ts-node typescript
```

Expected: One of:
- Empty (not installed) → proceed to Step 2
- Version output (already installed) → skip to Task 2

- [ ] **Step 2: Install ts-node and ensure TypeScript is present**

```bash
npm install -D ts-node typescript
```

Verify installation:

```bash
npm list ts-node typescript
```

Expected output should show both packages with versions.

- [ ] **Step 3: Commit the dependency changes**

```bash
git add package.json package-lock.json
git commit -m "chore: add ts-node and typescript for script execution"
```

---

### Task 2: Create script-specific TypeScript configuration

**Files:**
- Create: `tsconfig.scripts.json`

- [ ] **Step 1: Create tsconfig.scripts.json with CommonJS settings**

Write this exact content to `tsconfig.scripts.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "noEmit": true,
    "esModuleInterop": true
  },
  "include": ["scripts/**/*.js", "scripts/**/*.ts", "lib/**/*.ts"]
}
```

- [ ] **Step 2: Commit the configuration file**

```bash
git add tsconfig.scripts.json
git commit -m "feat: add tsconfig.scripts.json for CommonJS compatibility"
```

---

### Task 3: Update package.json with test runner script

**Files:**
- Modify: `package.json` (scripts section)

- [ ] **Step 1: Add test:runner script to package.json**

Open `package.json` and locate the `"scripts"` section. Add the `test:runner` script:

```json
{
  "name": "1234",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "seed": "node seed-db.js",
    "test:runner": "ts-node --project tsconfig.scripts.json scripts/automated-test-runner.js"
  },
  ...
}
```

- [ ] **Step 2: Verify script syntax**

```bash
npm run test:runner -- --help 2>&1 | head -5
```

Expected: Should show ts-node help or script usage (not a "command not found" error). If it shows an error about the file, that's expected next.

- [ ] **Step 3: Commit the script addition**

```bash
git add package.json
git commit -m "feat: add test:runner script using ts-node"
```

---

### Task 4: Test runner execution and validation

**Files:**
- Test: `scripts/automated-test-runner.js` execution

- [ ] **Step 1: Verify prerequisites are running**

Ensure the following are running in separate terminals:
- Database is seeded: `npm run seed` (completed successfully)
- Dev server: `npm run dev` (should be running on http://localhost:3000)

Check dev server:

```bash
curl -s http://localhost:3000 -o /dev/null -w "%{http_code}\n"
```

Expected: `200` or `302` (any valid HTTP response)

- [ ] **Step 2: Execute the test runner**

```bash
npm run test:runner
```

Expected output:
- Should NOT show "Cannot find module '../lib/unified-db'"
- Should connect to database and start testing projects
- May fail on actual tests if DB not properly seeded, but should NOT fail on module loading

**Acceptable early exit messages:**
- Database connection errors (can be fixed later)
- "No active projects found" (need to seed data)
- HTTP connection failures (dev server not running)

**Unacceptable (Phase 1 failure):**
- `Error: Cannot find module '../lib/unified-db'`
- `Error: Cannot find module './insforge-server'`
- Any MODULE_RESOLUTION error

- [ ] **Step 3: If module errors persist, diagnose**

Check ts-node can resolve the TypeScript imports:

```bash
npx ts-node --project tsconfig.scripts.json -e "const { getUnifiedDb } = require('../lib/unified-db'); console.log('OK');"
```

Expected: `OK` (no error)

If error, verify file paths and tsconfig.scripts.json include patterns.

- [ ] **Step 4: Commit test results (even if tests fail, module loading must work)**

```bash
git add .
git commit -m "test: verify automated test runner loads modules successfully"
```

---

### Task 5: Phase 2 - Add error handling and validation (Optional enhancement)

**Note:** This task can be deferred if Phase 1 succeeded. Only implement if time permits.

**Files:**
- Modify: `scripts/automated-test-runner.js`

- [ ] **Step 1: Add better error messages for database connectivity**

Wrap the `getUnifiedDb()` call with clear error guidance:

```javascript
// Around line 59-60, replace with:
let dbSource;
try {
  const { database: db, source } = await getUnifiedDb();
  dbSource = source;
  console.log(`🔗 Connected to DB source: ${dbSource}\n`);
} catch (dbError) {
  console.error('\n❌ Database connection failed:');
  console.error('   ', dbError.message);
  console.error('\n💡 Troubleshooting:');
  console.error('   1. Verify .env.local has DATABASE_URL or InsForge credentials');
  console.error('   2. Run database seed: npm run seed');
  console.error('   3. Check that dev server is running: npm run dev');
  console.error('   4. Verify InsForge connectivity if using cloud DB');
  process.exit(1);
}
```

- [ ] **Step 2: Add project validation**

After fetching projects (around line 63-65), add:

```javascript
if (projects.length === 0) {
  console.warn('⚠️  No active projects found in database.');
  console.warn('   Run "npm run seed" to create test projects.');
  process.exit(1);
}
```

- [ ] **Step 3: Commit Phase 2 improvements**

```bash
git add scripts/automated-test-runner.js
git commit -m "feat(test-runner): add improved error handling and validation"
```

---

### Task 6: Phase 3 - Convert test runner to TypeScript (Future enhancement)

**Note:** This is a longer-term improvement, not required for immediate functionality. Mark as separate task for future work.

**Files:**
- Create: `scripts/automated-test-runner.ts`
- (Optional) Remove: `scripts/automated-test-runner.js` after migration

**Defer this phase** until after the basic functionality is confirmed working.

---

## Verification Checklist

After completing tasks, verify:

- [ ] `npm run test:runner` executes without module resolution errors
- [ ] Test runner connects to database (insforge or sqlite)
- [ ] Test runner discovers projects and runs tests (even if tests fail, infrastructure works)
- [ ] Proper exit codes: 0 for success, 1 for failure
- [ ] All commits are meaningful with clear messages
- [ ] `tsconfig.scripts.json` exists and includes correct compiler options

## Rollback

If issues persist after Phase 1:

1. Verify ts-node installation: `npx ts-node --version`
2. Check tsconfig.scripts.json path resolution: `npx ts-node --project tsconfig.scripts.json -e "console.log(require.resolve('../lib/unified-db'))"`
3. As a temporary fallback, use direct DB test: `node test-routing-direct.js` (if available)
4. Check dev server logs for TypeScript compilation errors

## Success Criteria

**Minimum viable (Phase 1):**
- Test runner loads TypeScript modules without "Cannot find module" errors
- Database connection established successfully
- Test execution begins (even if some tests fail)

**Full success (Phase 2):**
- Clear error messages when prerequisites not met
- Validation of project data before testing
- Helpful troubleshooting guidance in error output
- Total execution time < 2 minutes for 5 active projects

---

## Implementation Notes

**Why ts-node?**
- Zero-compilation step, immediate execution
- Works with existing JavaScript test runner (no rewrite needed)
- Compatible with Next.js TypeScript configuration when using separate tsconfig
- Lower maintenance burden than pre-compilation approach

**Why CommonJS config?**
- The test runner uses `require()` statements (CommonJS)
- Next.js tsconfig uses ESNext for bundler mode
- Using `--project tsconfig.scripts.json` overrides module system for script execution only

**Path resolution:**
- The test runner is in `scripts/` directory requiring `../lib/unified-db`
- ts-node with `moduleResolution: "node"` resolves .ts extensions automatically
- No need to change import paths or file extensions

---

Plan created: 2026-03-31  
Estimated completion: 30-45 minutes (Phase 1 + Phase 2)
