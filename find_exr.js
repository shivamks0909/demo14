const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function findExr() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        const res = await client.query("SELECT id, project_code FROM projects WHERE project_code ILIKE '%EX%' OR id::text ILIKE '%EX%'");
        console.log("Matches:", JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
findExr();
