#!/usr/bin/env node
/**
 * Create Admin User - Survey Routing Platform
 *
 * Creates an admin user in the local SQLite database.
 * For production, run against your InsForge/PostgreSQL database.
 *
 * Usage:
 *   node create-admin.js [email] [password]
 *
 * Default:
 *   Email: admin@opinioninsights.com
 *   Password: admin123
 */

const path = require('path');
const fs = require('fs');

const email = process.argv[2] || 'admin@opinioninsights.com';
const password = process.argv[3] || 'admin123';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'local.db');

try {
    const Database = require('better-sqlite3');
    const bcrypt = require('bcryptjs');
    const { randomUUID } = require('crypto');

    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    // Ensure admins table exists
    db.exec(`
        CREATE TABLE IF NOT EXISTS admins (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    const hashedPassword = bcrypt.hashSync(password, 10);
    const id = randomUUID();

    try {
        db.prepare(`INSERT INTO admins (id, email, password_hash) VALUES (?, ?, ?)`)
            .run(id, email, hashedPassword);

        console.log('\n✅ Admin user created successfully!\n');
        console.log(`  Email:    ${email}`);
        console.log(`  Password: ${password}`);
        console.log(`  DB:       ${dbPath}`);
        console.log('\nLogin at: http://localhost:3000/login\n');
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE constraint')) {
            // Update existing
            db.prepare(`UPDATE admins SET password_hash = ? WHERE email = ?`)
                .run(hashedPassword, email);
            console.log('\n✅ Admin password updated!\n');
            console.log(`  Email:    ${email}`);
            console.log(`  Password: ${password}`);
            console.log('\nLogin at: http://localhost:3000/login\n');
        } else {
            throw err;
        }
    }

    db.close();
} catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
        console.error('\n❌ Required module missing. Run:\n\n  npm install better-sqlite3 bcryptjs\n\nThen try again.\n');
    } else {
        console.error('\n❌ Error:', error.message);
    }
    process.exit(1);
}
