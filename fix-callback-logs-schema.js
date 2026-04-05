const Database = require('better-sqlite3');
const db = new Database('data/local.db');

// Add missing columns to callback_logs if they don't exist
const columnsToAdd = [
  { name: 'clickid', type: 'TEXT' },
  { name: 'type', type: 'TEXT' },
  { name: 'status_mapped', type: 'TEXT' },
  { name: 'response_code', type: 'INTEGER' },
  { name: 'response_body', type: 'TEXT' },
  { name: 'latency_ms', type: 'INTEGER' },
  { name: 'raw_query', type: 'TEXT' },
  { name: 'ip_address', type: 'TEXT' },
  { name: 'user_agent', type: 'TEXT' },
  { name: 'success', type: 'INTEGER' },
  { name: 'error_message', type: 'TEXT' }
];

for (const col of columnsToAdd) {
  try {
    db.exec(`ALTER TABLE callback_logs ADD COLUMN ${col.name} ${col.type}`);
    console.log(`Added column: ${col.name}`);
  } catch (e) {
    // Column already exists
  }
}

// Check if audit_logs table exists
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='audit_logs'").all();
if (tables.length === 0) {
  console.log('Creating audit_logs table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      event_type TEXT,
      payload TEXT,
      ip TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT datetime('now')
    )
  `);
} else {
  console.log('audit_logs table exists');
}

// Verify callback_logs schema
console.log('\n=== callback_logs columns ===');
const cols = db.prepare('PRAGMA table_info(callback_logs)').all();
cols.forEach(c => console.log(`  ${c.name} (${c.type})`));

db.close();
console.log('\nSchema migration complete!');
