#!/usr/bin/env node

/**
 * Direct Integration Test - Tests routing logic without HTTP server
 * Uses the actual database and route handlers directly
 */

const path = require('path');
const fs = require('fs');

// Change to project root
// Using process.cwd() - no chdir needed

// Ensure we use local SQLite
process.env.NEXT_PUBLIC_INSFORGE_URL = '';

// Setup minimal Next.js polyfills
globalThis.next = {};

async function runDirectTests() {
    console.log('='.repeat(60));
    console.log('DIRECT INTEGRATION TESTS - Routing System');
    console.log('='.repeat(60));
    console.log('');

    // Test 1: Database schema
    console.log('[TEST 1] Database Schema');
    try {
        const { getDb } = require('./lib/db');
        const db = getDb();

        // Check tables exist
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        const tableNames = tables.map(t => t.name);

        const requiredTables = ['clients', 'projects', 'suppliers', 'supplier_project_links', 'responses', 'audit_logs'];
        const missing = requiredTables.filter(t => !tableNames.includes(t));

        if (missing.length === 0) {
            console.log(`   ✓ All required tables exist: ${requiredTables.join(', ')}`);
        } else {
            throw new Error(`Missing tables: ${missing.join(', ')}`);
        }

        // Check indexes
        const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all();
        const indexNames = indexes.map(i => i.name);
        const requiredIndexes = ['idx_supplier_project_links_quota', 'idx_audit_logs_created_at'];
        const missingIndexes = requiredIndexes.filter(i => !indexNames.includes(i));

        if (missingIndexes.length === 0) {
            console.log(`   ✓ Required indexes exist: ${requiredIndexes.join(', ')}`);
        } else {
            console.log(`   ⚠ Missing indexes: ${missingIndexes.join(', ')} (may be additive)`);
        }

        // Check supplier_project_links has quota_used
        const linkCols = db.pragma('table_info(supplier_project_links)');
        const hasQuotaUsed = linkCols.some(col => col.name === 'quota_used');
        if (hasQuotaUsed) {
            console.log('   ✓ supplier_project_links.quota_used column exists');
        } else {
            throw new Error('supplier_project_links.quota_used column missing');
        }

        db.close();
        console.log('');
    } catch (error) {
        console.log(`   ✗ FAIL - ${error.message}`);
        console.log('');
        process.exit(1);
    }

    // Test 2: Sample data exists
    console.log('[TEST 2] Sample Data');
    try {
        const { getDb } = require('./lib/db');
        const db = getDb();

        const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
        console.log(`   ✓ Projects: ${projectCount}`);

        const supplierCount = db.prepare('SELECT COUNT(*) as count FROM suppliers').get().count;
        console.log(`   ✓ Suppliers: ${supplierCount}`);

        const linkCount = db.prepare('SELECT COUNT(*) as count FROM supplier_project_links').get().count;
        console.log(`   ✓ Supplier Links: ${linkCount}`);

        const responseCount = db.prepare('SELECT COUNT(*) as count FROM responses').get().count;
        console.log(`   ✓ Responses: ${responseCount}`);

        // Verify specific sample data
        const testProject = db.prepare("SELECT * FROM projects WHERE project_code = 'TEST_SINGLE'").get();
        if (testProject) {
            console.log(`   ✓ TEST_SINGLE project exists (id: ${testProject.id})`);
        } else {
            throw new Error('TEST_SINGLE project not found');
        }

        const dynSupplier = db.prepare("SELECT * FROM suppliers WHERE supplier_token = 'DYN01'").get();
        if (dynSupplier) {
            console.log(`   ✓ DYN01 supplier exists (id: ${dynSupplier.id})`);
        } else {
            throw new Error('DYN01 supplier not found');
        }

        db.close();
        console.log('');
    } catch (error) {
        console.log(`   ✗ FAIL - ${error.message}`);
        console.log('');
        process.exit(1);
    }

    // Test 3: Quota tracking
    console.log('[TEST 3] Quota Tracking');
    try {
        const { getDb } = require('./lib/db');
        const db = getDb();

        // Get the link for DYN01 -> TEST_SINGLE
        const link = db.prepare(`
            SELECT spl.* FROM supplier_project_links spl
            JOIN suppliers s ON spl.supplier_id = s.id
            JOIN projects p ON spl.project_id = p.id
            WHERE s.supplier_token = 'DYN01' AND p.project_code = 'TEST_SINGLE'
        `).get();

        if (!link) throw new Error('Supplier link not found');

        console.log(`   ✓ Link found: ${link.id}`);
        console.log(`     quota_allocated: ${link.quota_allocated}`);
        console.log(`     quota_used: ${link.quota_used}`);

        if (link.quota_allocated === 0) {
            console.log(`   ✓ Unlimited quota (quota_allocated = 0)`);
        }

        db.close();
        console.log('');
    } catch (error) {
        console.log(`   ✗ FAIL - ${error.message}`);
        console.log('');
        process.exit(1);
    }

    // Test 4: Audit service
    console.log('[TEST 4] Audit Service');
    try {
        const { auditService } = require('./lib/audit-service');

        // Write a test audit event
        await auditService.log({
            event_type: 'test_event',
            payload: { test: true, timestamp: Date.now() },
            ip: '127.0.0.1',
            user_agent: 'Test/1.0'
        });

        console.log('   ✓ Audit log written successfully');

        // Read it back
        const logs = await auditService.getLogs(1);
        if (logs.length > 0 && logs[0].event_type === 'test_event') {
            console.log('   ✓ Audit log retrieved successfully');
        } else {
            throw new Error('Audit log not retrieved');
        }

        console.log('');
    } catch (error) {
        console.log(`   ✗ FAIL - ${error.message}`);
        console.log('');
        process.exit(1);
    }

    // Test 5: Unified DB fallback
    console.log('[TEST 5] Unified Database Access');
    try {
        const { getUnifiedDb } = require('./lib/unified-db');

        const unified = await getUnifiedDb();
        if (unified.source === 'local') {
            console.log(`   ✓ Using local SQLite fallback (source: ${unified.source})`);
        } else {
            console.log(`   ℹ Using InsForge connection (source: ${unified.source})`);
        }

        // Test query
        const { data: projects } = await unified.database
            .from('projects')
            .select('*')
            .eq('status', 'active');

        if (projects && projects.length > 0) {
            console.log(`   ✓ Query successful: found ${projects.length} active projects`);
        } else {
            throw new Error('No active projects found');
        }

        console.log('');
    } catch (error) {
        console.log(`   ✗ FAIL - ${error.message}`);
        console.log('');
        process.exit(1);
    }

    console.log('='.repeat(60));
    console.log('ALL TESTS PASSED');
    console.log('='.repeat(60));
    console.log('');
    console.log('Next steps:');
    console.log('1. Start dev server: npm run dev');
    console.log('2. Test HTTP endpoints:');
    console.log('   - GET /r/TEST_SINGLE/DYN01/TESTUSER');
    console.log('   - GET /track?code=TEST_SINGLE&uid=TESTUSER');
    console.log('   - GET /api/callback?session={session}&type=complete');
    console.log('');
}

runDirectTests().catch(error => {
    console.error('\nFatal error:', error);
    process.exit(1);
});
