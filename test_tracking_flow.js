const http = require('http');
const https = require('https');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const TEST_UID = 'test_user_trackingflow_' + Date.now();
const START_URL = `http://localhost:3000/start/MTkxNkAyOA==?uid=${TEST_UID}`;

async function followRedirects(url, maxRedirects = 10) {
  let currentUrl = url;
  let redirectCount = 0;
  const history = [];

  while (redirectCount < maxRedirects) {
    const result = await new Promise((resolve, reject) => {
      const lib = currentUrl.startsWith('https') ? https : http;
      const req = lib.get(currentUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        resolve({ statusCode: res.statusCode, location: res.headers.location, url: currentUrl });
      });
      req.on('error', reject);
      req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    });

    history.push({ url: result.url, status: result.statusCode });
    console.log(`[${result.statusCode}] ${result.url}`);

    if (result.statusCode >= 300 && result.statusCode < 400 && result.location) {
      // Handle relative redirects
      if (result.location.startsWith('/')) {
        const parsed = new URL(currentUrl);
        currentUrl = `${parsed.protocol}//${parsed.host}${result.location}`;
      } else {
        currentUrl = result.location;
      }
      redirectCount++;
    } else {
      break;
    }
  }

  return { finalUrl: currentUrl, history };
}

async function checkResponseTable() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query(
    `SELECT id, uid, status, project_code, oi_session, created_at FROM responses WHERE uid = $1`,
    [TEST_UID]
  );
  await client.end();
  return res.rows;
}

async function run() {
  console.log('='.repeat(60));
  console.log('TRACKING FLOW TEST');
  console.log('='.repeat(60));
  console.log(`Test UID: ${TEST_UID}`);
  console.log(`Start URL: ${START_URL}`);
  console.log('\n--- Redirect Chain ---');

  const { finalUrl, history } = await followRedirects(START_URL);

  console.log('\n--- Final Landing ---');
  console.log(`Final URL: ${finalUrl}`);

  console.log('\n--- Checking Responses Table (before) ---');
  let rows = await checkResponseTable();
  if (rows.length === 0) {
    console.log('No response record found yet. Waiting 2s...');
    await new Promise(r => setTimeout(r, 2000));
    rows = await checkResponseTable();
  }

  if (rows.length > 0) {
    console.log('✅ Response record FOUND in database:');
    console.log(JSON.stringify(rows, null, 2));
  } else {
    console.log('❌ No response record found for this UID.');
  }

  console.log('\n='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Redirect hops: ${history.length}`);
  console.log(`Final destination: ${finalUrl}`);
  console.log(`Response table updated: ${rows.length > 0 ? 'YES' : 'NO'}`);
}

run().catch(console.error);
