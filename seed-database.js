/**
 * Comprehensive Database Seed Script
 * Seeds the SQLite database with active projects, clients, suppliers, and test data
 */

const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'data', 'local.db');
const db = new Database(dbPath);

console.log('🌱 Starting database seed...\n');

// Enable WAL mode
db.pragma('journal_mode = WAL');

// 1. Ensure clients exist
const existingClients = db.prepare('SELECT * FROM clients').all();
if (existingClients.length === 0) {
    console.log('📋 Creating clients...');
    const clients = [
        { id: 'cli_healthcare_001', name: 'HealthCorp Research' },
        { id: 'cli_tech_002', name: 'TechInsights Global' },
        { id: 'cli_consumer_003', name: 'ConsumerVoice Analytics' },
    ];
    const insertClient = db.prepare('INSERT OR IGNORE INTO clients (id, name) VALUES (?, ?)');
    for (const c of clients) {
        insertClient.run(c.id, c.name);
    }
    console.log(`   ✅ Created ${clients.length} clients\n`);
} else {
    console.log(`📋 Found ${existingClients.length} existing clients\n`);
}

// 2. Set existing project to active and add new active projects
const existingProjects = db.prepare('SELECT * FROM projects').all();
console.log(`📊 Found ${existingProjects.length} existing projects`);

// Activate existing PROJ001
db.prepare("UPDATE projects SET status = 'active' WHERE project_code = 'PROJ001'").run();
console.log('   ✅ Activated PROJ001\n');

// Add test projects if they don't exist
const testProjects = [
    {
        id: 'proj_test_001',
        project_code: 'TEST001',
        project_name: 'Test Survey - Active',
        base_url: 'https://survey.example.com/test001',
        status: 'active',
        client_id: 'cli_healthcare_001',
        country: 'US',
        is_multi_country: 0,
        has_prescreener: 0,
        prescreener_url: '',
        complete_target: 1000,
        country_urls: '[]',
        pid_prefix: 'TS',
        pid_counter: 1,
        pid_padding: 4,
        force_pid_as_uid: 0,
        target_uid: '',
        client_pid_param: 'pid',
        client_uid_param: 'uid',
        oi_prefix: 'oi_',
        uid_params: null,
        source: 'manual',
    },
    {
        id: 'proj_test_002',
        project_code: 'TEST002',
        project_name: 'Multi-Country Survey',
        base_url: 'https://survey.example.com/test002',
        status: 'active',
        client_id: 'cli_tech_002',
        country: 'Global',
        is_multi_country: 1,
        has_prescreener: 1,
        prescreener_url: 'https://survey.example.com/prescreen',
        complete_target: 500,
        country_urls: JSON.stringify([
            { country_code: 'US', target_url: 'https://survey.example.com/us', active: true },
            { country_code: 'UK', target_url: 'https://survey.example.com/uk', active: true },
            { country_code: 'CA', target_url: 'https://survey.example.com/ca', active: true },
        ]),
        pid_prefix: 'MC',
        pid_counter: 1,
        pid_padding: 4,
        force_pid_as_uid: 0,
        target_uid: '',
        client_pid_param: 'code',
        client_uid_param: 'rid',
        oi_prefix: 'oi_',
        uid_params: JSON.stringify([
            { param: 'transactionId', value: 'session' },
            { param: 'uid', value: 'client_rid' },
        ]),
        source: 'manual',
    },
    {
        id: 'proj_dynamic_entry',
        project_code: 'DYNAMIC_ENTRY',
        project_name: 'Dynamic Entry Fallback',
        base_url: 'https://survey.example.com/dynamic',
        status: 'active',
        client_id: 'cli_consumer_003',
        country: 'Global',
        is_multi_country: 0,
        has_prescreener: 0,
        prescreener_url: '',
        complete_target: 10000,
        country_urls: '[]',
        pid_prefix: '',
        pid_counter: 1,
        pid_padding: 2,
        force_pid_as_uid: 0,
        target_uid: '',
        client_pid_param: 'pid',
        client_uid_param: 'uid',
        oi_prefix: 'oi_',
        uid_params: null,
        source: 'auto',
    },
];

const insertProject = db.prepare(`
    INSERT OR IGNORE INTO projects (
        id, project_code, project_name, base_url, status, client_id, country,
        is_multi_country, has_prescreener, prescreener_url, complete_target,
        country_urls, pid_prefix, pid_counter, pid_padding, force_pid_as_uid,
        target_uid, client_pid_param, client_uid_param, oi_prefix, uid_params, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let newProjects = 0;
for (const p of testProjects) {
    const exists = db.prepare('SELECT id FROM projects WHERE project_code = ?').get(p.project_code);
    if (!exists) {
        insertProject.run(
            p.id, p.project_code, p.project_name, p.base_url, p.status, p.client_id, p.country,
            p.is_multi_country, p.has_prescreener, p.prescreener_url, p.complete_target,
            p.country_urls, p.pid_prefix, p.pid_counter, p.pid_padding, p.force_pid_as_uid,
            p.target_uid, p.client_pid_param, p.client_uid_param, p.oi_prefix, p.uid_params, p.source
        );
        newProjects++;
        console.log(`   ✅ Created project: ${p.project_code} (${p.project_name})`);
    } else {
        console.log(`   ⏭️  Project exists: ${p.project_code}`);
    }
}
console.log(`\n📊 Total projects: ${db.prepare('SELECT COUNT(*) as count FROM projects').get().count}\n`);

// 3. Ensure suppliers exist
const existingSuppliers = db.prepare('SELECT * FROM suppliers').all();
if (existingSuppliers.length === 0) {
    console.log('🤝 Creating suppliers...');
    const suppliers = [
        {
            id: 'sup_prolific_001',
            name: 'Prolific',
            supplier_token: 'prolific_token',
            contact_email: 'api@prolific.com',
            platform_type: 'prolific',
            uid_macro: '[UID]',
            complete_redirect_url: 'https://app.prolific.com/submissions/complete?cc=COMPLETED',
            terminate_redirect_url: 'https://app.prolific.com/submissions/complete?cc=TERMINATED',
            quotafull_redirect_url: 'https://app.prolific.com/submissions/complete?cc=QUOTAFULL',
            notes: 'Primary supplier panel',
            status: 'active',
        },
        {
            id: 'sup_cloudresearch_002',
            name: 'CloudResearch',
            supplier_token: 'cloudresearch_token',
            contact_email: 'api@cloudresearch.com',
            platform_type: 'cloudresearch',
            uid_macro: '{UID}',
            complete_redirect_url: 'https://app.cloudresearch.com/complete',
            terminate_redirect_url: 'https://app.cloudresearch.com/terminate',
            quotafull_redirect_url: 'https://app.cloudresearch.com/quotafull',
            notes: 'Secondary supplier panel',
            status: 'active',
        },
    ];
    const insertSupplier = db.prepare(`
        INSERT OR IGNORE INTO suppliers (
            id, name, supplier_token, contact_email, platform_type,
            uid_macro, complete_redirect_url, terminate_redirect_url,
            quotafull_redirect_url, notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const s of suppliers) {
        insertSupplier.run(
            s.id, s.name, s.supplier_token, s.contact_email, s.platform_type,
            s.uid_macro, s.complete_redirect_url, s.terminate_redirect_url,
            s.quotafull_redirect_url, s.notes, s.status
        );
    }
    console.log(`   ✅ Created ${suppliers.length} suppliers\n`);
} else {
    console.log(`🤝 Found ${existingSuppliers.length} existing suppliers\n`);
}

// 4. Create supplier-project links
const allProjects = db.prepare('SELECT * FROM projects').all();
const allSuppliers = db.prepare('SELECT * FROM suppliers').all();

// Ensure supplier_project_links has status column
const linkTableColumns = db.pragma('table_info(supplier_project_links)');
const linkColNames = linkTableColumns.map(col => col.name);
if (!linkColNames.includes('status')) {
    console.log('🔧 Adding missing status column to supplier_project_links...');
    db.exec("ALTER TABLE supplier_project_links ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
    console.log('   ✅ Added status column\n');
}

if (allProjects.length > 0 && allSuppliers.length > 0) {
    console.log('🔗 Creating supplier-project links...');
    const insertLink = db.prepare(`
        INSERT OR IGNORE INTO supplier_project_links (id, supplier_id, project_id, quota_allocated, quota_used, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    for (const project of allProjects) {
        if (project.project_code === 'DYNAMIC_ENTRY' || project.project_code === 'external_traffic') continue;
        for (const supplier of allSuppliers) {
            const exists = db.prepare(
                'SELECT id FROM supplier_project_links WHERE supplier_id = ? AND project_id = ?'
            ).get(supplier.id, project.id);
            if (!exists) {
                const linkId = `link_${crypto.randomUUID()}`;
                insertLink.run(linkId, supplier.id, project.id, project.complete_target || 1000, 0, 'active');
                console.log(`   ✅ Linked ${supplier.name} → ${project.project_code}`);
            }
        }
    }
    console.log('');
}

// 5. Add some test responses
const existingResponses = db.prepare('SELECT COUNT(*) as count FROM responses').get().count;
if (existingResponses < 5) {
    console.log('📝 Creating test responses...');
    const testProject = allProjects.find(p => p.project_code === 'TEST001');
    if (testProject) {
        const insertResponse = db.prepare(`
            INSERT OR IGNORE INTO responses (
                id, project_id, project_code, project_name, uid, clickid, oi_session,
                session_token, status, ip, user_agent, device_type, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const testResponses = [
            { status: 'complete', uid: 'user_001', clickid: 'click_001' },
            { status: 'complete', uid: 'user_002', clickid: 'click_002' },
            { status: 'terminate', uid: 'user_003', clickid: 'click_003' },
            { status: 'in_progress', uid: 'user_004', clickid: 'click_004' },
            { status: 'quota_full', uid: 'user_005', clickid: 'click_005' },
        ];
        
        for (const r of testResponses) {
            const respId = `resp_${crypto.randomUUID()}`;
            const sessionId = crypto.randomUUID();
            insertResponse.run(
                respId, testProject.id, testProject.project_code, testProject.project_name,
                r.uid, r.clickid, sessionId, sessionId, r.status,
                '127.0.0.1', 'Mozilla/5.0 Test Browser', 'desktop',
                new Date().toISOString()
            );
            console.log(`   ✅ Created response: ${r.status} (${r.uid})`);
        }
    }
    console.log('');
}

// 6. Verify final state
console.log('📊 Final Database State:');
console.log('   Projects:', db.prepare('SELECT COUNT(*) as count FROM projects').get().count);
console.log('   Active Projects:', db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'active'").get().count);
console.log('   Clients:', db.prepare('SELECT COUNT(*) as count FROM clients').get().count);
console.log('   Suppliers:', db.prepare('SELECT COUNT(*) as count FROM suppliers').get().count);
console.log('   Responses:', db.prepare('SELECT COUNT(*) as count FROM responses').get().count);
console.log('   Links:', db.prepare('SELECT COUNT(*) as count FROM supplier_project_links').get().count);

console.log('\n📋 Active Project Codes:');
const activeProjects = db.prepare("SELECT project_code, project_name, base_url FROM projects WHERE status = 'active'").all();
for (const p of activeProjects) {
    console.log(`   - ${p.project_code}: ${p.project_name} (${p.base_url})`);
}

console.log('\n✅ Database seed complete!');

db.close();
