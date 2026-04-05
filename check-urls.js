const Database = require('better-sqlite3');
const db = new Database('data/local.db');
const projects = db.prepare("SELECT project_code, project_name, base_url, status FROM projects WHERE status = 'active'").all();
projects.forEach(p => console.log(`${p.project_code}: ${p.base_url}`));
db.close();
