const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:f6e75a96bb4301794302c738b94ab107@3gkhhr9f.us-east.database.insforge.app:5432/insforge?sslmode=require'
});
async function main() {
  await client.connect();
  // Check constraints on responses table
  const res = await client.query(`
    SELECT conname, pg_get_constraintdef(oid) as constraintdef
    FROM pg_constraint
    WHERE conrelid = 'responses'::regclass AND contype = 'c'
  `);
  console.log('=== check constraints on responses ===');
  res.rows.forEach(r => console.log(r.conname + ': ' + r.constraintdef));
  await client.end();
}
main().catch(e => { console.error('Error:', e.message); process.exit(1); });
