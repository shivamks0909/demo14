const Database = require('better-sqlite3');
const db = new Database('data/local.db');

const projects = db.prepare("SELECT id, project_code, project_name, base_url, status FROM projects WHERE status = 'active' LIMIT 5").all();
console.log('=== Active Projects ===');
projects.forEach(p => console.log(`  Code: ${p.project_code} | Name: ${p.project_name} | URL: ${p.base_url}`));

const suppliers = db.prepare("SELECT id, name, supplier_token, status FROM suppliers WHERE status = 'active' LIMIT 5").all();
console.log('\n=== Active Suppliers ===');
suppliers.forEach(s => console.log(`  Token: ${s.supplier_token} | Name: ${s.name}`));

if (projects.length > 0 && suppliers.length > 0) {
  const p = projects[0];
  const s = suppliers[0];
  const testUid = 'TEST_UID_' + Date.now();
  
  console.log('\n=== Test Links ===');
  console.log(`\n1. Route Traffic (Entry Point):`);
  console.log(`   http://localhost:3000/r/${p.project_code}/${s.supplier_token}/${testUid}`);
  
  console.log(`\n2. Admin Dashboard:`);
  console.log(`   http://localhost:3000/admin/responses`);
  
  console.log(`\n3. Admin Projects:`);
  console.log(`   http://localhost:3000/admin/projects`);
  
  console.log(`\n4. Callback (Complete):`);
  console.log(`   http://localhost:3000/api/callback?pid=${p.project_code}&cid=YOUR_CLICKID&type=complete`);
  
  console.log(`\n5. Callback (Terminate):`);
  console.log(`   http://localhost:3000/api/callback?pid=${p.project_code}&cid=YOUR_CLICKID&type=terminate`);
}

db.close();
