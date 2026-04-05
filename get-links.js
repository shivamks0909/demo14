const Database = require('better-sqlite3');
const db = new Database('data/local.db');
const projects = db.prepare("SELECT project_code, project_name, base_url, status FROM projects WHERE status = 'active'").all();
const links = db.prepare('SELECT spl.project_code, s.supplier_name FROM supplier_project_links spl JOIN suppliers s ON spl.supplier_id = s.id').all();
console.log(JSON.stringify({ projects, links }));
db.close();
