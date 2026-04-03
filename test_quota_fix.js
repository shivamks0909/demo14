const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testQuotaFix() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        
        console.log('=== TESTING QUOTA FIX END-TO-END ===\n');
        
        // Get a project and supplier
        const project = await client.query(`
            SELECT id, project_code, complete_target 
            FROM projects 
            WHERE status = 'active' AND deleted_at IS NULL
            LIMIT 1
        `);
        
        const supplier = await client.query(`
            SELECT id, name, supplier_token 
            FROM suppliers 
            WHERE status = 'active'
            LIMIT 1
        `);
        
        if (project.rows.length === 0 || supplier.rows.length === 0) {
            console.log('Missing project or supplier. Skipping test.');
            return;
        }
        
        const projectId = project.rows[0].id;
        const supplierId = supplier.rows[0].id;
        const projectCode = project.rows[0].project_code;
        const completeTarget = project.rows[0].complete_target;
        
        console.log(`Project: ${projectCode} (ID: ${projectId})`);
        console.log(`Complete Target: ${completeTarget || 'null'}`);
        console.log(`Supplier: ${supplier.rows[0].name} (ID: ${supplierId})`);
        console.log(`Supplier Token: ${supplier.rows[0].supplier_token}`);
        
        // Clean up any existing link for this combo
        await client.query(
            'DELETE FROM supplier_project_links WHERE project_id = $1 AND supplier_id = $2',
            [projectId, supplierId]
        );
        console.log('\n✓ Cleaned up existing link\n');
        
        // Test 1: First call should create link and return true
        console.log('--- Test 1: First increment (should create link) ---');
        const result1 = await client.query(
            'SELECT increment_quota($1, $2) as success',
            [projectId, supplierId]
        );
        console.log('Result:', result1.rows[0].success ? 'TRUE ✓' : 'FALSE ✗');
        
        // Check the created link
        const link1 = await client.query(
            'SELECT * FROM supplier_project_links WHERE project_id = $1 AND supplier_id = $2',
            [projectId, supplierId]
        );
        console.log('Link created:', JSON.stringify(link1.rows, null, 2));
        
        if (link1.rows.length > 0) {
            const expectedQuota = Math.max(completeTarget || 10000, 100);
            const actualQuota = link1.rows[0].quota_allocated;
            console.log(`\nExpected quota_allocated: ${expectedQuota}`);
            console.log(`Actual quota_allocated: ${actualQuota}`);
            console.log(actualQuota === expectedQuota ? '✓ Quota matches!' : '✗ Quota mismatch!');
        }
        
        // Test 2: Second call should succeed (increment)
        console.log('\n--- Test 2: Second increment (should succeed) ---');
        const result2 = await client.query(
            'SELECT increment_quota($1, $2) as success',
            [projectId, supplierId]
        );
        console.log('Result:', result2.rows[0].success ? 'TRUE ✓' : 'FALSE ✗');
        
        const link2 = await client.query(
            'SELECT quota_used, quota_allocated FROM supplier_project_links WHERE project_id = $1 AND supplier_id = $2',
            [projectId, supplierId]
        );
        console.log('After 2 increments:', JSON.stringify(link2.rows, null, 2));
        
        // Test 3: Keep incrementing until quota is full
        console.log('\n--- Test 3: Increment until quota full ---');
        const maxQuota = link2.rows[0].quota_allocated;
        let successCount = 2;
        for (let i = 0; i < maxQuota; i++) {
            const res = await client.query(
                'SELECT increment_quota($1, $2) as success',
                [projectId, supplierId]
            );
            if (res.rows[0].success) {
                successCount++;
            } else {
                console.log(`Quota full after ${successCount} increments (expected ${maxQuota})`);
                break;
            }
        }
        
        const finalLink = await client.query(
            'SELECT quota_used, quota_allocated FROM supplier_project_links WHERE project_id = $1 AND supplier_id = $2',
            [projectId, supplierId]
        );
        console.log('Final state:', JSON.stringify(finalLink.rows, null, 2));
        console.log(`\nquota_used: ${finalLink.rows[0].quota_used}`);
        console.log(`quota_allocated: ${finalLink.rows[0].quota_allocated}`);
        console.log(finalLink.rows[0].quota_used === finalLink.rows[0].quota_allocated ? '✓ Quota fully used!' : '✗ Quota not fully used');
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

testQuotaFix();
