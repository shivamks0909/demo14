const https = require('https');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function runLiveTest() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('--- Fetching recent in_progress response from DB ---');
  const res = await client.query(
    "SELECT id, oi_session, status, uid, project_code FROM responses WHERE status = 'in_progress' ORDER BY created_at DESC LIMIT 1"
  );

  if (res.rows.length === 0) {
    console.log('No in_progress responses found in the database. Please start a survey first.');
    await client.end();
    return;
  }

  const row = res.rows[0];
  const session = row.oi_session;
  console.log('Testing with Session (clickid):', session);
  console.log('Current status:', row.status);

  const liveUrl = `https://new12-main.vercel.app/api/callback?clickid=${session}&status=terminate`;
  console.log('Testing Live Callback URL:', liveUrl);

  const result = await new Promise((resolve, reject) => {
    https.get(liveUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
      let data = '';
      r.on('data', chunk => data += chunk);
      r.on('end', () => resolve({ httpStatus: r.statusCode, body: data }));
    }).on('error', reject);
  });

  console.log('\nLive Callback HTTP Status:', result.httpStatus);
  console.log('Live Callback Response:', result.body);

  // Poll for status update in DB
  console.log('\nVerifying status update in DB...');
  let updatedStatus = '';
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const updated = await client.query('SELECT status FROM responses WHERE id = $1', [row.id]);
    updatedStatus = updated.rows[0]?.status;
    if (updatedStatus === 'terminate') break;
    console.log(`Attempt ${i+1}: Status is still ${updatedStatus}...`);
  }

  if (updatedStatus === 'terminate') {
    console.log('\n✅ LIVE SUCCESS: Status updated to terminate on production!');
  } else {
    console.log('\n❌ LIVE FAIL: Status NOT updated on production, still:', updatedStatus);
  }

  await client.end();
}

runLiveTest().catch(console.error);
