require('dotenv').config({ path: ['.env.local', '.env'] })
const { createClient } = require('@insforge/sdk')
const crypto = require('crypto')

const url = process.env.NEXT_PUBLIC_INSFORGE_URL
const key = process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_ANON_KEY
if (!url || !key) throw new Error('Missing InsForge configuration')

const db = createClient({ baseUrl: url, anonKey: key }).database

async function createCompleteHit() {
    try {
        console.log(`Connected to database.`)

        // 1. Create a client
        console.log('Creating Test Client...')
        const clientName = `Test Complete Client ${Date.now()}`
        const { data: client, error: clientErr } = await db
            .from('clients')
            .insert([{ name: clientName }])
            .select('*')
            .single()

        if (clientErr) throw new Error('Client creation failed: ' + clientErr.message)

        // 2. Create a project
        console.log('Creating Test Project...')
        const projectCode = `PROJ_${Math.floor(Math.random() * 10000)}`
        const { data: project, error: projErr } = await db
            .from('projects')
            .insert([{
                client_id: client.id,
                project_name: `Complete Hit Test Project`,
                project_code: projectCode,
                status: 'active',
                base_url: 'https://example.com/survey?uid=[UID]'
            }])
            .select('*')
            .single()

        if (projErr) throw new Error('Project creation failed: ' + projErr.message)

        // 3. Create a supplier
        console.log('Creating Test Supplier...')
        const supplierToken = `SUP_${crypto.randomBytes(4).toString('hex').toUpperCase()}`
        const { data: supplier, error: supErr } = await db
            .from('suppliers')
            .insert([{
                name: `Test Complete Supplier`,
                supplier_token: supplierToken,
                status: 'active',
                complete_redirect_url: 'https://supplier.example.com/complete'
            }])
            .select('*')
            .single()

        if (supErr) throw new Error('Supplier creation failed: ' + supErr.message)

        // 4. Link supplier to project
        console.log('Linking Supplier to Project...')
        const { error: linkErr } = await db
            .from('supplier_project_links')
            .insert([{
                supplier_id: supplier.id,
                project_id: project.id,
                quota_allocated: 100,
                status: 'active'
            }])

        if (linkErr) throw new Error('Link creation failed: ' + linkErr.message)

        // 5. Insert a response with 'complete' status
        console.log('Creating a Complete Response Hit...')
        const sessionId = crypto.randomUUID()
        const uid = `USER_${crypto.randomBytes(4).toString('hex').toUpperCase()}`
        
        const { data: response, error: respErr } = await db
            .from('responses')
            .insert([{
                session_token: sessionId,
                clickid: sessionId,
                project_id: project.id,
                project_code: projectCode,
                supplier_token: supplier.supplier_token,
                supplier_name: supplier.name,
                uid: uid,
                status: 'complete',
                ip: '127.0.0.1',
                user_agent: 'Node/TestRunner',
                device_type: 'desktop'
            }])
            .select('*')
            .single()

        if (respErr) throw new Error('Response creation failed: ' + respErr.message)

        console.log('\n✅ SUCCESS! All records created.')
        console.log(`- Project Code: ${projectCode}`)
        console.log(`- Supplier Token: ${supplierToken}`)
        console.log(`- Participant UID: ${uid}`)
        console.log(`- Session Token: ${sessionId}`)
        console.log(`- Status: COMPLETE`)
        
    } catch (err) {
        console.error('❌ Failed:', err.message)
        process.exit(1)
    }
}

createCompleteHit()
