const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkProject() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'projects'");
        console.log("Columns:", cols.rows.map(r => r.column_name).join(', '));

        const res = await client.query("SELECT * FROM projects WHERE project_code = $1", ['MTkxNkAyOA==']);
        console.log("--- Project Details ---");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkProject();
