// End-to-End Flow Test for localhost
const { createClient } = require('@insforge/sdk');

const db = createClient({
  baseUrl: 'http://localhost:5000',
  anonKey: 'ik_test_local_key'
});

async function testCompleteFlow() {
  console.log('=== END-TO-END FLOW TEST ===\n');

  try {
    // Step 1: Verify project configuration
    console.log('1. Checking project test23...');
    const { data: project } = await db.database
      .from('projects')
      .select('id, project_code, base_url, status')
      .eq('project_code', 'test23')
      .maybeSingle();

    if (!project) {
      console.error('❌ Project test23 not found!');
      return;
    }

    console.log(`   ✓ Project found: ${project.project_code}`);
    console.log(`   Status: ${project.status}`);
    console.log(`   Base URL: ${project.base_url}`);

    if (!project.base_url.includes('mock-survey')) {
      console.error('❌ base_url is not set to mock-survey!');
      return;
    }
    console.log('   ✓ base_url is correctly configured\n');

    // Step 2: Simulate entry through /r route
    console.log('2. Simulating entry: GET /r/test23/supplier1/uid_test123');

    const entryUrl = 'http://localhost:3000/r/test23/supplier1/uid_test123';
    const entryRes = await fetch(entryUrl, { redirect: 'manual' });
    const location = entryRes.headers.get('location');

    console.log(`   Response Status: ${entryRes.status}`);
    console.log(`   Redirect Location: ${location || '(none)'}`);

    if (!location) {
      console.error('❌ No redirect - server might be down or route broken');
      return;
    }

    if (location.includes('paused') || location.includes('SERVER_ERROR')) {
      console.error(`❌ Entry failed - redirected to error page: ${location}`);
      return;
    }

    // Should redirect to mock-survey
    if (!location.includes('mock-survey')) {
      console.warn(`⚠ Warning: Expected redirect to mock-survey, got: ${location}`);
    } else {
      console.log('   ✓ Correctly redirected to survey\n');
    }

    // Step 3: Extract session token from redirect URL
    console.log('3. Extracting session token from redirect URL...');
    const redirectUrl = new URL(location);
    const oiSession = redirectUrl.searchParams.get('oi_session');
    const uidInUrl = redirectUrl.searchParams.get('uid');
    const pidInUrl = redirectUrl.searchParams.get('pid') || redirectUrl.searchParams.get('code');

    console.log(`   Session (oi_session): ${oiSession || 'not found'}`);
    console.log(`   UID in URL: ${uidInUrl || 'not found'}`);
    console.log(`   PID in URL: ${pidInUrl || 'not found'}`);

    if (!oiSession) {
      console.error('❌ oi_session missing in redirect - tracking broken');
      return;
    }

    // Step 4: Verify response record was created
    console.log('\n4. Checking if response record was created in DB...');
    await new Promise(r => setTimeout(r, 500)); // Wait for DB

    const { data: response } = await db.database
      .from('responses')
      .select('id, uid, status, oi_session, project_code, created_at')
      .eq('oi_session', oiSession)
      .maybeSingle();

    if (!response) {
      console.error('❌ Response record not found in database');
      return;
    }

    console.log(`   ✓ Response ID: ${response.id}`);
    console.log(`   UID: ${response.uid}`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Project: ${response.project_code}`);
    console.log(`   Created: ${response.created_at}`);

    if (response.status !== 'in_progress') {
      console.warn(`⚠ Response status is ${response.status}, expected 'in_progress'`);
    } else {
      console.log('   ✓ Status is correct (in_progress)\n');
    }

    // Step 5: Simulate callback (survey completion)
    console.log('5. Simulating callback (survey complete)...');
    const callbackUrl = `http://localhost:3000/api/callback?pid=${pidInUrl || 'test23'}&cid=${oiSession}&type=complete`;
    console.log(`   GET ${callbackUrl}`);

    const callbackRes = await fetch(callbackUrl);
    const callbackData = await callbackRes.json();

    console.log(`   Response Status: ${callbackRes.status}`);
    console.log(`   Response Body:`, callbackData);

    if (!callbackData.success) {
      console.error(`❌ Callback failed: ${callbackData.error}`);
      return;
    }
    console.log('   ✓ Callback succeeded\n');

    // Step 6: Verify status update in DB
    console.log('6. Checking if response status was updated...');
    await new Promise(r => setTimeout(r, 500)); // Wait for DB

    const { data: updatedResponse } = await db.database
      .from('responses')
      .select('id, status, completion_time, updated_at')
      .eq('oi_session', oiSession)
      .maybeSingle();

    if (!updatedResponse) {
      console.error('❌ Response record not found after callback');
      return;
    }

    console.log(`   ✓ Response ID: ${updatedResponse.id}`);
    console.log(`   Status: ${updatedResponse.status}`);
    console.log(`   Completion Time: ${updatedResponse.completion_time || 'not set'}`);
    console.log(`   Updated At: ${updatedResponse.updated_at}`);

    if (updatedResponse.status !== 'complete') {
      console.error(`❌ Status not updated to 'complete', got: ${updatedResponse.status}`);
      return;
    }
    console.log('   ✓ Status correctly updated to "complete"\n');

    // Step 7: Test status page
    console.log('7. Testing final status page...');
    const statusUrl = `http://localhost:3000/status?code=${pidInUrl || 'test23'}&uid=${uidInUrl || response.uid}`;
    console.log(`   GET ${statusUrl}`);

    const statusRes = await fetch(statusUrl);
    console.log(`   Response Status: ${statusRes.status}`);

    if (!statusRes.ok) {
      console.warn(`⚠ Status page returned ${statusRes.status}`);
    } else {
      console.log('   ✓ Status page loads successfully\n');
    }

    // FINAL SUMMARY
    console.log('=== TEST RESULT ===');
    console.log('✅ ALL CHECKS PASSED!');
    console.log('\nThe complete flow works:');
    console.log('  /r/{code}/{supplier}/{uid} → tracking service → database insert');
    console.log('  → redirect to survey → callback → status update → status page');
    console.log('\nYour localhost is properly configured and working!\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED with error:', error.message);
    console.error(error.stack);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const res = await fetch('http://localhost:3000', { method: 'HEAD' });
    return res.ok || res.status === 404; // 404 is ok, means server running
  } catch {
    return false;
  }
}

(async () => {
  console.log('Checking if Next.js server is running on localhost:3000...');
  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.error('❌ Server is not running on http://localhost:3000');
    console.error('   Please start it with: npm run dev');
    process.exit(1);
  }

  console.log('✓ Server is running\n');
  await testCompleteFlow();
})();
