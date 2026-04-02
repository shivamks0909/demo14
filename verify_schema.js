const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

async function verifySchema() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to InsForge\n');

    const tables = [
      'users',
      'projects',
      'suppliers',
      'responses',
      'supplier_project_links',
      'callback_logs',
      'callback_events',
      's2s_config',
      's2s_logs',
      'audit_logs'
    ];

    console.log('Checking required tables:\n');

    for (const table of tables) {
      const res = await client.query(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1",
        [table]
      );
      const exists = res.rows[0].count > 0;
      console.log(`${exists ? '✅' : '❌'} ${table}`);
    }

    console.log('\nChecking responses table columns:');
    const cols = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'responses' ORDER BY ordinal_position"
    );
    const requiredCols = [
      's2s_verified',
      's2s_verified_at',
      'oi_session',
      's2s_token',
      'client_pid'
    ];

    const colNames = cols.rows.map(r => r.column_name);
    for (const col of requiredCols) {
      const exists = colNames.includes(col);
      console.log(`${exists ? '✅' : '❌'} responses.${col}`);
    }

    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verifySchema();
