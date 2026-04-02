const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

async function checkResponse() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to InsForge\n');

    const res = await client.query(
      'SELECT id, oi_session, s2s_token, client_pid, status, uid FROM responses WHERE uid = $1 ORDER BY created_at DESC LIMIT 1',
      ['test_user_123']
    );

    if (res.rows.length > 0) {
      console.log('Latest response for test_user_123:');
      console.log(JSON.stringify(res.rows[0], null, 2));
    } else {
      console.log('No response found for test_user_123');
    }

    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkResponse();
