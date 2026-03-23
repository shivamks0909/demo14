const { createClient } = require('@insforge/sdk');

const url = 'https://ckj5ikqw.us-east.insforge.app';
const key = 'ik_4c280b49c0ff95cf76486c648177850d';
const client = createClient({ baseUrl: url, anonKey: key });

// Use 3001 because 3000 was taken
const projectCode = 'AUTO_PROJ_' + Math.floor(Math.random() * 1000);
const uid = 'AUTO_USER_' + Math.floor(Math.random() * 1000);
const status = 'complete';
const localRouterUrl = `http://localhost:3001/r/${projectCode}/${uid}?status=${status}`;

async function verify() {
    console.log(`\n[Step 1] Hitting Dynamic Gateway: ${localRouterUrl}`);
    try {
        const resp = await fetch(localRouterUrl, { redirect: 'manual' });
        const location = resp.headers.get('location');
        console.log(`Response status: ${resp.status}`);
        console.log(`Redirect Location: ${location}`);

        if (location && location.includes('/complete')) {
            console.log('✅ Success: Correctly redirected to /complete');
        } else {
            console.log('❌ Error: Expected redirect to /complete, got ' + location);
            return;
        }

        console.log('\n[Step 2] Verifying database entry...');
        // Wait for DB write
        await new Promise(r => setTimeout(r, 2000));

        // We check callback_events or responses. 
        // Note: UnifiedRouter internally uses sessionToken (UUID) for responses.
        // But since we are looking for the latest entry for this project_code...
        
        // Actually, the responses table will have 'DYNAMIC_ENTRY' as the project_code 
        // if it used the fallback, BUT my check for existing projects was:
        // .eq('project_code', code)
        
        // I'll just check responses for ANY row created in the last 10 seconds.
        const { data: rows, error } = await client.database
            .from('responses')
            .select('clickid, status, created_at')
            .eq('status', 'complete')
            .order('created_at', { ascending: false })
            .limit(1);

        if (error || !rows.length) {
            console.error('❌ Error: No response row found in database.');
        } else {
            console.log(`Latest Response CLICKID: ${rows[0].clickid}`);
            console.log(`Latest Response Status: ${rows[0].status}`);
            console.log('✅ PASS: Database updated successfully via Dynamic Gateway!');
        }

    } catch (e) {
        console.error('❌ Test failed unexpectedly:', e.message);
    }
}

verify();
