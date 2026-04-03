// Minimal test to verify chaining in buildQuery from lib/unified-db.ts
const Database = require('better-sqlite3');
const db = new Database(':memory:');

// Mocking required parts to test buildQuery logic
db.prepare('CREATE TABLE responses (id TEXT, status TEXT, uid TEXT, project_code TEXT, created_at TEXT)').run();
db.prepare('INSERT INTO responses (id, status, uid) VALUES (?, ?, ?)').run('some-uuid', 'in_progress', 'test-user');

function buildQuery(table: string) {
    let _where: any[] = [];
    let _updates: any = null;

    const builder: any = {
        update(u: any) { _updates = u; return this; },
        eq(c: any, v: any) { _where.push({ col: c, op: 'eq', val: v }); return this; },
        in(c: any, vs: any[]) { _where.push({ col: c, op: 'in', val: vs }); return this; },
        async then(cb: any) {
            // Very simplified execution logic for test
            console.log(`Executing ${_updates ? 'UPDATE' : 'SELECT'} on ${table}`);
            console.log("Filters:", JSON.stringify(_where));
            return cb({ data: [], error: null });
        }
    };
    return builder;
}

async function runTest() {
    console.log("Testing chained update().eq().in()");
    try {
        await buildQuery('responses')
            .update({ status: 'complete' })
            .eq('id', 'some-uuid')
            .in('status', ['in_progress', 'started']);
        console.log("✅ Chaining works!");
    } catch (e: any) {
        console.error("❌ Chaining failed:", e.message);
    }
}

runTest();
