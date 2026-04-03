const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function restoreProject() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        await client.query("UPDATE projects SET deleted_at = NULL, status = 'active' WHERE project_code = $1", ['MTkxNkAyOA==']);
        console.log("✅ Restored project MTkxNkAyOA==");
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

restoreProject();
