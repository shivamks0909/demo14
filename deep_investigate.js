const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function deepInvestigate() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        
        console.log("--- 1. Searching for project code 'EXR' ---");
        const resExr = await client.query("SELECT id, project_code, project_name FROM projects WHERE project_code = 'EXR' OR project_name ILIKE '%EXR%'");
        console.log(JSON.stringify(resExr.rows, null, 2));

        console.log("\n--- 2. Checking 'DYNAMIC_ENTRY' and 'external_traffic' ---");
        const resDyn = await client.query("SELECT id, project_code, status FROM projects WHERE project_code IN ('DYNAMIC_ENTRY', 'external_traffic')");
        console.log(JSON.stringify(resDyn.rows, null, 2));

        console.log("\n--- 3. Checking Supplier-Project Quotas for MTkxNkAyOA== (ID 58f9f771-20fe-4447-b35c-686a4656ab96) ---");
        const resQuota = await client.query("SELECT * FROM supplier_project_links WHERE project_id = '58f9f771-20fe-4447-b35c-686a4656ab96'");
        console.log(JSON.stringify(resQuota.rows, null, 2));

        console.log("\n--- 4. Checking Table Schema Constraints for 'responses' (ClickID) ---");
        const resSchema = await client.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'responses' AND column_name = 'clickid'");
        console.log(JSON.stringify(resSchema.rows, null, 2));

    } catch (err) {
        console.error("Deep Investigate Error:", err);
    } finally {
        await client.end();
    }
}

deepInvestigate();
