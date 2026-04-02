const Database = require('better-sqlite3')
const db = new Database('./data/local.db')

console.log('=== RESPONSES TABLE COLUMNS ===')
const cols = db.prepare('PRAGMA table_info(responses)').all()
cols.forEach(c => console.log(c.name))
console.log()

console.log('=== INDEXES ON responses ===')
const idxs = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='responses'").all()
idxs.forEach(i => console.log(i.name))
console.log()

console.log('=== s2s_config COLUMNS ===')
const s2sCols = db.pragma('table_info(s2s_config)')
s2sCols.forEach(c => console.log(c.name))
console.log()

console.log('=== INDEXES ON s2s_logs ===')
const s2sLogIdx = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='s2s_logs'").all()
s2sLogIdx.forEach(i => console.log(i.name))
console.log()

console.log('=== callback_logs exists? ===')
const hasCallbackLogs = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='callback_logs'").get()
console.log(hasCallbackLogs ? 'callback_logs table exists' : 'callback_logs table MISSING')
console.log()

console.log('=== callback_events exists? ===')
const hasCallbackEvents = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='callback_events'").get()
console.log(hasCallbackEvents ? 'callback_events table exists' : 'callback_events table MISSING')

db.close()
