// Simulate the EXACT flow from mock survey
const { createClient } = require('@insforge/sdk');
const db = createClient({
  baseUrl: 'http://localhost:5000',
  anonKey: 'ik_test_local_key'
});

async function testCallbackFlow() {
  console.log('=== TESTING CALLBACK FLOW ===\n');

  // Step 1: Create a response record (like /r route would do)
  console.log('1. Creating response record (simulating /r route)...');
  const testPid = 'test23';
  const testUid = 'uid_manual_test_456';
  const testSession = 'test_session_new_456';

  // First get project ID
  const { data: project } = await db.database
    .from('projects')
    .select('id')
    .eq('project_code', testPid)
    .maybeSingle();

  if (!project) {
    console.error('❌ Project test23 not found');
    return;
  }

  // Clean up any existing test data
  await db.database
    .from('responses')
    .delete()
    .eq('oi_session', testSession)
    .or('eq.uid', testUid)
    .then(() => console.log('   Cleaned up old test data'));

  // Create response
  const { data: response, error } = await db.database
    .from('responses')
    .insert([{
      project_id: project.id,
      project_code: testPid,
      project_name: 'Test Project',
      uid: testUid,
      clickid: testSession,
      oi_session: testSession,
      session_token: testSession,
      status: 'in_progress',
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to create response:', error);
    return;
  }

  console.log(`   ✓ Response created: ID=${response.id}, UID=${response.uid}, status=${response.status}`);
  console.log(`   Session: ${response.oi_session}\n`);

  // Step 2: Test callback with DIFFERENT parameter formats
  console.log('2. Testing callback with different URL formats...\n');

  const formats = [
    { name: 'pid + cid + type', url: `/api/callback?pid=${testPid}&cid=${testSession}&type=complete` },
    { name: 'clickid + status', url: `/api/callback?clickid=${testSession}&status=complete` },
    { name: 'pid + oi_session + type', url: `/api/callback?pid=${testPid}&cid=${testSession}&type=complete` },
  ];

  for (const format of formats) {
    console.log(`   Testing: ${format.name}`);
    console.log(`   URL: /api?${format.url.split('?')[1]}`);

    try {
      const res = await fetch(`http://localhost:3000${format.url}`, { redirect: 'manual' });
      const data = await res.json();
      console.log(`   Status: ${res.status}`);
      console.log(`   Response:`, data);

      if (data.success || res.status === 200) {
        console.log(`   ✓ SUCCESS\n`);
      } else {
        console.log(`   ❌ FAILED\n`);
      }
    } catch (err) {
      console.log(`   ❌ ERROR: ${err.message}\n`);
    }
  }

  // Step 3: Check final status
  console.log('3. Verifying final DB state...');
  await new Promise(r => setTimeout(r, 500));

  const { data: final } = await db.database
    .from('responses')
    .select('id, uid, status, completion_time')
    .eq('oi_session', testSession)
    .maybeSingle();

  if (final) {
    console.log(`   Response ID: ${final.id}`);
    console.log(`   UID: ${final.uid}`);
    console.log(`   Status: ${final.status}`);
    console.log(`   Completion Time: ${final.completion_time || 'NULL'}`);

    if (final.status === 'complete') {
      console.log('\n✅ CALLBACK WORKING CORRECTLY!');
    } else {
      console.log('\n❌ Status not updated to complete');
    }
  } else {
    console.log('   Response not found in DB');
  }
}

(async () => {
  console.log('Checking server...');
  const serverOk = await fetch('http://localhost:3000', { method: 'HEAD' }).then(r => r.ok || r.status===404).catch(() => false);
  if (!serverOk) {
    console.error('❌ Server not running on localhost:3000. Start with: npm run dev');
    process.exit(1);
  }
  console.log('✓ Server running\n');
  await testCallbackFlow();
})();
