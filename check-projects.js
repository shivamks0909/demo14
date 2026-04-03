const db = require('better-sqlite3')('data/local.db');

console.log('=== PROJECTS ===');
const projects = db.prepare('SELECT * FROM projects').all();
projects.forEach(p => {
  console.log(`Code: ${p.project_code}, Name: ${p.project_name}, Base URL: ${p.base_url}`);
});

console.log('\n=== RESPONSES COUNT ===');
const count = db.prepare('SELECT COUNT(*) as total FROM responses').get();
console.log('Total responses:', count.total);

console.log('\n=== RESPONSES WITH oi_session (should be empty initially) ===');
const withSession = db.prepare('SELECT id, oi_session, clickid, uid, status FROM responses WHERE oi_session IS NOT NULL LIMIT 5').all();
console.log(JSON.stringify(withSession, null, 2));
