require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

async function verify() {
  const c = new Client({ connectionString: DATABASE_URL });
  await c.connect();

  // Get all tables
  const tables = await c.query(`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename
  `);
  console.log('Tables in InsForge:');
  tables.rows.forEach(r => console.log('  -', r.tablename));

  // For each table, show columns
  for (const t of tables.rows) {
    const cols = await c.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [t.tablename]);
    console.log(`\n${t.tablename}:`);
    cols.rows.forEach(col => {
      console.log(`  ${col.column_name} ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
  }

  await c.end();
}

verify().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
