#!/usr/bin/env node
/**
 * Database Connection Validation Test
 * Tests InsForge connection and SQLite fallback
 * Generates report: data/db-connection-status.txt
 */

const fs = require('fs');
const path = require('path');

// Load environment from .env file
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    });
  }
}

async function testInsForge() {
  try {
    const { createClient } = require('@insforge/sdk');
    const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
    const apiKey = process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_ANON_KEY;

    if (!baseUrl || !apiKey) {
      return { success: false, reason: 'NEXT_PUBLIC_INSFORGE_URL or INSFORGE_API_KEY not set' };
    }

    const client = createClient({ baseUrl, anonKey: apiKey });

    // Test query - use database property
    const result = await client.database.from('clients').select('*').limit(1);

    if (result.error) throw result.error;

    return {
      success: true,
      source: 'insforge',
      url: baseUrl,
      result: result.data ? `Found ${result.data.length} clients` : 'Connected (no data)'
    };
  } catch (err) {
    return {
      success: false,
      source: 'insforge',
      error: err.message || String(err)
    };
  }
}

function testSQLite() {
  try {
    const Database = require('better-sqlite3');
    const dataDir = path.join(process.cwd(), 'data');
    const dbPath = path.join(dataDir, 'test_local.db');

    // Check if file exists
    if (!fs.existsSync(dbPath)) {
      return { exists: false, success: false, reason: 'Database file not found' };
    }

    const db = new Database(dbPath);

    // Test query
    const row = db.prepare('SELECT 1 as test').get();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

    db.close();

    return {
      exists: true,
      success: true,
      source: 'sqlite',
      path: dbPath,
      test: row,
      tables: tables.length
    };
  } catch (err) {
    return {
      exists: false,
      success: false,
      source: 'sqlite',
      error: err.message || String(err)
    };
  }
}

async function main() {
  // Load .env only if InsForge variables are not defined at all (not even empty string)
  // This allows explicit clearing via `NEXT_PUBLIC_INSFORGE_URL=` to work
  const insforgeUrlDefined = typeof process.env.NEXT_PUBLIC_INSFORGE_URL !== 'undefined';
  const insforgeKeyDefined = typeof process.env.INSFORGE_API_KEY !== 'undefined' || typeof process.env.NEXT_PUBLIC_ANON_KEY !== 'undefined';

  if (!insforgeUrlDefined && !insforgeKeyDefined) {
    loadEnv();
  }

  const timestamp = new Date().toISOString();
  const dbPath = path.join(process.cwd(), 'data', 'test_local.db');
  const dbExists = fs.existsSync(dbPath);
  const hasInsForge = !!(process.env.NEXT_PUBLIC_INSFORGE_URL && (process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_ANON_KEY));

  // Test both connections
  const insforgeResult = hasInsForge ? await testInsForge() : { success: false, error: 'Not configured' };
  const sqliteResult = testSQLite();

  // Determine overall status
  let overallStatus = 'NEEDS_ATTENTION';
  if (hasInsForge && insforgeResult.success) {
    overallStatus = 'READY';
  } else if (sqliteResult.success) {
    overallStatus = 'READY';
  }

  // Generate report in exact specified format
  const report = `Database Connection Validation Report
Generated: ${timestamp}

InsForge Connection:
- NEXT_PUBLIC_INSFORGE_URL set: ${hasInsForge ? 'YES' : 'NO'}
- Primary test result: ${hasInsForge ? (insforgeResult.success ? 'PASS' : 'FAIL') : 'SKIPPED'}
${hasInsForge && insforgeResult.error && !insforgeResult.success ? `- Error (if failed): ${insforgeResult.error}` : ''}

SQLite Fallback:
- Database file exists: ${dbExists ? 'YES' : 'NO'}
- Fallback test result: ${sqliteResult.success ? 'PASS' : 'FAIL'}
- Connected to: data/test_local.db

Connection Pool Configuration:
- Pool size: From InsForge SDK (default)
- Timeout: From InsForge SDK (default)
- Local Fallback: better-sqlite3 (WAL mode)
- Initialization: Automatic via lib/db.ts

Overall Status: ${overallStatus}
`;

  // Write report
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(path.join(dataDir, 'db-connection-status.txt'), report);

  console.log(report);
  console.log(`📄 Report saved to: data/db-connection-status.txt`);

  // Exit code: 0 if ready, 1 if needs attention
  const success = overallStatus === 'READY';
  process.exit(success ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
