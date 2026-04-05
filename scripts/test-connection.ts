import { getUnifiedDb } from '../lib/unified-db';

async function test() {
  try {
    const { source, database } = await getUnifiedDb();

    // Test cloud database connection
    const result = await database.from('projects').select('id').limit(1);
    console.log('✅ Database connection successful:', result);

    console.log(`Connected to: ${source}`);
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

test();
