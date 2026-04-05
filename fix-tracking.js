const fs = require('fs');
let content = fs.readFileSync('lib/tracking-service.ts', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('.insert([{') && lines[i].includes('`n')) {
    lines[i] = '          .insert([{';
    lines.splice(i + 1, 0, '           id: `resp_${crypto.randomUUID()}`,');
    console.log('Fixed line ' + (i + 1));
    break;
  }
}

fs.writeFileSync('lib/tracking-service.ts', lines.join('\n'));
console.log('File saved');
