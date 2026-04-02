const { createClient } = require('@insforge/sdk');

async function verify() {
  const client = createClient({
    baseUrl: 'https://6dt6nyi6.us-east.insforge.app',
    anonKey: 'ik_e8f59f8bdc4bc047212ad8544a51625b'
  });
  
  console.log('Verifying InsForge database setup...');
  
  const result = await client.database.from('projects').select('*');
  
  if (result.error) {
    console.log('❌ Projects table query failed:', result.error.message);
    process.exit(1);
  }
  
  console.log('✅ Projects table exists and is queryable!');
  console.log('   Projects found:', result.data?.length || 0);
  
  const fallback = await client.database.from('projects')
    .select('*')
    .eq('project_code', 'external_traffic')
    .maybeSingle();
    
  if (!fallback.error && fallback.data) {
    console.log('✅ Fallback project exists: external_traffic');
  }
  
  console.log('\n✅ InsForge connection fully verified!');
}

verify().catch(err => {
  console.error('❌ Verification failed:', err.message);
  process.exit(1);
});
