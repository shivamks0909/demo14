const { createClient } = require('@insforge/sdk');
// Native fetch used

const url = 'https://ckj5ikqw.us-east.insforge.app';
const key = 'ik_4c280b49c0ff95cf76486c648177850d';
const client = createClient({ baseUrl: url, anonKey: key });
const projectCode = 'e2e_insforge_3074';

async function runTest(status) {
    const clickid = `test_click_${status}_${Math.floor(Math.random() * 1000)}`;
    console.log(`\n[Test] Testing status: ${status} for clickid: ${clickid}`);

    // 1. Create response
    console.log('Inserting response...');
    const { error: insertError } = await client.database
        .from('responses')
        .insert([{
            project_id: '66b1bf34-9f77-4f87-b702-e818401be2aa',
            project_code: projectCode,
            clickid: clickid,
            supplier_uid: clickid,
            status: 'in_progress'
        }]);

    if (insertError) {
        console.error('Insert failed:', insertError);
        return;
    }

    // 2. Hit callback (local dev server)
    const callbackUrl = `http://localhost:3000/api/callback/${projectCode}/${clickid}/${status}`;
    console.log(`Hitting callback: ${callbackUrl}`);
    try {
        const resp = await fetch(callbackUrl);
        console.log(`Callback Response status: ${resp.status}`);
    } catch (e) {
        console.error('Callback request failed (check if server is running):', e.message);
        return;
    }

    // 3. Verify in DB
    console.log('Verifying status in database...');
    // Add small delay for DB propagation
    await new Promise(r => setTimeout(r, 1000));
    
    const { data: updated, error: fetchError } = await client.database
        .from('responses')
        .select('status')
        .eq('clickid', clickid)
        .single();

    if (fetchError || !updated) {
        console.error('Fetch failed or row not found:', fetchError);
    } else {
        const expected = (status === 'complete' || status === 'quota_full' || status === 'terminated') ? status : 'terminated';
        console.log(`Expected status: ${expected} | Actual status: ${updated.status}`);
        if (updated.status === expected) {
            console.log('✅ PASS');
        } else {
            console.log('❌ FAIL');
        }
    }
}

async function start() {
    await runTest('complete');
    await runTest('quota_full');
    await runTest('terminated');
}

start();
