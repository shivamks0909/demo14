const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function diagnoseQuota() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        
        console.log('=== SUPPLIER_PROJECT_LINKS TABLE ===');
        const links = await client.query(`
            SELECT 
                spl.id,
                spl.supplier_id,
                spl.project_id,
                spl.quota_allocated,
                spl.quota_used,
                spl.status,
                s.name as supplier_name,
                s.supplier_token,
                p.project_code,
                p.status as project_status
            FROM supplier_project_links spl
            LEFT JOIN suppliers s ON spl.supplier_id = s.id
            LEFT JOIN projects p ON spl.project_id = p.id
            ORDER BY spl.created_at DESC
            LIMIT 20
        `);
        console.log(JSON.stringify(links.rows, null, 2));
        
        console.log('\n=== SUPPLIERS TABLE ===');
        const suppliers = await client.query('SELECT id, name, supplier_token, status FROM suppliers');
        console.log(JSON.stringify(suppliers.rows, null, 2));
        
        console.log('\n=== CHECKING INCREMENT_QUOTA FUNCTION ===');
        const func = await client.query(`
            SELECT 
                routine_name,
                routine_definition,
                routine_type
            FROM information_schema.routines 
            WHERE routine_name = 'increment_quota'
        `);
        console.log(JSON.stringify(func.rows, null, 2));
        
        console.log('\n=== TESTING INCREMENT_QUOTA FUNCTION ===');
        if (links.rows.length > 0) {
            const testLink = links.rows[0];
            console.log(`Testing with project_id: ${testLink.project_id}, supplier_id: ${testLink.supplier_id}`);
            
            try {
                const result = await client.query(
                    'SELECT increment_quota($1, $2) as success',
                    [testLink.project_id, testLink.supplier_id]
                );
                console.log('Function result:', result.rows[0]);
                
                // Check updated quota
                const after = await client.query(
                    'SELECT quota_used, quota_allocated FROM supplier_project_links WHERE id = $1',
                    [testLink.id]
                );
                console.log('After increment:', after.rows[0]);
            } catch (err) {
                console.error('Error calling function:', err.message);
            }
        }
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

diagnoseQuota();
