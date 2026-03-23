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

async function runTest() {
    console.log('--- STARTING INSFORGE E2E VERIFICATION ---');
    
    try {
        let { data: client } = await insforge.database.from('clients').select('id').limit(1).single();
        if (!client) {
            const { data: newClient } = await insforge.database.from('clients').insert([{ name: 'Test_Client_' + Date.now() }]).select().single();
            client = newClient;
        }

        const code = 'e2e_insforge_' + Math.floor(Math.random() * 9999);
        const testUid = 'user_insforge_' + Math.floor(Math.random() * 9999);
        const { data: project, error: pError } = await insforge.database.from('projects').insert([{
            client_id: client.id,
            project_code: code,
            project_name: 'E2E InsForge Test',
            base_url: 'https://survey.example.com/s?pid=[PID]&uid=[UID]',
            status: 'active'
        }]).select().single();
        
        if (pError) throw pError;
        console.log('1. Project created:', code);

        const trackUrl = `http://127.0.0.1:3000/track?code=${code}&uid=${testUid}&supplier=SUP_E2E`;
        console.log('2. Requesting:', trackUrl);
        
        const resp = await fetch(trackUrl, { redirect: 'manual' });
        const loc = resp.headers.get('location');
        console.log('3. Redirect Location:', loc);
        
        const session = loc ? (loc.match(/oi_session=([^&]+)/)?.[1] || loc) : null;
        console.log('4. Session extracted:', session);

        console.log('5. Checking Database Record directly...');
        await new Promise(r => setTimeout(r, 1000));
        
        const { data: uidResp } = await insforge.database.from('responses').select('status, supplier_uid, uid').eq('supplier_uid', testUid).order('created_at', { ascending: false }).limit(1).single();
        if (uidResp) {
            console.log('Found tracked record:', uidResp);
            console.log('\n✅ VERIFICATION SUCCESS: End-to-end routing tracked correctly!');
            process.exit(0);
        } else {
            console.log('\n❌ VERIFICATION FAILURE: End-to-end data mismatch or record not found!');
            process.exit(1);
        }

    } catch (err) {
        console.error('Fatal Error:', err);
        process.exit(1);
    }
}

runTest();
