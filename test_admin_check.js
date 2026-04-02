const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

async function checkAdmin() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to InsForge\n');

    const result = await client.query(
      'SELECT id, email, name, role, status FROM users WHERE email = $1',
      ['admin@insforge.com']
    );

    if (result.rows.length > 0) {
      console.log('✅ Admin user found:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log('❌ Admin user NOT found');
    }

    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAdmin();
