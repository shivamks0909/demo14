const { createClient } = require('@insforge/sdk');

async function test() {
  const client = createClient({
    baseUrl: 'https://6dt6nyi6.us-east.insforge.app',
    anonKey: 'ik_e8f59f8bdc4bc047212ad8544a51625b'
  });
  
  console.log('Testing InsForge connection...');
  const result = await client.database.from('projects').select('*').limit(1);
  
  if (result.error) {
    console.log('Error code:', result.error.code);
    console.log('Error message:', result.error.message);
  } else {
    console.log('Success! Found projects:', result.data?.length || 0);
  }
}

test().catch(console.error);
