require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const http = require('http');

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Step 1: Get recent in_progress responses
  const res = await client.query(
    "SELECT id, oi_session, status, uid, project_code FROM responses WHERE status = 'in_progress' ORDER BY created_at DESC LIMIT 3"
  );
  console.log('--- Recent in_progress responses ---');
  console.log(JSON.stringify(res.rows, null, 2));

  if (res.rows.length === 0) {
    console.log('\n[!] No in_progress responses. Creating a fresh test entry first...');

    // Create a test response via start URL
    const testUid = 'callback_fix_test_' + Date.now();
    await new Promise((resolve, reject) => {
      http.get('http://localhost:3000/start/MjQzOEAyOA==?uid=' + testUid, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
        console.log('Start response:', r.statusCode);
        r.resume();
        r.on('end', resolve);
      }).on('error', reject);
    });

    await new Promise(r => setTimeout(r, 2000));

    const res2 = await client.query(
      "SELECT id, oi_session, status, uid, project_code FROM responses WHERE uid = $1",
      [testUid]
    );
    console.log('New response:', JSON.stringify(res2.rows, null, 2));
    if (res2.rows.length > 0) res.rows.push(res2.rows[0]);
  }

  if (res.rows.length > 0) {
    const row = res.rows[0];
    const session = row.oi_session;
    console.log('\n--- Testing callback ---');
    console.log('Session (clickid):', session);
    console.log('Current status:', row.status);

    const callbackUrl = 'http://localhost:3000/api/callback?clickid=' + session + '&status=terminate';
    console.log('Callback URL:', callbackUrl);

    const result = await new Promise((resolve, reject) => {
      http.get(callbackUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
        let data = '';
        r.on('data', chunk => data += chunk);
        r.on('end', () => resolve({ httpStatus: r.statusCode, body: data }));
      }).on('error', reject);
    });

    console.log('\nCallback HTTP Status:', result.httpStatus);
    console.log('Callback Response:', result.body);

    // Check if status updated
    await new Promise(r => setTimeout(r, 1000));
    const updated = await client.query('SELECT status FROM responses WHERE id = $1', [row.id]);
    console.log('\nResponse status AFTER callback:', updated.rows[0]?.status);

    if (updated.rows[0]?.status === 'terminate') {
      console.log('\n✅ SUCCESS: Status updated to terminate!');
    } else {
      console.log('\n❌ FAIL: Status NOT updated, still:', updated.rows[0]?.status);
    }
  }

  await client.end();
}

run().catch(console.error);
