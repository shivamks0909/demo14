const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkFunction() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        
        console.log('=== CHECKING FUNCTION DEFINITION ===');
        const func = await client.query(`
            SELECT 
                routine_name,
                routine_definition,
                routine_type
            FROM information_schema.routines 
            WHERE routine_name = 'increment_quota'
        `);
        console.log(JSON.stringify(func.rows, null, 2));
        
        // Also check the specific source
        const pgFunc = await client.query(`
            SELECT 
                proname,
                pg_get_functiondef(oid) as definition
            FROM pg_proc 
            WHERE proname = 'increment_quota'
        `);
        console.log('\n=== PG FUNCTION DEFINITION ===');
        console.log(pgFunc.rows[0]?.definition || 'Not found');
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkFunction();
