const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkProduction() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        
        console.log("--- Checking Responses Columns ---");
        const resCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'responses'");
        const columns = resCols.rows.map(r => r.column_name);
        console.log("Columns:", columns.join(', '));

        console.log("\n--- Checking Project MTkxNkAyOA== ---");
        const resProj = await client.query("SELECT id, project_code, status FROM projects WHERE project_code = 'MTkxNkAyOA=='");
        console.log("Project:", resProj.rows[0] || "NOT FOUND");

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

checkProduction();
