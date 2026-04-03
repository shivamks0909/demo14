require('dotenv').config({ path: '.env.local' });
const http = require('http');
const { Client } = require('pg');

const BASE_URL = 'http://localhost:3000';
const PROJECT_CODE = 'MjQzOEAyOA==';
const TEST_UID = 'E2E_FINAL_' + Date.now();

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, data }));
    }).on('error', reject);
  });
}

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('\n[TEST] 1. Creating Project inside System...');
  await client.query(`
    INSERT INTO projects (id, project_code, project_name, base_url, status)
    VALUES (uuid_generate_v4(), $1, 'End-to-End Callback Test', 'https://track.exploresearch.in/survey?uid=[UID]', 'active')
    ON CONFLICT (project_code) DO NOTHING
  `, [PROJECT_CODE]);
  console.log(`✅ Project created successfully. (Code: ${PROJECT_CODE})`);

  console.log(`\n[TEST] 2. Simulating Survey Entry... (Launching Traffic)`);
  const startUrl = `${BASE_URL}/start/${PROJECT_CODE}?uid=${TEST_UID}`;
  await httpGet(startUrl);

  // Wait for async background inserts in start route
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n[TEST] 3. Validation Check #1: Verify Entry Created');
  let result = await client.query('SELECT uid, status FROM responses WHERE uid = $1', [TEST_UID]);
  if(result.rows.length > 0) {
      console.log(`✅ New Entry verified in response table!`);
      console.log(`   -> UID: ${result.rows[0].uid}`);
      console.log(`   -> Status: '${result.rows[0].status}'`);
  } else {
      console.log(`❌ Entry not found!`);
      process.exit(1);
  }

  console.log(`\n[TEST] 4. Simulating Callback... (Hitting Legacy URL)`);
  const callbackUrl = `${BASE_URL}/status?code=${PROJECT_CODE}&uid=${TEST_UID}&type=complete`;
  console.log(` -> URL: ${callbackUrl}`);
  const cbResponse = await httpGet(callbackUrl);

  await new Promise(r => setTimeout(r, 1000));

  console.log('\n[TEST] 5. Validation Check #2: Confirm Status Field Updates');
  result = await client.query('SELECT uid, status, completion_time FROM responses WHERE uid = $1', [TEST_UID]);
  if(result.rows.length > 0) {
      const status = result.rows[0].status;
      if (status === 'complete') {
          console.log(`✅ SUCCESS - Callback Bug Resolved!`);
          console.log(`   -> Final Status: '${status}'`);
          console.log(`   -> Completion Time: ${result.rows[0].completion_time}`);
      } else {
          console.log(`❌ FAILED - Status is stuck at '${status}'`);
      }
  }

  await client.end();
}

run().catch(console.error);
