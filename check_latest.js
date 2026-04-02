const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

async function checkLatest() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to InsForge\n');

    const res = await client.query(
      'SELECT id, uid, oi_session, s2s_token, client_pid, status, project_code FROM responses ORDER BY created_at DESC LIMIT 1'
    );

    if (res.rows.length > 0) {
      console.log('Latest response:');
      console.log(JSON.stringify(res.rows[0], null, 2));
    } else {
      console.log('No responses found in database');
    }

    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkLatest();
