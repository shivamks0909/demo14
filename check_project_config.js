const { Client } = require('pg');
const crypto = require('crypto');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkProject() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check project test23
    const projectRes = await client.query(
      'SELECT project_code, base_url, status, oi_prefix, client_pid_param, client_uid_param FROM projects WHERE project_code = $1',
      ['test23']
    );

    console.log('📋 Project configuration for test23:');
    if (projectRes.rows.length === 0) {
      console.log('   ❌ Project NOT FOUND in database');
    } else {
      const p = projectRes.rows[0];
      console.log(`   project_code: ${p.project_code}`);
      console.log(`   base_url: ${p.base_url}`);
      console.log(`   status: ${p.status}`);
      console.log(`   oi_prefix: ${p.oi_prefix || '(not set)'}`);
      console.log(`   client_pid_param: ${p.client_pid_param || '(not set)'}`);
      console.log(`   client_uid_param: ${p.client_uid_param || '(not set)'}`);

      // Validate base_url
      try {
        new URL(p.base_url);
        console.log('   ✅ base_url is valid absolute URL');
      } catch (e) {
        console.log('   ❌ base_url is INVALID - must be full URL starting with http:// or https://');
      }
    }

    // Also check if supplier exists
    const supplierRes = await client.query(
      'SELECT supplier_token, name FROM suppliers WHERE supplier_token = $1 AND status = $2',
      ['gfgf', 'active']
    );
    console.log('\n📋 Supplier check:');
    if (supplierRes.rows.length === 0) {
      console.log('   ⚠️ Supplier gfgf not found (optional but recommended)');
      console.log('   All suppliers:');
      const allSuppliers = await client.query('SELECT supplier_token, name, status FROM suppliers');
      allSuppliers.rows.forEach(s => {
        console.log(`      - ${s.supplier_token} (${s.name}) - ${s.status}`);
      });
    } else {
      const s = supplierRes.rows[0];
      console.log(`   ✅ Supplier found: ${s.supplier_token} (${s.name})`);
    }

    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Database error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

checkProject();
