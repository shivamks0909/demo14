import { trackingService } from './lib/tracking-service'
import { getUnifiedDb } from './lib/unified-db'

async function runTest() {
  const { database: db } = await getUnifiedDb();
  if(!db) throw new Error("No DB");
  
  // 1. Create Project
  const projectCode = 'MjQzOEAyOA==';
  const baseUrl = 'https://track.exploresearch.in/start/MjQzOEAyOA==?uid=';
  const { project_id } = await trackingService.ensureProject(projectCode, baseUrl);
  
  // 2. Simulate User Entry
  const testUid = 'TEST_USER_' + Date.now();
  console.log(`[Flow] Simulating entry for UID: ${testUid}`);
  const { TrackingService } = await import('./lib/tracking-service');
  const result = await TrackingService.processEntry({
      projectId: project_id,
      rid: testUid,
      userAgent: 'Test Agent',
      ip: '127.0.0.1',
      queryParams: { uid: testUid }
  });
  
  if (!result.success) throw new Error("Entry failed: " + result.errorMessage);
  console.log(`[Flow] Entry successful, status currently: 'in_progress'`);
  
  // 3. Simulate The Callback API
  const type = 'complete';
  const pid = projectCode;
  const cid = testUid;  // The legacy callback uses uid here
  
  console.log(`[Flow] Simulating Callback -> PID: ${pid}, CID (Legacy UID): ${cid}`);
  
  // Simulating the DB lookup logic from app/api/callback/route.ts
  let { data: response, error: lookupError } = await db
      .from('responses')
      .select('id, status, clickid, project_code, project_id')
      .eq('oi_session', cid)
      .maybeSingle();

  if (!response && !lookupError) {
      console.log(`[Lookup] Primary lookup (oi_session) failed. Trying fallback to clickid...`);
      const { data: fallbackResponse } = await db
          .from('responses')
          .select('id, status, clickid, project_code, project_id')
          .eq('clickid', cid)
          .ilike('project_code', pid)
          .maybeSingle();
      response = fallbackResponse;
  }
  
  if (!response) {
      console.log(`[Issue Identified] Callback FAILED! Could not find response using CID=${cid} because the actual clickid in DB is different from the legacy UID.`);
      console.log(`[Diagnosis] Legacy callback uses UID, but route.ts checks 'oi_session' and 'clickid' columns. It NEVER checks the 'uid' column! Status remains stuck!`);
      
      // Let's test the fix logic
      console.log(`[Fix Verification] If we add a second fallback checking the 'uid' column...`);
      const { data: legacyResponse } = await db
          .from('responses')
          .select('id, status, clickid, project_code, project_id, uid')
          .eq('uid', cid)
          .ilike('project_code', pid)
          .maybeSingle();
          
      if (legacyResponse) {
          console.log(`[Fix Verification] SUCCESS! Found response ID: ${legacyResponse.id} using 'uid' column lookup.`);
      }
  } else {
       console.log(`[Success] Found response!`);
  }
}

runTest().catch(console.error);
