const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function getColumns(tableName) {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        const res = await client.query(
            "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = $1",
            [tableName]
        );
        console.log(`--- ${tableName} Columns ---`);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

async function run() {
    await getColumns('projects');
    await getColumns('supplier_project_links');
    await getColumns('suppliers');
}

run();
