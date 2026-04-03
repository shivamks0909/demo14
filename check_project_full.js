require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const crypto = require('crypto');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkFull() {
  try {
    await client.connect();
    console.log('✅ Connected\n');

    // Get full project data
    const projRes = await client.query('SELECT * FROM projects WHERE project_code = $1', ['test23']);
    console.log('📋 Full project data for test23:');
    if (projRes.rows.length === 0) {
      console.log('   ❌ Project NOT FOUND');
      return;
    }
    const project = projRes.rows[0];
    console.log(JSON.stringify(project, null, 2));

    // Check pid_prefix
    console.log('\n🔍 PID Configuration:');
    console.log(`   pid_prefix: "${project.pid_prefix}"`);
    console.log(`   pid_counter: ${project.pid_counter}`);
    console.log(`   pid_padding: ${project.pid_padding}`);

    // Simulate the insert that TrackingService does
    console.log('\n🧪 Simulating response insert...');
    const sessionToken = crypto.randomUUID();
    const validatedUid = 'uid_123';
    const deviceType = 'Desktop';
    const ip = '127.0.0.1';
    const userAgent = 'Test-Agent/1.0';
    const supplierToken = 'gfgf';

    const insertSql = `
      INSERT INTO responses (
        project_id, project_code, project_name,
        uid, client_pid, clickid, oi_session, session_token,
        status, ip, user_agent, device_type, supplier_token,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      project.id,
      project.project_code,
      project.project_name,
      validatedUid,
      null, // clientPid
      sessionToken,
      sessionToken,
      sessionToken,
      'in_progress',
      ip,
      userAgent,
      deviceType,
      supplierToken,
      new Date().toISOString()
    ];

    try {
      const insertRes = await client.query(insertSql, values);
      console.log('   ✅ Insert succeeded!');
      console.log('   Inserted ID:', insertRes.rows[0].id);

      // Clean up
      await client.query('DELETE FROM responses WHERE id = $1', [insertRes.rows[0].id]);
      console.log('   🗑️ Cleaned up test record');
    } catch (insertErr) {
      console.error('   ❌ Insert FAILED:');
      console.error('   Code:', insertErr.code);
      console.error('   Message:', insertErr.message);
      console.error('   Detail:', insertErr.detail);
      console.error('   Hint:', insertErr.hint);
      console.error('   Where:', insertErr.where);
    }

    await client.end();
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

checkFull();
