import { getUnifiedDb } from './lib/unified-db';

async function testMockChaining() {
    console.log("--- Testing Mock DB Chaining Fix ---");
    
    // Force local source by clearing env vars temporarily if needed, 
    // but getUnifiedDb will return local if SDK init fails.
    const dbObj = await getUnifiedDb();
    const { database: db } = dbObj;
    
    console.log("Database source:", dbObj.source);

    try {
        console.log("\n1. Testing update().eq().in()");
        // This previously threw "TypeError: ...in is not a function"
        const updateResult = await db.from('responses')
            .update({ status: 'complete' })
            .eq('id', 'some-uuid')
            .in('status', ['in_progress', 'started']);
        
        console.log("Update call successful (no TypeError)");
        
        console.log("\n2. Testing select().eq().eq().order().limit()");
        const selectResult = await db.from('responses')
            .select('*')
            .eq('project_code', 'test')
            .eq('status', 'in_progress')
            .order('created_at', { ascending: false })
            .limit(1);
        
        console.log("Select call successful (no TypeError)");

        console.log("\n✅ SUCCESS: Mock DB chaining is now working correctly.");
    } catch (err: any) {
        console.error("\n❌ FAILURE:", err.message);
        process.exit(1);
    }
}

testMockChaining();
