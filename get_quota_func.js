const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function getFunction() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        
        console.log("--- SQL Function: increment_quota ---");
        const res = await client.query("SELECT prosrc FROM pg_proc WHERE proname = 'increment_quota'");
        console.log(res.rows[0]?.prosrc || "NOT FOUND");

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

getFunction();
