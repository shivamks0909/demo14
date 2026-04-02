const { createClient } = require('@insforge/sdk');

async function testConnection() {
  try {
    const client = createClient({
      baseUrl: 'https://6dt6nyi6.us-east.insforge.app',
      anonKey: 'ik_e8f59f8bdc4bc047212ad8544a51625b'
    });
    
    console.log('Testing InsForge connection...');
    
    // Test database connection
    const result = await client.database.from('projects').select('count');
    
    if (result.error) {
      console.log('? Database query failed:', result.error.message);
      
      // Check if it's a missing table error
      if (result.error.code === '42P01') {
        console.log('   ? Tables not created yet. Need to run migration.');
      }
      return;
    }
    
    console.log('? Connected successfully!');
    console.log('Projects count:', result.count);
    
    // List all tables
    const tablesResult = await client.database.rpc('pg_tables');
    console.log('Tables:', tablesResult);
    
  } catch (err) {
    console.error('? Error:', err.message);
  }
}

testConnection();
