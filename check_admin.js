const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

async function checkAdmin() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to InsForge\n');

    const result = await client.query(
      'SELECT id, email, name, role, status, password FROM users WHERE email = $1',
      ['admin@insforge.com']
    );

    if (result.rows.length > 0) {
      console.log('✅ Admin user found:');
      const user = result.rows[0];
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Status: ${user.status}`);
      console.log(`  Password hash: ${user.password.substring(0, 30)}...`);
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
