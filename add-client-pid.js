const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

async function addClientPid() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to InsForge\n');

    console.log('Adding responses.client_pid column...');
    await client.query(`
      ALTER TABLE responses
      ADD COLUMN IF NOT EXISTS client_pid TEXT
    `);
    console.log('✅ Added client_pid column');

    await client.end();
    console.log('\n✓ Migration complete');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addClientPid();
