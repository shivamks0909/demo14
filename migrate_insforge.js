const fs = require('fs');
const path = require('path');

const DIRECTORIES = [
  path.join(__dirname, 'app'),
  path.join(__dirname, 'components'),
  path.join(__dirname, 'lib')
];

function processFile(filePath) {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js')) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(/await supabase/g, "await insforge.database");
    content = content.replace(/=\s*supabase\b(?!\.)/g, "= insforge.database");
    content = content.replace(/supabase(\s*\n?\s*)\.from/g, "insforge.database$1.from");
    content = content.replace(/supabase(\s*\n?\s*)\.rpc/g, "insforge.database$1.rpc");
    
    // extra for check_db.ts
    content = content.replace(/['"]\.\/lib\/supabase-server['"]/g, "'./lib/insforge-server'");
    content = content.replace(/['"]\.\/lib\/supabase['"]/g, "'./lib/insforge'");
    content = content.replace(/const supabase = /g, "const insforge = ");
    content = content.replace(/!supabase/g, "!insforge");

    if (original !== content) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated:', filePath);
    }
  }
}

function traverseDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverseDir(fullPath);
    } else {
      processFile(fullPath);
    }
  }
}

DIRECTORIES.forEach(dir => traverseDir(dir));
processFile(path.join(__dirname, 'check_db.ts'));
console.log('Migration string replacements for supabase object complete.');
