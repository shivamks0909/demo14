const Database = require('better-sqlite3');
const db = new Database('data/local.db');

// Update all project base URLs to point to local landing page
const projects = [
  { code: 'TEST001', url: 'http://localhost:3000/landing' },
  { code: 'PROJ001', url: 'http://localhost:3000/landing' },
  { code: 'TEST002', url: 'http://localhost:3000/landing' },
  { code: 'DYNAMIC_ENTRY', url: 'http://localhost:3000/landing' },
  { code: 'external_traffic', url: 'http://localhost:3000/landing' },
];

projects.forEach(p => {
  db.prepare("UPDATE projects SET base_url = ? WHERE project_code = ?").run(p.url, p.code);
  console.log(`✅ Updated ${p.code} -> ${p.url}`);
});

// Verify
const updated = db.prepare("SELECT project_code, base_url FROM projects").all();
console.log('\n📋 Updated URLs:');
updated.forEach(p => console.log(`  ${p.project_code}: ${p.base_url}`));

db.close();
