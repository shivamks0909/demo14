const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkProject() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        const res = await client.query(
            "SELECT id, project_code, status, client_pid, complete_url FROM projects WHERE project_code = $1",
            ['MTkxNkAyOA==']
        );
        console.log("--- Project Details ---");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkProject();
