const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'local.db');
const db = new Database(dbPath);

const newPassword = 'admin123';
const hash = bcrypt.hashSync(newPassword, 10);

console.log('Resetting admin password...');
console.log('New password:', newPassword);
console.log('New hash:', hash);

db.prepare('UPDATE admins SET password_hash = ? WHERE username = ?').run(hash, 'admin@opinioninsights.com');

const verify = db.prepare('SELECT id, username, password_hash FROM admins WHERE username = ?').get('admin@opinioninsights.com');
console.log('\nVerification:');
console.log('Username:', verify.username);
console.log('Hash updated:', verify.password_hash);

const match = bcrypt.compareSync(newPassword, verify.password_hash);
console.log('Password matches:', match ? 'YES' : 'NO');

if (match) {
  console.log('\n Admin password reset successful!');
  console.log('Login with:');
  console.log('  Email: admin@opinioninsights.com');
  console.log('  Password: admin123');
} else {
  console.log('\n ERROR: Password verification failed!');
}
