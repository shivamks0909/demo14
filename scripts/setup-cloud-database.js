/**
 * Cloud Database Setup Script
 * Creates full schema in InsForge cloud PostgreSQL
 */
const { Pool } = require('pg');

const pool = new Pool({
    host: 'jezv8m6h.us-east.database.insforge.app',
    port: 5432,
    database: 'insforge',
    user: 'postgres',
    password: '0a156b80474676c74eca51424ea20685',
    ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
    const client = await pool.connect();
    
    try {
        console.log('🔌 Connected to InsForge Cloud PostgreSQL...\n');

        // Test connection
        const testResult = await client.query('SELECT NOW()');
        console.log('✅ Database connection verified:', testResult.rows[0].now);

        // Drop existing tables (in reverse dependency order)
        console.log('\n🗑️  Dropping existing tables...');
        await client.query('DROP TABLE IF EXISTS audit_logs CASCADE');
        await client.query('DROP TABLE IF EXISTS s2s_logs CASCADE');
        await client.query('DROP TABLE IF EXISTS callback_logs CASCADE');
        await client.query('DROP TABLE IF EXISTS responses CASCADE');
        await client.query('DROP TABLE IF EXISTS projects CASCADE');
        await client.query('DROP TABLE IF EXISTS suppliers CASCADE');
        console.log('✅ Tables dropped');

        // Create suppliers table
        console.log('\n📋 Creating suppliers table...');
        await client.query(`
            CREATE TABLE suppliers (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                supplier_token VARCHAR(255) UNIQUE NOT NULL,
                status VARCHAR(50) DEFAULT 'active',
                contact_email VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Suppliers table created');

        // Create projects table
        console.log('\n📋 Creating projects table...');
        await client.query(`
            CREATE TABLE projects (
                id VARCHAR(255) PRIMARY KEY,
                project_code VARCHAR(100) UNIQUE NOT NULL,
                project_name VARCHAR(255) NOT NULL,
                base_url TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'active',
                source VARCHAR(50) DEFAULT 'manual',
                supplier_id VARCHAR(255) REFERENCES suppliers(id),
                client_pid_param VARCHAR(100),
                client_uid_param VARCHAR(100),
                uid_params JSONB,
                oi_prefix VARCHAR(50) DEFAULT 'oi_',
                pid_prefix VARCHAR(50),
                pid_padding INTEGER DEFAULT 2,
                pid_counter INTEGER DEFAULT 0,
                is_multi_country BOOLEAN DEFAULT false,
                country_urls JSONB,
                allowed_countries TEXT[],
                geo_targeting BOOLEAN DEFAULT false,
                target_country VARCHAR(10),
                quota_limit INTEGER,
                daily_cap INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Projects table created');

        // Create responses table
        console.log('\n📋 Creating responses table...');
        await client.query(`
            CREATE TABLE responses (
                id VARCHAR(255) PRIMARY KEY,
                project_id VARCHAR(255) REFERENCES projects(id),
                project_code VARCHAR(100),
                project_name VARCHAR(255),
                uid VARCHAR(255),
                oi_session VARCHAR(255),
                clickid VARCHAR(255),
                session_token VARCHAR(255),
                status VARCHAR(50) DEFAULT 'in_progress',
                ip VARCHAR(45),
                user_agent TEXT,
                device_type VARCHAR(50),
                country VARCHAR(10),
                supplier_id VARCHAR(255) REFERENCES suppliers(id),
                start_time TIMESTAMP,
                completion_time TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Responses table created');

        // Create callback_logs table
        console.log('\n📋 Creating callback_logs table...');
        await client.query(`
            CREATE TABLE callback_logs (
                id SERIAL PRIMARY KEY,
                project_code VARCHAR(100),
                clickid VARCHAR(255),
                type VARCHAR(50),
                status_mapped VARCHAR(50),
                response_code INTEGER,
                response_body TEXT,
                latency_ms INTEGER,
                raw_query TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                success BOOLEAN,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Callback_logs table created');

        // Create s2s_logs table
        console.log('\n📋 Creating s2s_logs table...');
        await client.query(`
            CREATE TABLE s2s_logs (
                id SERIAL PRIMARY KEY,
                response_id VARCHAR(255),
                project_id VARCHAR(255),
                hash_match BOOLEAN,
                ip_match BOOLEAN,
                timestamp_check BOOLEAN,
                overall_result INTEGER,
                callback_url TEXT,
                callback_method VARCHAR(10),
                callback_status INTEGER,
                callback_response TEXT,
                payload TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ S2s_logs table created');

        // Create audit_logs table
        console.log('\n📋 Creating audit_logs table...');
        await client.query(`
            CREATE TABLE audit_logs (
                id SERIAL PRIMARY KEY,
                event_type VARCHAR(100),
                payload JSONB,
                ip VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Audit_logs table created');

        // Create indexes
        console.log('\n📊 Creating indexes...');
        await client.query('CREATE INDEX idx_responses_oi_session ON responses(oi_session)');
        await client.query('CREATE INDEX idx_responses_clickid ON responses(clickid)');
        await client.query('CREATE INDEX idx_responses_project_code ON responses(project_code)');
        await client.query('CREATE INDEX idx_responses_status ON responses(status)');
        await client.query('CREATE INDEX idx_responses_uid ON responses(uid)');
        await client.query('CREATE INDEX idx_responses_project_status ON responses(project_code, status)');
        await client.query('CREATE INDEX idx_responses_uid_project ON responses(uid, project_code)');
        await client.query('CREATE INDEX idx_projects_code ON projects(project_code)');
        await client.query('CREATE INDEX idx_projects_status ON projects(status)');
        await client.query('CREATE INDEX idx_callback_logs_created ON callback_logs(created_at)');
        await client.query('CREATE INDEX idx_audit_logs_event ON audit_logs(event_type)');
        console.log('✅ Indexes created');

        // Seed test data
        console.log('\n🌱 Seeding test data...');
        
        // Insert test supplier
        await client.query(`
            INSERT INTO suppliers (id, name, supplier_token, status)
            VALUES ('sup_test_001', 'Test Supplier', 'test_token_001', 'active')
            ON CONFLICT (id) DO NOTHING
        `);

        // Insert test projects
        await client.query(`
            INSERT INTO projects (id, project_code, project_name, base_url, status, source, client_pid_param, client_uid_param, oi_prefix)
            VALUES 
                ('proj_001', 'PROJ001', 'Test Project Alpha', 'https://survey.example.com/alpha', 'active', 'manual', 'pid', 'uid', 'oi_'),
                ('proj_002', 'PROJ002', 'Test Project Beta', 'https://survey.example.com/beta', 'active', 'manual', 'pid', 'uid', 'oi_'),
                ('proj_003', 'PROJ003', 'Test Project Gamma', 'https://survey.example.com/gamma', 'paused', 'manual', 'pid', 'uid', 'oi_'),
                ('proj_dynamic', 'DYNAMIC_ENTRY', 'Dynamic Entry Point', 'https://survey.example.com/dynamic', 'active', 'system', 'pid', 'uid', 'oi_')
            ON CONFLICT (id) DO NOTHING
        `);

        // Insert test responses
        await client.query(`
            INSERT INTO responses (id, project_id, project_code, project_name, uid, oi_session, clickid, session_token, status, ip, user_agent, device_type, start_time, created_at)
            VALUES 
                ('resp_test_001', 'proj_001', 'PROJ001', 'Test Project Alpha', 'user001', 'session_001', 'session_001', 'session_001', 'complete', '192.168.1.1', 'Mozilla/5.0', 'Desktop', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour'),
                ('resp_test_002', 'proj_001', 'PROJ001', 'Test Project Alpha', 'user002', 'session_002', 'session_002', 'session_002', 'in_progress', '192.168.1.2', 'Mozilla/5.0', 'Mobile', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes'),
                ('resp_test_003', 'proj_002', 'PROJ002', 'Test Project Beta', 'user003', 'session_003', 'session_003', 'session_003', 'terminate', '192.168.1.3', 'Mozilla/5.0', 'Desktop', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours')
            ON CONFLICT (id) DO NOTHING
        `);

        console.log('✅ Test data seeded');

        // Verify tables
        console.log('\n🔍 Verifying tables...');
        const tables = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        console.log('📋 Tables in database:');
        tables.rows.forEach(row => console.log(`   - ${row.table_name}`));

        // Count records
        const projects = await client.query('SELECT COUNT(*) FROM projects');
        const responses = await client.query('SELECT COUNT(*) FROM responses');
        const suppliers = await client.query('SELECT COUNT(*) FROM suppliers');
        
        console.log('\n📊 Record counts:');
        console.log(`   - Projects: ${projects.rows[0].count}`);
        console.log(`   - Responses: ${responses.rows[0].count}`);
        console.log(`   - Suppliers: ${suppliers.rows[0].count}`);

        console.log('\n✅ Database setup complete!');
        console.log('\n🔗 Connection String:');
        console.log('   postgresql://postgres:***@jezv8m6h.us-east.database.insforge.app:5432/insforge?sslmode=require');

    } catch (error) {
        console.error('❌ Error setting up database:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

setupDatabase().catch(console.error);
