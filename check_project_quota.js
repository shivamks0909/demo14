const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkProject() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        
        console.log("--- Project: MTkxNkAyOA== ---");
        const res = await client.query("SELECT * FROM projects WHERE project_code = $1", ['MTkxNkAyOA==']);
        console.log(JSON.stringify(res.rows[0], null, 2));

        console.log("\n--- Projects: all ---");
        const res2 = await client.query("SELECT id, project_code, status FROM projects");
        console.log(JSON.stringify(res2.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkProject();
