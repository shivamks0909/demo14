require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:f6e75a96bb4301794302c738b94ab107@3gkhhr9f.us-east.database.insforge.app:5432/insforge?sslmode=require';

// Helper to generate UUIDs
const { randomUUID } = require('crypto');

async function seedInsForgeDb() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('[Seed] Connected to InsForge...');

    // 1. Clients
    const clientId = randomUUID();
    await client.query(`
      INSERT INTO clients (id, name, created_at)
      VALUES ($1, 'Test Client Inc.', NOW())
      ON CONFLICT DO NOTHING
    `, [clientId]);

    // 2. Projects
    const projects = [
      ['TEST_SINGLE', 'Test Single Country', 'https://survey.example.com/single?uid=[UID]', 'active', 'US', false],
      ['TEST_MULTI', 'Test Multi Country', 'https://survey.example.com/multi?uid=[UID]', 'active', 'Global', true],
      ['TEST_PAUSED', 'Test Paused', 'https://survey.example.com/paused?uid=[UID]', 'paused', 'US', false]
    ];
    let projectIds = {};
    for (const [code, name, url, status, country, multi] of projects) {
      const pid = randomUUID();
      projectIds[code] = pid;
      await client.query(`
        INSERT INTO projects (id, project_code, project_name, base_url, status, country, is_multi_country, client_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT DO NOTHING
      `, [pid, code, name, url, status, country, multi, clientId]);
    }

    // 3. Suppliers
    const suppliers = [
      ['DYN01', 'Dynata', 'dyn', 'https://dynata.com/complete', 'https://dynata.com/terminate', 'https://dynata.com/quota'],
      ['LUC01', 'Lucid', 'luc', 'https://lucid.com/complete', 'https://lucid.com/terminate', 'https://lucid.com/quota'],
      ['CIN01', 'Cint', 'cin', 'https://cint.com/complete', 'https://cint.com/terminate', 'https://cint.com/quota']
    ];
    let suppIds = {};
    for (const [code, name, macro, comp, term, quota] of suppliers) {
      const sid = randomUUID();
      suppIds[code] = sid;
      await client.query(`
        INSERT INTO suppliers (id, name, supplier_token, uid_macro, complete_redirect_url, terminate_redirect_url, quotafull_redirect_url, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT DO NOTHING
      `, [sid, name, code, macro, comp, term, quota]);
    }

    // 4. Links
    await client.query(`
      INSERT INTO supplier_project_links (id, project_id, supplier_id, quota_allocated, cpi, cpi_currency, created_at)
      VALUES 
        ($1, $2, $3, 500, 2.50, 'USD', NOW()),
        ($4, $2, $5, 250, 2.75, 'USD', NOW()),
        ($6, $7, $8, 1000, 1.50, 'EUR', NOW())
      ON CONFLICT DO NOTHING
    `, [randomUUID(), projectIds['TEST_SINGLE'], suppIds['DYN01'], 
        randomUUID(), suppIds['LUC01'], 
        randomUUID(), projectIds['TEST_MULTI'], suppIds['CIN01']]);

    console.log('✅ InsForge DB seeded successfully!');

  } catch (err) {
    console.error('❌ Seeding error:', err);
  } finally {
    await client.end();
  }
}

seedInsForgeDb();
