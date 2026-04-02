import { getUnifiedDb } from '../lib/unified-db';

async function test() {
  try {
    const { source, database } = await getUnifiedDb();

    if (source === 'insforge') {
      // Test InsForge connection with simple query
      // @ts-ignore - InsForge database has query method
      const result = await database.query('SELECT 1 as test');
      console.log('✅ Database connection successful (InsForge):', result);
    } else {
      // Test SQLite connection by querying sqlite_master
      const result = await database.from('sqlite_master').select('*').maybeSingle();
      console.log('✅ Database connection successful (SQLite):', result);
    }

    console.log(`Connected to: ${source}`);
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

test();
