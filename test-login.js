const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'local.db');
console.log('DB Path:', dbPath);

const db = new Database(dbPath);

// Test 1: Check if admin exists
const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get('admin@opinioninsights.in');
console.log('\nTest 1: Admin lookup');
console.log('Admin found:', !!admin);
if (admin) {
  console.log('Admin ID:', admin.id);
  console.log('Admin email:', admin.email);
  console.log('Password hash starts with:', admin.password?.substring(0, 10));
  
  // Test 2: Password comparison
  const match = bcrypt.compareSync('admin123', admin.password);
  console.log('\nTest 2: Password comparison');
  console.log('Password matches admin123:', match);
  
  // Test 3: Check what the login action would see
  const email = 'admin@opinioninsights.in';
  const rows = db.prepare('SELECT * FROM admins WHERE email = ?').all(email);
  console.log('\nTest 3: Query result');
  console.log('Rows returned:', rows.length);
  if (rows.length > 0) {
    console.log('First row email:', rows[0].email);
  }
}

db.close();
