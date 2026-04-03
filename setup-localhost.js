// Simple localhost setup - CommonJS for compatibility
const { createClient } = require('@insforge/sdk');
require('dotenv').config({ path: '.env.local' });

async function setupLocalhost() {
  console.log('=== LOCALHOST SETUP SCRIPT ===\n');

  // Connect to database
  const db = createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL || 'http://localhost:5000',
    anonKey: process.env.INSFORGE_API_KEY || 'your-api-key'
  });

  try {
    console.log('Connecting to database...');

    // Check projects table
    console.log('\n--- Current Projects ---');
    const { data: projects } = await db.database
      .from('projects')
      .select('id, project_code, project_name, base_url, status, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!projects || projects.length === 0) {
      console.log('  No projects found in database');
    } else {
      projects.forEach(p => {
        console.log(`  [${p.project_code}] ${p.project_name}`);
        console.log(`    Status: ${p.status}`);
        console.log(`    URL: ${p.base_url}`);
        console.log('');
      });
    }

    // Check if test23 exists and fix it
    const projectCode = 'test23';
    const { data: existing } = await db.database
      .from('projects')
      .select('id, project_code, base_url')
      .eq('project_code', projectCode)
      .maybeSingle();

    const expectedBaseUrl = 'http://localhost:3000/mock-survey';

    if (existing) {
      console.log(`--- Project "${projectCode}" Found ---`);
      console.log(`  ID: ${existing.id}`);
      console.log(`  Current base_url: ${existing.base_url}`);
      console.log(`  Expected base_url: ${expectedBaseUrl}`);

      if (existing.base_url !== expectedBaseUrl) {
        console.log('\n  Updating base_url...');
        const { error } = await db.database
          .from('projects')
          .update({ base_url: expectedBaseUrl })
          .eq('id', existing.id);

        if (error) {
          console.error('  ❌ Update failed:', error);
        } else {
          console.log('  ✓ base_url updated successfully');
        }
      } else {
        console.log('  ✓ base_url is already correct');
      }
    } else {
      console.log(`\n--- Creating Project "${projectCode}" ---`);
      const { data: newProject, error } = await db.database
        .from('projects')
        .insert([{
          id: 'proj_test23_' + Date.now(),
          project_code: projectCode,
          project_name: 'Test Project 23 (Localhost)',
          base_url: expectedBaseUrl,
          status: 'active',
          source: 'manual',
          created_at: new Date().toISOString()
        }])
        .select('id, project_code, base_url')
        .single();

      if (error) {
        console.error('❌ Failed to create project:', error);
      } else {
        console.log('✓ Project created:');
        console.log(`  ID: ${newProject.id}`);
        console.log(`  Code: ${newProject.project_code}`);
        console.log(`  base_url: ${newProject.base_url}`);
      }
    }

    // Summary & Instructions
    console.log('\n=== SETUP COMPLETE ===');
    console.log('\n📋 TEST INSTRUCTIONS:');
    console.log('1. Start Next.js server in another terminal: npm run dev');
    console.log('2. Test the correct route format:');
    console.log('\n   ✅ CORRECT:');
    console.log('   http://localhost:3000/r/test23/supplier1/uid_123456');
    console.log('\n   ❌ WRONG (will cause errors):');
    console.log('   http://localhost:3000/r/test23/gfgf  (missing UID)');
    console.log('   http://localhost:3000/r/test23  (missing supplier & UID)');
    console.log('\n3. Should redirect to: http://localhost:3000/mock-survey');
    console.log('4. The mock survey needs to call the callback API');
    console.log('5. Final status at: /status?code=test23&uid=uid_123456');
    console.log('\n🔍 Check mock survey implementation at: app/mock-survey/page.tsx');
    console.log('   It needs to POST to /api/callback to complete the flow.\n');

  } catch (error) {
    console.error('\n❌ Error during setup:', error.message);
    console.error('\nMake sure:');
    console.error('1. InsForge is running locally (localhost:5000)');
    console.error('2. .env.local has valid credentials');
    console.error('3. Database schema is migrated (run reset_backend.sql)');
    process.exit(1);
  }
}

setupLocalhost();
