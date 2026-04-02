const Database = require('better-sqlite3')

function checkSchema(dbPath) {
    console.log(`\n🔍 Checking: ${dbPath}`)
    const db = new Database(dbPath)

    // Responses columns
    const cols = db.prepare('PRAGMA table_info(responses)').all()
    console.log('  responses columns:')
    cols.forEach(c => console.log(`    - ${c.name} (${c.type})`))

    // Responses indexes
    const idxs = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='responses'").all()
    console.log('  responses indexes:')
    idxs.forEach(i => console.log(`    - ${i.name}`))

    // callback_events
    const hasCbEvents = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='callback_events'").get()
    console.log('  callback_events:', hasCbEvents ? 'exists' : 'MISSING')

    // callback_events indexes
    if (hasCbEvents) {
        const cbIdx = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='callback_events'").all()
        console.log('  callback_events indexes:')
        cbIdx.forEach(i => console.log(`    - ${i.name}`))
    }

    // Row counts
    const respCount = db.prepare("SELECT COUNT(*) as c FROM responses").get().c
    console.log(`  responses count: ${respCount}`)

    db.close()
}

console.log('=== SCHEMA VERIFICATION ===')
checkSchema('./data/local.db')
checkSchema('./data/test_local.db')
console.log('\n✅ Verification complete')
