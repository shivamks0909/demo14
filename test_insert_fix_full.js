const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const { v4: uuidv4 } = require('uuid');

async function testInsert() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        
        console.log("--- Attempting Insert EXACTLY like track/route.ts (WITHOUT reason) ---");
        const sessionToken = uuidv4();
        const validatedUid = 'test_fix_full_' + Math.floor(Math.random()*10000);
        
        const payload = {
            project_id: '58f9f771-20fe-4447-b35c-686a4656ab96',
            project_code: 'MTkxNkAyOA==',
            project_name: 'Test',
            supplier_uid: validatedUid,
            client_uid_sent: validatedUid,
            uid: validatedUid,
            client_pid: 'TEST_PID_001',
            hash_identifier: 'test_hash',
            supplier_token: null,
            supplier_name: null,
            supplier: null,
            session_token: sessionToken,
            oi_session: sessionToken,
            status: 'in_progress',
            start_time: new Date().toISOString(),
            ip: '127.0.0.1',
            user_agent: 'Test Browser',
            device_type: 'Desktop',
            country_code: 'US',
            clickid: validatedUid,
            hash: validatedUid,
            last_landing_page: 'track_entry'
        };

        const columns = Object.keys(payload);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const query = `INSERT INTO responses (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id`;
        
        const res = await client.query(query, Object.values(payload));
        console.log("SUCCESS! Created Response ID:", res.rows[0].id);

    } catch (err) {
        console.error("FAILED Insert:", err.message);
    } finally {
        await client.end();
    }
}

testInsert();
