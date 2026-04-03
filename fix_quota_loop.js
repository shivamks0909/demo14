const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fixQuotaLoop() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        
        console.log("--- Fixing Project MTkxNkAyOA== Quota & Loop ---");
        const res = await client.query(`
            UPDATE projects 
            SET 
                base_url = 'https://www.google.com/search?q=tracking_test_success_123',
                complete_target = 10000,
                status = 'active'
            WHERE project_code = 'MTkxNkAyOA=='
            RETURNING id, project_code, base_url, complete_target
        `);
        console.log("Updated Result:", JSON.stringify(res.rows[0], null, 2));

        console.log("\n--- Checking Project DYNAMIC_ENTRY / EXR ---");
        const resDyn = await client.query("SELECT id, project_code FROM projects WHERE project_code IN ('DYNAMIC_ENTRY', 'EXR', 'external_traffic')");
        console.log("Found:", JSON.stringify(resDyn.rows, null, 2));

    } catch (err) {
        console.error("FAILED Update:", err.message);
    } finally {
        await client.end();
    }
}

fixQuotaLoop();
