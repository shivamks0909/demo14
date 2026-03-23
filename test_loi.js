const { createClient } = require('@insforge/sdk');
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length > 0) {
        env[key.trim()] = value.join('=').trim();
    }
});

const insforge = createClient({
    baseUrl: env.NEXT_PUBLIC_INSFORGE_URL,
    anonKey: env.INSFORGE_API_KEY
});

async function runLoiTest() {
    console.log('--- STARTING LOI FEATURE VERIFICATION ---');
    
    try {
        const code = 'loi_test_' + Math.floor(Math.random() * 9999);
        const testUid = 'user_loi_' + Math.floor(Math.random() * 9999);
        
        // 1. Setup Project
        const { data: client } = await insforge.database.from('clients').select('id').limit(1).single();
        await insforge.database.from('projects').insert([{
            client_id: client.id,
            project_code: code,
            project_name: 'LOI Test Project',
            base_url: 'https://survey.example.com/s?pid=[PID]&uid=[UID]',
            status: 'active'
        }]);
        console.log('1. Project created:', code);

        // 2. Start Hit
        const trackUrl = `http://localhost:3000/track?code=${code}&uid=${testUid}&supplier=SUP_LOI`;
        console.log('2. Requesting:', trackUrl);
        const resp = await fetch(trackUrl, { redirect: 'manual' }).catch(e => { throw new Error('Track fetch failed: ' + e.message); });
        const loc = resp.headers.get('location');
        if (!loc) throw new Error('No redirect location found from /track');
        const session = loc.match(/oi_session=([^&]+)/)?.[1] || loc;
        console.log('3. Session started:', session);

        // 3. WAIT (simulate 65 seconds of survey time)
        console.log('4. Waiting 65 seconds to simulate survey duration...');
        await new Promise(r => setTimeout(r, 65000));

        // 4. Callback Hit
        const cbUrl = `http://localhost:3000/api/callback/${code}/${session}/complete`;
        console.log('5. Sending callback:', cbUrl);
        await fetch(cbUrl).catch(e => { throw new Error('Callback fetch failed: ' + e.message); });

        // 5. Verify Stats API
        console.log('6. Verifying Results via /api/respondent-stats...');
        const statsResp = await fetch(`http://localhost:3000/api/respondent-stats/${session}`).catch(e => { throw new Error('Stats fetch failed: ' + e.message); });
        const stats = await statsResp.json();
        
        console.log('Stats:', stats);
        
        if (stats.loiSeconds >= 60 && stats.loi >= 1) {
            console.log('\n✅ LOI VERIFICATION SUCCESS: Duration correctly calculated!');
            process.exit(0);
        } else {
            console.log('\n❌ LOI VERIFICATION FAILURE: Expected >= 60s, got:', stats.loiSeconds);
            process.exit(1);
        }

    } catch (err) {
        console.error('Fatal Error:', err);
        process.exit(1);
    }
}

runLoiTest();
