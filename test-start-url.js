const { createClient } = require('@insforge/sdk')
require('dotenv').config({ path: '.env' })

const db = createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL,
    anonKey: process.env.INSFORGE_API_KEY
})

async function run() {
    console.log('Testing Project Creation & Routing...');
    
    // 1. Create a dynamic project or a specific project
    const projCode = 'MTkxNkAyOA=='
    
    // Check if exists
    const { data: existing } = await db.database.from('projects').select('*').eq('project_code', projCode).maybeSingle()
    if (!existing) {
        console.log('Creating project ' + projCode)
        const id = 'proj_' + Math.floor(Math.random()*1000000)
        await db.database.from('projects').insert([{
            id,
            project_code: projCode,
            project_name: 'Test Decode ' + projCode,
            base_url: 'https://example.com/survey?[UID]',
            client_uid_param: 'uid',
            client_pid_param: 'pid',
            status: 'active'
        }])
    }
    
    const endpoints = [
        `http://localhost:3000/start/${projCode}?uid=test_start_uid`,
        `http://localhost:3000/track?code=${projCode}&uid=test_direct_uid`,
        `http://localhost:3000/r/${projCode}/vendor_1/test_router_uid`
    ];
    
    for (const ep of endpoints) {
        console.log(`\nTesting: ${ep}`)
        try {
            const res = await fetch(ep, { redirect: 'manual' })
            console.log(`Status: ${res.status}`)
            const loc = res.headers.get('location')
            console.log(`Redirect Location: ${loc}`)
            
            if (loc && loc.includes('paused')) {
                console.log('!! BUG: Project Paused / Entry Denied !!')
            } else if (loc && !loc.includes('uid=test_')) {
                console.log('!! BUG: UID not pushed to URL !!')
            } else {
                console.log('SUCCESS: URL format correct.')
            }
        } catch (e) {
            console.error('Failed:', e.message)
        }
    }
}
run()
