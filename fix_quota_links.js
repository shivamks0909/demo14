const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fixQuotaLinks() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        
        console.log('=== PROJECTS WITH COMPLETE_TARGET ===');
        const projects = await client.query(`
            SELECT id, project_code, complete_target, status 
            FROM projects 
            WHERE deleted_at IS NULL
        `);
        console.log(JSON.stringify(projects.rows, null, 2));
        
        console.log('\n=== SUPPLIER_PROJECT_LINKS WITH ZERO QUOTA ===');
        const badLinks = await client.query(`
            SELECT 
                spl.id,
                spl.quota_allocated,
                spl.quota_used,
                spl.status,
                p.project_code,
                p.complete_target,
                s.name as supplier_name
            FROM supplier_project_links spl
            LEFT JOIN projects p ON spl.project_id = p.id
            LEFT JOIN suppliers s ON spl.supplier_id = s.id
            WHERE spl.quota_allocated = 0 OR spl.quota_allocated IS NULL
        `);
        console.log(JSON.stringify(badLinks.rows, null, 2));
        
        // Fix: Delete bad links so they can be auto-created with proper quota
        if (badLinks.rows.length > 0) {
            console.log('\n=== DELETING BAD LINKS ===');
            for (const link of badLinks.rows) {
                await client.query(
                    'DELETE FROM supplier_project_links WHERE id = $1',
                    [link.id]
                );
                console.log(`Deleted link ${link.id} for project ${link.project_code}`);
            }
        }
        
        console.log('\n=== TESTING INCREMENT_QUOTA AFTER FIX ===');
        if (projects.rows.length > 0 && badLinks.rows.length > 0) {
            const testProject = projects.rows[0];
            const testSupplier = badLinks.rows[0];
            
            console.log(`Testing with project_id: ${testProject.id}, supplier_id: ${testSupplier.supplier_id}`);
            
            const result = await client.query(
                'SELECT increment_quota($1, $2) as success',
                [testProject.id, testSupplier.supplier_id]
            );
            console.log('Function result:', result.rows[0]);
            
            // Check if link was created
            const newLink = await client.query(
                'SELECT * FROM supplier_project_links WHERE project_id = $1 AND supplier_id = $2',
                [testProject.id, testSupplier.supplier_id]
            );
            console.log('New/Updated link:', JSON.stringify(newLink.rows, null, 2));
        }
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

fixQuotaLinks();
