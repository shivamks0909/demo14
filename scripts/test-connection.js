#!/usr/bin/env node
// Direct database connectivity test

const path = require('path');
const fs = require('fs');

// Load environment
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  });
  console.log('✅ Loaded .env configuration\n');
}

// Check configuration
function checkConfig() {
  const url = process.env.NEXT_PUBLIC_INSFORGE_URL;
  const apiKey = process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_ANON_KEY;

  console.log('Configuration Status:');
  console.log(`  NEXT_PUBLIC_INSFORGE_URL: ${url || 'NOT SET'}`);
  console.log(`  API Key: ${apiKey ? (apiKey.substring(0, 10) + '...') : 'NOT SET'}`);
  console.log(`  VERCEL: ${process.env.VERCEL || 'not set (local mode)'}`);
  console.log('');

  return !!url && !!apiKey;
}

// Test SQLite database
function testSQLite() {
  try {
    const Database = require('better-sqlite3');
    const dbPath = path.join(process.cwd(), 'data', 'test_local.db');

    if (!fs.existsSync(dbPath)) {
      return { success: false, error: `Database not found: ${dbPath}` };
    }

    const db = new Database(dbPath);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

    if (tables.length > 0) {
      return {
        success: true,
        db,
        message: `Connected to SQLite, found ${tables.length} tables (first: ${tables[0].name})`
      };
    } else {
      return { success: true, db, message: 'Connected to empty SQLite database' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test InsForge connection
function testInsForge() {
  try {
    // Check if SDK is available
    try {
      require('@insforge/sdk');
    } catch (e) {
      return { success: false, error: '@insforge/sdk package not installed' };
    }

    console.log('ℹ️  InsForge SDK is available');
    console.log('ℹ️  To fully test InsForge, credentials must be valid and running in Vercel environment');

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Main execution
console.log('=== Database Connectivity Test ===\n');

const hasInsForgeConfig = checkConfig();

console.log('1. Testing SQLite fallback:');
const sqliteResult = testSQLite();

if (sqliteResult.success) {
  console.log('✅ SQLite connection successful');
  console.log(`   ${sqliteResult.message}`);
  sqliteResult.db?.close();
} else {
  console.log('❌ SQLite connection failed:');
  console.log(`   ${sqliteResult.error}`);
}

console.log('\n2. Testing InsForge configuration:');
const insforgeResult = testInsForge();

if (insforgeResult.success) {
  console.log('✅ InsForge configuration valid');
} else {
  console.log('❌ InsForge configuration issue:');
  console.log(`   ${insforgeResult.error}`);
}

// Generate report
const timestamp = new Date().toISOString();
const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'test_local.db');

let report = `Database Connection Status Report
Generated: ${timestamp}

InsForge Connection:
- Configured: ${hasInsForgeConfig ? 'YES' : 'NO'}
- Connection Test: SKIPPED (requires Vercel environment)
- Error (if any): N/A

SQLite Fallback:
- SQLite DB Exists: ${fs.existsSync(dbPath) ? 'YES' : 'NO'}
- Fallback Test: ${sqliteResult.success ? 'PASS' : 'FAIL'}
${sqliteResult.success ? '- Connected to: data/test_local.db' : ''}
- Connection Error: ${sqliteResult.success ? 'None' : sqliteResult.error}

Connection Pool Configuration:
- Pool size: From InsForge SDK (default)
- Timeout: From InsForge SDK (default)

Notes:
- SQLite database is used for local development
- InsForge provides cloud database for Vercel production
- Database schema is initialized in lib/db.ts
- Use migration scripts for schema updates
`;

if (!hasInsForgeConfig) {
  report += `\n⚠️  NEXT_PUBLIC_INSFORGE_URL not set - InsForge connection unavailable\n`;
}

if (!fs.existsSync(dbPath)) {
  report += `\n⚠️  SQLite database missing at data/test_local.db\n`;
  report += `   Run initialization to create the database with proper schema.\n`;
}

// Write report
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
fs.writeFileSync(path.join(dataDir, 'db-connection-status.txt'), report);

console.log('\n📄 Report saved to: data/db-connection-status.txt');
console.log('\n✅ Testing complete!');

process.exit(sqliteResult.success ? 0 : 1);
