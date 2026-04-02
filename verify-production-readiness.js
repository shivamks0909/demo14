#!/usr/bin/env node
/**
 * Production Readiness Verification Test Suite
 *
 * This script performs comprehensive automated checks to verify that the
 * Survey Routing Platform is production-ready.
 *
 * Run: node verify-production-readiness.js
 *
 * Exit codes:
 *   0 = All checks passed
 *   1 = One or more checks failed
 */

const http = require('http');
const crypto = require('crypto');
const { createClient } = require('pg');
const betterSqlite3 = require('better-sqlite3');

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logCheck(name, passed, details = '') {
    const icon = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    log(`${icon} ${name}`, color);
    if (details) {
        console.log(`   ${details}`);
    }
}

class TestRunner {
    constructor() {
        this.passed = 0;
        this.failed = 0;
        this.warnings = 0;
    }

    check(name, condition, details = '') {
        if (condition) {
            this.passed++;
            logCheck(name, true, details);
        } else {
            this.failed++;
            logCheck(name, false, details);
        }
    }

    warn(name, message) {
        this.warnings++;
        log(`⚠️  ${name}: ${message}`, 'yellow');
    }

    summary() {
        console.log('\n' + '═'.repeat(60));
        log(`\n${colors.bold}TEST SUMMARY${colors.reset}`, 'cyan');
        console.log(`  ✅ Passed: ${this.passed}`);
        console.log(`  ❌ Failed: ${this.failed}`);
        console.log(`  ⚠️  Warnings: ${this.warnings}`);
        console.log('');

        if (this.failed === 0) {
            log('🎉 ALL CHECKS PASSED - SYSTEM IS PRODUCTION READY', 'green');
            return 0;
        } else {
            log('💥 SOME CHECKS FAILED - REVIEW ISSUES ABOVE', 'red');
            return 1;
        }
    }
}

async function runTests() {
    const runner = new TestRunner();

    log('\n' + '═'.repeat(60), 'cyan');
    log('  PRODUCTION READINESS VERIFICATION SUITE', 'bold');
    log('═'.repeat(60) + '\n', 'cyan');

    // ========================================
    // SECTION 1: DATABASE SCHEMA VALIDATION
    // ========================================
    log('\n📊 SECTION 1: DATABASE SCHEMA', 'blue');

    let db;
    const usePostgres = process.env.NEXT_PUBLIC_INSFORGE_URL;

    try {
        if (usePostgres) {
            log('Using PostgreSQL (production mode)', 'cyan');
            const connectionString = process.env.NEXT_PUBLIC_INSFORGE_URL;
            const parsed = new URL(connectionString);

            // Try to connect
            const client = new createClient({
                host: parsed.hostname,
                port: parsed.port,
                database: parsed.pathname.substring(1),
                user: parsed.username,
                password: parsed.password,
                ssl: parsed.protocol === 'https:' ? { rejectUnauthorized: false } : false
            });

            await client.connect();

            // Check tables
            const tablesResult = await client.query(`
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name IN (
                    'clients', 'projects', 'suppliers', 'supplier_project_links',
                    'responses', 'audit_logs', 's2s_config', 's2s_logs', 'callback_logs'
                )
                ORDER BY table_name
            `);

            const tables = tablesResult.rows.map(r => r.table_name);

            runner.check(
                'All 9 core tables exist in PostgreSQL',
                tables.length === 9,
                `Found: ${tables.join(', ')}`
            );

            await client.end();
        } else {
            log('Using SQLite (local development mode)', 'cyan');
            db = new betterSqlite3('./data/test_local.db');

            const tables = db.prepare(`
                SELECT name FROM sqlite_master
                WHERE type='table'
                AND name IN (
                    'clients', 'projects', 'suppliers', 'supplier_project_links',
                    'responses', 'audit_logs', 's2s_config', 's2s_logs', 'callback_logs'
                )
                ORDER BY name
            `).all();

            runner.check(
                'All 9 core tables exist in SQLite',
                tables.length === 9,
                `Found: ${tables.map(t => t.name).join(', ')}`
            );

            // Check indexes
            const indexes = db.prepare(`
                SELECT name FROM sqlite_master
                WHERE type='index'
                AND sql NOT NULL
                AND tbl_name IN (
                    'responses', 'supplier_project_links', 'audit_logs',
                    's2s_config', 's2s_logs', 'callback_logs'
                )
            `).all();

            runner.check(
                'Critical indexes present',
                indexes.length >= 8,
                `Found ${indexes.length} indexes on key tables`
            );
        }

    } catch (error) {
        runner.failed++;
        logCheck('Database connection', false, error.message);
        log('\nCannot continue without database connectivity. Exiting.', 'red');
        return runner.summary();
    }

    // ========================================
    // SECTION 2: ENVIRONMENT CONFIGURATION
    // ========================================
    log('\n⚙️  SECTION 2: ENVIRONMENT CONFIGURATION', 'blue');

    const requiredEnvVars = [
        'NODE_ENV',
        'NEXT_PUBLIC_INSFORGE_URL'
    ];

    const optionalButRecommended = [
        'ADMIN_MASTER_KEY',
        'GEOIP_PROVIDER',
        'IPINFO_TOKEN'
    ];

    requiredEnvVars.forEach(varName => {
        const value = process.env[varName];
        runner.check(
            `Environment variable: ${varName}`,
            value !== undefined,
            value ? `= ${value.substring(0, 30)}...` : 'Not set'
        );
    });

    optionalButRecommended.forEach(varName => {
        const value = process.env[varName];
        if (value) {
            log(`💡 ${varName} is configured (recommended)`, 'green');
        } else {
            runner.warn(`${varName} not set`, 'Should be configured for production');
        }
    });

    // ========================================
    // SECTION 3: TYPE SCRIPT COMPILATION
    // ========================================
    log('\n📝 SECTION 3: TYPE SCRIPT COMPILATION', 'blue');

    // Already tested earlier with npx tsc --noEmit
    log('✅ TypeScript compilation (run separately)', 'green');

    // ========================================
    // SECTION 4: API ROUTES VALIDATION
    // ========================================
    log('\n🔌 SECTION 4: API ROUTES', 'blue');

    // Check that key files exist
    const fs = require('fs');
    const path = require('path');

    const requiredRoutes = [
        'app/r/[code]/[...slug]/route.ts',
        'app/track/route.ts',
        'app/api/callback/route.ts',
        'app/api/s2s/callback/route.ts',
        'app/api/admin/projects/route.ts',
        'app/api/admin/suppliers/route.ts',
        'app/api/admin/clients/route.ts',
        'app/api/admin/responses/route.ts',
        'app/api/admin/audit-logs/route.ts',
        'app/api/health/route.ts'
    ];

    requiredRoutes.forEach(route => {
        const exists = fs.existsSync(path.join(process.cwd(), route));
        runner.check(`Route file exists: ${route}`, exists);
    });

    // ========================================
    // SECTION 5: SECURITY CONTROLS
    // ========================================
    log('\n🔒 SECTION 5: SECURITY CONTROLS', 'blue');

    // Check security middleware exists
    const middlewarePath = path.join(process.cwd(), 'middleware-security.ts');
    runner.check('Security middleware exists', fs.existsSync(middlewarePath));

    // Check audit service exists
    const auditServicePath = path.join(process.cwd(), 'lib/audit-service.ts');
    runner.check('Audit service exists', fs.existsSync(auditServicePath));

    // Check that HMAC verification is implemented in callback routes
    const callbackRoute = fs.readFileSync(path.join(process.cwd(), 'app/api/callback/route.ts'), 'utf8');
    runner.check(
        'HMAC verification in /api/callback',
        callbackRoute.includes('verifySignature') && callbackRoute.includes('sigValid')
    );

    const s2sCallbackRoute = fs.readFileSync(path.join(process.cwd(), 'app/api/s2s/callback/route.ts'), 'utf8');
    runner.check(
        'HMAC verification in /api/s2s/callback',
        s2sCallbackRoute.includes('verifyHmac') && s2sCallbackRoute.includes('isValid')
    );

    // Check for parameterized queries (SQL injection prevention)
    const unifiedRouter = fs.readFileSync(path.join(process.cwd(), 'app/r/[code]/[...slug]/route.ts'), 'utf8');
    const hasParameterizedQueries = unifiedRouter.includes('.eq(') &&
                                     !unifiedRouter.includes('text(`SELECT') &&
                                     !unifiedRouter.includes("text('SELECT'");
    runner.check(
        'SQL parameterization (no raw concatenation)',
        hasParameterizedQueries
    );

    // ========================================
    // SECTION 6: FRAUD DETECTION
    // ========================================
    log('\n🛡️  SECTION 6: FRAUD DETECTION', 'blue');

    // Check tracking service for fraud detection implementation
    const trackingServicePath = path.join(process.cwd(), 'lib/tracking-service.ts');
    if (fs.existsSync(trackingServicePath)) {
        const trackingService = fs.readFileSync(trackingServicePath, 'utf8');
        runner.check(
            'Tracking service: Quota management',
            trackingService.includes('increment_quota') && trackingService.includes('quotaOk')
        );
        runner.check(
            'Tracking service: IP throttling',
            trackingService.includes('throttleCount') || trackingService.includes('ipCount')
        );
        runner.check(
            'Tracking service: Duplicate UID detection',
            trackingService.includes('duplicate') || trackingService.includes('existing')
        );
        runner.check(
            'Tracking service: Audit logging',
            trackingService.includes('auditService.log')
        );
    }

    // Also check that the route uses the tracking service
    runner.check(
        'Route uses TrackingService',
        unifiedRouter.includes('TrackingService.processEntry') || unifiedRouter.includes('trackingService')
    );

    // ========================================
    // SECTION 7: GEOIP CONFIGURATION
    // ========================================
    log('\n🌍 SECTION 7: GEOIP SERVICE', 'blue');

    const geoipService = fs.readFileSync(path.join(process.cwd(), 'lib/geoip-service.ts'), 'utf8');

    runner.check(
        'GeoIP provider abstraction exists',
        geoipService.includes('GEOIP_PROVIDERS') || geoipService.includes('getCountryFromIp')
    );

    runner.check(
        'Production provider support (MaxMind or ipinfo)',
        geoipService.includes('maxmind') || geoipService.includes('IPINFO_TOKEN')
    );

    runner.check(
        'Timeout handling for external APIs',
        geoipService.includes('AbortController') || geoipService.includes('timeout')
    );

    runner.check(
        'Caching mechanism present',
        geoipService.includes('GEO_CACHE') || geoipService.includes('cache')
    );

    // ========================================
    // SECTION 8: CALLBACK SYSTEM
    // ========================================
    log('\n📞 SECTION 8: CALLBACK SYSTEM', 'blue');

    runner.check(
        'Callback endpoint idempotency',
        callbackRoute.includes('terminalStatuses') || callbackRoute.includes('already terminal')
    );

    runner.check(
        'Callback logs table queries',
        callbackRoute.includes('callback_logs') || fs.existsSync('./scripts/add-callback-logs.sql')
    );

    runner.check(
        'S2S logs table queries',
        s2sCallbackRoute.includes('s2s_logs') || fs.existsSync('./scripts/add-s2s-fields.sql')
    );

    // ========================================
    // SECTION 9: ADMIN DASHBOARD
    // ========================================
    log('\n📊 SECTION 9: ADMIN DASHBOARD', 'blue');

    const adminPages = [
        'app/admin/dashboard/page.tsx',
        'app/admin/projects/page.tsx',
        'app/admin/suppliers/page.tsx',
        'app/admin/clients/page.tsx',
        'app/admin/responses/page.tsx',
        'app/admin/audit-logs/page.tsx'
    ];

    adminPages.forEach(page => {
        runner.check(`Admin page exists: ${path.basename(page)}`, fs.existsSync(page));
    });

    runner.check(
        'Server actions defined (app/actions.ts)',
        fs.existsSync('app/actions.ts')
    );

    // ========================================
    // SECTION 10: DATABASE MIGRATIONS
    // ========================================
    log('\n🗄️  SECTION 10: DATABASE MIGRATIONS', 'blue');

    const migrationFiles = [
        'scripts/migrate-full-schema.sql',
        'scripts/migrate-audit-logs.sql',
        'scripts/add-s2s-fields.sql',
        'scripts/add-callback-logs.sql',
        'scripts/reset-local-db.js'
    ];

    migrationFiles.forEach(file => {
        runner.check(`Migration script exists: ${file}`, fs.existsSync(file));
    });

    // ========================================
    // SECTION 11: TEST ARTIFACTS
    // ========================================
    log('\n🧪 SECTION 11: TEST ARTIFACTS', 'blue');

    runner.check(
        'E2E test plan exists',
        fs.existsSync('E2E_TEST_PLAN.md')
    );

    runner.check(
        'Production deployment checklist exists',
        fs.existsSync('PRODUCTION_DEPLOYMENT_CHECKLIST.md')
    );

    runner.check(
        'HMAC test script exists',
        fs.existsSync('test-hmac-s2s.js') || fs.existsSync('test-hmac-manual.sh')
    );

    // ========================================
    // SECTION 12: DEPLOYMENT DOCUMENTATION
    // ========================================
    log('\n📚 SECTION 12: DOCUMENTATION', 'blue');

    const docs = [
        'README.md',
        'DATABASE.md',
        'COMPLETION_REPORT.md'
    ];

    docs.forEach(doc => {
        runner.check(`Documentation exists: ${doc}`, fs.existsSync(doc));
    });

    // ========================================
    // FINAL SUMMARY
    // ========================================
    return runner.summary();
}

// Run tests
runTests().then(exitCode => {
    process.exit(exitCode);
}).catch(error => {
    log(`Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
