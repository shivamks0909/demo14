const { spawn } = require('child_process');
const http = require('http');
const { Client } = require('pg');

const BASE_URL = 'http://localhost:3000';
const PROJECT_CODE = 'MjQzOEAyOA==';
const TEST_UID = 'E2E_UID_' + Date.now();

// Supabase/Insforge DB details
const dbConfig = {
  host: '6dt6nyi6.us-east.database.insforge.app',
  port: 5432,
  database: 'insforge',
  user: 'postgres',
  password: '4ab5b1b8285f16fb0cbc6071ffa26100',
  ssl: { rejectUnauthorized: false }
};

const client = new Client(dbConfig);

async function checkDbResponse(uid) {
  const { rows } = await client.query('SELECT * FROM responses WHERE uid = $1', [uid]);
  return rows[0];
}

async function startServer() {
  console.log('Starting Next.js Dev Server...');
  const server = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['run', 'dev'], { cwd: __dirname });
  
  return new Promise((resolve) => {
    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Ready in') || output.includes('compiled client and server successfully')) {
        console.log('Next.js server is ready.');
        resolve(server);
      }
    });
    server.stderr.on('data', (data) => console.log('Server Error:', data.toString()));
  });
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      resolve({ statusCode: res.statusCode, headers: res.headers, location: res.headers.location });
    }).on('error', reject);
  });
}

async function runE2E() {
  await client.connect();

  console.log('\n--- 1. Database Setup / Project Creation ---');
  // Create Project MjQzOEAyOA==
  await client.query(`
    INSERT INTO projects (id, project_code, project_name, base_url, status)
    VALUES (uuid_generate_v4(), $1, 'End-to-End Test Project', 'https://mock-survey.com/start?rid=[UID]', 'active')
    ON CONFLICT (project_code) DO NOTHING
  `, [PROJECT_CODE]);
  console.log(`✅ Project created/exists with Code: ${PROJECT_CODE}`);

  // Start Next.js Server
  console.log('\n--- 2. Launching Traffic Server ---');
  const serverProc = await startServer();

  try {
    console.log(`\n--- 3. Simulating User Behavior (Entry) ---`);
    const startUrl = `${BASE_URL}/start/${PROJECT_CODE}?uid=${TEST_UID}`;
    console.log(`Accessing URL: ${startUrl}`);
    const startRes = await httpGet(startUrl);
    console.log(`Initial Route Redirect: ${startRes.statusCode}`);

    // Allow DB insert to finish (since it's async in some routes)
    await new Promise(r => setTimeout(r, 2000));

    // Validation Check 1
    console.log('\n--- 4. Validation Check 1: New Entry Created ---');
    let entry = await checkDbResponse(TEST_UID);
    if (entry) {
      console.log(`✅ SUCCESS - New entry found in responses table!`);
      console.log(`> Entry Status: '${entry.status}'`);
      console.log(`> Entry UID: '${entry.uid}'`);
    } else {
      console.log(`❌ FAILED - No entry found in DB for UID ${TEST_UID}`);
    }

    console.log(`\n--- 5. Simulating Callback via Legacy Link ---`);
    // Testing the rewrite logic & the DB uid fallback concurrently
    const callbackUrl = `${BASE_URL}/status?code=${PROJECT_CODE}&uid=${TEST_UID}&type=complete`;
    console.log(`Hitting Callback URL: ${callbackUrl}`);
    const cbRes = await httpGet(callbackUrl);
    console.log(`Callback API Response Status: ${cbRes.statusCode}`);

    await new Promise(r => setTimeout(r, 2000));

    console.log('\n--- 6. Validation Check 2: Status Update Correctly ---');
    entry = await checkDbResponse(TEST_UID);
    if (entry && entry.status === 'complete') {
      console.log(`✅ SUCCESS - Status successfully transitioned to 'complete'!`);
      console.log(`> Final Status: '${entry.status}'`);
      console.log(`> Completion Time: '${entry.completion_time}'`);
    } else {
      console.log(`❌ FAILED - Status did not update. Current status: '${entry ? entry.status : 'Not Found'}'`);
    }

  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    console.log('\n--- Cleanup ---');
    try {
        serverProc.kill();
        await client.end();
        console.log('Gracefully shut down server and DB connection.');
    } catch(e) {}
    process.exit(0);
  }
}

runE2E();
