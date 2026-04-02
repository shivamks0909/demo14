const { Client } = require('pg');

const client = new Client({
  host: '6dt6nyi6.us-east.database.insforge.app',
  port: 5432,
  database: 'insforge',
  user: 'postgres',
  password: '4ab5b1b8285f16fb0cbc6071ffa26100',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(async () => {
    console.log('? Connected to InsForge database!');
    
    try {
      // List existing tables
      const tableResult = await client.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
      );
      console.log('\nExisting tables:');
      if (tableResult.rows.length === 0) {
        console.log('  (none found)');
      } else {
        tableResult.rows.forEach(row => console.log('  -', row.tablename));
      }
      
      // Check if our required tables exist
      const tables = tableResult.rows.map(r => r.tablename);
      const requiredTables = ['clients', 'projects', 'responses'];
      const missingTables = requiredTables.filter(t => !tables.includes(t));
      
      if (missingTables.length > 0) {
        console.log('\n? Missing tables:', missingTables.join(', '));
        console.log('   Run the migration script to create them.');
      } else {
        console.log('\n? All required tables exist!');
      }
    } catch (err) {
      console.error('Error checking tables:', err.message);
    } finally {
      await client.end();
    }
  })
  .catch(err => {
    console.error('? Connection failed:', err.message);
    process.exit(1);
  });
