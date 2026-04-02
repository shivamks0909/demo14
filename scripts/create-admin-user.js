#!/usr/bin/env node

/**
 * Create admin user for dashboard login
 *
 * Usage:
 *   node scripts/create-admin-user.js "email" "password" "Full Name"
 *
 * Example:
 *   node scripts/create-admin-user.js admin@example.com MySecurePass123 "System Admin"
 */

const { Client } = require('pg');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const connectionString = process.argv[5] || process.env.DATABASE_URL;

// Parse arguments
const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4];

if (!email || !password || !name) {
    console.error(`
Usage: node scripts/create-admin-user.js "email" "password" "Full Name"

Example:
  node scripts/create-admin-user.js admin@example.com MySecurePass123 "System Admin"

Optional: set DATABASE_URL environment variable for live DB
`);
    process.exit(1);
}

async function createUser() {
    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('Connected to database\n');

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Try to insert (will fail if email exists)
        const query = `
            INSERT INTO users (email, password, name, role, status)
            VALUES ($1, $2, $3, 'admin', 'active')
            RETURNING id, email, name, role, created_at
        `;

        try {
            const result = await client.query(query, [email, hashedPassword, name]);
            console.log('✅ Admin user created successfully!');
            console.log('');
            console.log('User details:');
            console.log(`  ID: ${result.rows[0].id}`);
            console.log(`  Email: ${result.rows[0].email}`);
            console.log(`  Name: ${result.rows[0].name}`);
            console.log(`  Role: ${result.rows[0].role}`);
            console.log(`  Created: ${result.rows[0].created_at}`);
            console.log('');
            console.log('You can now login at: http://localhost:3000/login');
            console.log('Email:', email);
            console.log('Password:', password);

        } catch (insertError) {
            if (insertError.code === '23505') {
                // Unique violation - user already exists
                console.log('⚠️  User with this email already exists.');
                console.log('');
                console.log('To reset password:');
                console.log(`  UPDATE users SET password = '${hashedPassword}' WHERE email = '${email}';`);
            } else {
                throw insertError;
            }
        }

    } catch (error) {
        console.error('Failed to create user:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

createUser();
