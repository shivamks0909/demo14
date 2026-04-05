const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(process.cwd(), 'data', 'local.db');
const db = new Database(dbPath);

// Check admins table schema
const columns = db.prepare("PRAGMA table_info(admins)").all();
console.log('Current admins table columns:', columns);

// Drop and recreate with correct schema
db.exec('DROP TABLE IF EXISTS admins');
console.log('Dropped old admins table');

db.exec(`
  CREATE TABLE admins (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
console.log('Created new admins table with correct schema');

// Create admin user
const hashedPassword = bcrypt.hashSync('admin123', 10);
db.prepare("INSERT INTO admins (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)").run(
  'admin_default_001',
  'admin@opinioninsights.in',
  hashedPassword,
  'Admin',
  'admin'
);
console.log('Created admin: admin@opinioninsights.in / admin123');

// Verify
const admins = db.prepare("SELECT id, email, name, role FROM admins").all();
console.log('\nAdmins in database:', admins);

// Verify password hash
const admin = db.prepare("SELECT * FROM admins WHERE email = ?").get('admin@opinioninsights.in');
const match = bcrypt.compareSync('admin123', admin.password);
console.log('Password verification test:', match ? 'PASS' : 'FAIL');

db.close();
console.log('\nDone! You can now login with:');
console.log('  Email: admin@opinioninsights.in');
console.log('  Password: admin123');
