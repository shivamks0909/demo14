const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const { v4: uuidv4 } = require('uuid');

async function testInsert() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        
        console.log("--- Attempting Insert WITHOUT 'reason' field ---");
        const sessionToken = uuidv4();
        const validatedUid = 'test_fix_uid_' + Math.floor(Math.random()*10000);
        
        const insertQuery = `
            INSERT INTO responses (
                project_id, project_code, project_name, supplier_uid, 
                uid, hash_identifier, session_token, oi_session, 
                status, start_time, last_landing_page
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
        `;
        
        const params = [
            '58f9f771-20fe-4447-b35c-686a4656ab96', // Project ID for MTkxNkAyOA==
            'MTkxNkAyOA==',
            'Test',
            validatedUid,
            validatedUid,
            'test_hash',
            sessionToken,
            sessionToken,
            'in_progress',
            new Date().toISOString(),
            'track_entry'
        ];

        const res = await client.query(insertQuery, params);
        console.log("SUCCESS! Created Response ID:", res.rows[0].id);

    } catch (err) {
        console.error("FAILED Insert:", err.message);
    } finally {
        await client.end();
    }
}

testInsert();
