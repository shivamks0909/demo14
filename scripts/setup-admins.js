#!/usr/bin/env node
/**
 * Setup admins table and admin user in InsForge PostgreSQL
 */
const { Client } = require('pg')
const bcrypt = require('bcryptjs')

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:f6e75a96bb4301794302c738b94ab107@3gkhhr9f.us-east.database.insforge.app:5432/insforge?sslmode=require'

async function setup() {
    const client = new Client({ connectionString: DATABASE_URL })
    await client.connect()
    console.log('Connected to InsForge PostgreSQL\n')

    // Create admins table
    await client.query(`
        CREATE TABLE IF NOT EXISTS admins (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `)
    console.log('Created admins table')

    // Insert admin user
    const hash = bcrypt.hashSync('admin123', 10)
    await client.query(
        `INSERT INTO admins (email, password_hash)
         VALUES ($1, $2)
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
        ['admin@opinioninsights.com', hash]
    )
    console.log('Admin user ready: admin@opinioninsights.com / admin123')

    // List all tables
    const result = await client.query(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    )
    console.log('\nAll tables in database:')
    result.rows.forEach(r => console.log('  •', r.tablename))

    await client.end()
    console.log('\n✅ InsForge setup complete!')
}

setup().catch(e => {
    console.error('Error:', e.message)
    process.exit(1)
})
