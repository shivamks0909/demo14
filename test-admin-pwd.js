const bcrypt = require('bcryptjs');
const hash = '$2b$10$GTaeGy/i5fbXyKXZ5x4TMOmg4DSUy6LgQe32LLG8gofVtnwsppFxK';

console.log('Testing admin password hash...');
console.log('Hash:', hash);
console.log('Hash starts with $2b$:', hash.startsWith('$2b$'));

const passwords = ['admin123', 'admin', 'password', 'Admin123!', 'admin@123', 'admin123!', 'OpinionInsights'];

async function test() {
  for (const pwd of passwords) {
    const result = await bcrypt.compare(pwd, hash);
    console.log(`  "${pwd}" => ${result ? 'MATCH' : 'no match'}`);
  }
}

test();
