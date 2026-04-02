#!/usr/bin/env node
// Test script for database connectivity

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load environment from .env file
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match) {
        env[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    });
    Object.assign(process.env, env);
    console.log('✅ Loaded environment from .env');
  }
}

// Check InsForge configuration
function checkInsForgeConfig() {
  const url = process.env.NEXT_PUBLIC_INSFORGE_URL;
  const apiKey = process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_ANON_KEY;

  if (!url || !apiKey) {
    console.log('❌ InsForge configuration incomplete:');
    if (!url) console.log('   - NEXT_PUBLIC_INSFORGE_URL not set');
    if (!apiKey) console.log('   - INSFORGE_API_KEY or NEXT_PUBLIC_ANON_KEY not set');
    return false;
  }

  console.log('✅ InsForge configuration found:');
  console.log(`   URL: ${url}`);
  console.log(`   API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'N/A'}`);
  return true;
}

// Test SQLite database existence
function checkSQLiteDb() {
  const dbPath = path.join(process.cwd(), 'data', 'test_local.db');
  const exists = fs.existsSync(dbPath);
  if (exists) {
    const stats = fs.statSync(dbPath);
    console.log(`✅ SQLite database exists: ${dbPath} (${stats.size} bytes)`);
  } else {
    console.log(`❌ SQLite database not found: ${dbPath}`);
  }
  return exists;
}

// Run esbuild-based test
function runTest() {
  try {
    console.log('\n🔍 Running connection test...\n');
    const result = execSync('node --loader ts-node/esm scripts/test-connection.ts', {
      encoding: 'utf-8',
      stdio: 'inherit'
    });
    console.log(result);
    return { success: true, output: result };
  } catch (error) {
    console.error('❌ Test failed with exit code:', error.status || 1);
    if (error.stdout) console.error('Output:', error.stdout);
    if (error.stderr) console.error('Error:', error.stderr);
    return { success: false, output: error.stdout || '', error: error.stderr || error.message };
  }
}

// Main execution
console.log('=== Database Connectivity Test ===\n');

console.log('1. Checking InsForge configuration:');
const hasInsForge = checkInsForgeConfig();

console.log('\n2. Checking SQLite database:');
const hasSQLite = checkSQLiteDb();

console.log('\n3. Running connection test:');
const testResult = runTest();

// Generate report
const timestamp = new Date().toISOString();
const report = `Database Connection Status Report
Generated: ${timestamp}

InsForge Connection:
- Configured: ${hasInsForge ? 'YES' : 'NO'}
- Connection Test: ${testResult.success ? 'PASS' : 'FAIL'}
- Error (if any): ${testResult.success ? 'None' : testResult.error || 'Connection failed'}

SQLite Fallback:
- SQLite DB Exists: ${hasSQLite ? 'YES' : 'NO'}
- Fallback Test: Test included in main connection test
- Expected DB Path: data/test_local.db

Connection Pool Configuration:
- Pool size: From InsForge SDK (default)
- Timeout: From InsForge SDK (default)

Notes:
- Project uses unified-db.ts with automatic fallback to SQLite
- On Vercel, only InsForge is used (SQLite disabled)
- SQLite database initialized with schema via lib/db.ts
${!hasInsForge ? '\n⚠️  InsForge not configured - connection test likely used SQLite fallback' : ''}
${!hasSQLite ? '\n⚠️  SQLite database missing - will need schema migration if fallback is needed' : ''}
`;

// Write report
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
fs.writeFileSync(path.join(dataDir, 'db-connection-status.txt'), report.trim());
console.log('\n📄 Report saved to: data/db-connection-status.txt');

// Exit with appropriate code
process.exit(testResult.success ? 0 : 1);
