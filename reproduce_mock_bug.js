const { getUnifiedDb } = require('./lib/unified-db');

async function reproduce() {
    console.log("--- Testing Local DB Mock Chaining ---");
    try {
        const { database: db } = await getUnifiedDb();
        console.log("Database source:", (await getUnifiedDb()).source);

        console.log("\n1. Testing select().eq().eq().maybeSingle()");
        const res1 = await db.from('projects')
            .select('*')
            .eq('project_code', 'MTkxNkAyOA==')
            .eq('status', 'active')
            .maybeSingle();
        console.log("Result 1 (Project):", res1.data?.project_code);

        console.log("\n2. Testing update().eq().in()");
        // This is likely where it fails because update().eq() returns a limited object
        try {
            const res2 = await db.from('responses')
                .update({ status: 'complete' })
                .eq('uid', 'test')
                .in('status', ['in_progress']);
            console.log("Result 2 success");
        } catch (e) {
            console.error("Result 2 FAILED:", e.message);
        }

    } catch (err) {
        console.error("Reproduction Error:", err);
    }
}

reproduce();
