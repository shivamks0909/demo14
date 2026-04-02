require('dotenv').config({ path: ['.env.local', '.env'] })
const { createClient } = require('@insforge/sdk')
const crypto = require('crypto')

const url = process.env.NEXT_PUBLIC_INSFORGE_URL
const key = process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_ANON_KEY
if (!url || !key) throw new Error('Missing InsForge configuration')

const db = createClient({ baseUrl: url, anonKey: key }).database

async function createMockProject() {
    try {
        console.log(`Connected to database.`)

        // 1. Create a client
        console.log('Creating Test Client...')
        const clientName = `Mock Client ${Date.now()}`
        const { data: client, error: clientErr } = await db
            .from('clients')
            .insert([{ name: clientName }])
            .select('*')
            .single()

        if (clientErr) throw new Error('Client creation failed: ' + clientErr.message)

        // 2. Create a project
        console.log('Creating Test Project...')
        const projectCode = `MOCK_${Math.floor(Math.random() * 10000)}`
        const { data: project, error: projErr } = await db
            .from('projects')
            .insert([{
                client_id: client.id,
                project_name: `End-to-End Mock Project`,
                project_code: projectCode,
                status: 'active',
                base_url: `http://localhost:3000/mock-survey?pid=${projectCode}`
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
                name: `Test Mock Supplier`,
                supplier_token: supplierToken,
                status: 'active',
                complete_redirect_url: 'http://localhost:3000/status?type=complete',
                terminate_redirect_url: 'http://localhost:3000/status?type=terminate',
                quotafull_redirect_url: 'http://localhost:3000/status?type=quotafull'
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

        // 5. Build S2S mapping for signature generation
        console.log('Creating S2S Configuration directly via pg...')
        const secretKey = crypto.randomBytes(32).toString('hex')
        const { Client } = require('pg')
        const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:f6e75a96bb4301794302c738b94ab107@3gkhhr9f.us-east.database.insforge.app:5432/insforge?sslmode=require'
        const pgClient = new Client({ connectionString })
        await pgClient.connect()
        await pgClient.query(`
            CREATE TABLE IF NOT EXISTS s2s_config (
                project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
                secret_key TEXT NOT NULL,
                allowed_ips TEXT,
                require_s2s_for_complete BOOLEAN DEFAULT true,
                allow_test_mode BOOLEAN DEFAULT false,
                unverified_action TEXT DEFAULT 'terminate',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `)
        await pgClient.query(`
            INSERT INTO s2s_config (project_id, secret_key, require_s2s_for_complete, allow_test_mode) 
            VALUES ($1, $2, true, true)
        `, [project.id, secretKey])
        await pgClient.end()

        console.log('\n✅ SUCCESS! Mock End-to-End Environment Created.')
        console.log(`\n👉 PUNCH THIS URL TO START:`)
        console.log(`\n  http://localhost:3000/r/${projectCode}/${supplierToken}/TEST_USER_${Math.floor(Math.random() * 1000)}\n`)
        console.log(`Once you enter, it will redirect you to the Mock Survey, passing the session data correctly.`)
        
    } catch (err) {
        console.error('\n❌ Failed:', err.message)
        process.exit(1)
    }
}

createMockProject()
