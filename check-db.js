const db = require('better-sqlite3')('data/local.db');

console.log('=== DATABASE TABLES ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
tables.forEach(t => console.log(' -', t.name));

console.log('\n=== RESPONSES TABLE STRUCTURE ===');
const pragma = db.pragma('table_info(responses)');
console.log(pragma);

console.log('\n=== SAMPLE RESPONSES (first 5) ===');
const responses = db.prepare('SELECT * FROM responses LIMIT 5').all();
console.log(JSON.stringify(responses, null, 2));

console.log('\n=== RESPONSES WITH oi_session ===');
const withSession = db.prepare('SELECT id, oi_session, clickid, status, uid FROM responses WHERE oi_session IS NOT NULL LIMIT 5').all();
console.log(JSON.stringify(withSession, null, 2));

console.log('\n=== ALL RESPONSES COUNT ===');
const count = db.prepare('SELECT COUNT(*) as total FROM responses').get();
console.log('Total responses:', count.total);
