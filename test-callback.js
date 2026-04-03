// Test callback URL parsing
const { URL } = require('url');

const testUrl = 'http://localhost:3000/api/callback?clickid=test_session_new_456&status=complete';
const url = new URL(testUrl);

console.log('URL:', testUrl);
console.log('---');

const cid = url.searchParams.get('cid') || url.searchParams.get('clickid') || url.searchParams.get('uid');
const type = url.searchParams.get('type') || url.searchParams.get('status');
const pid = url.searchParams.get('pid') || url.searchParams.get('code');

console.log('Extracted pid:', pid);
console.log('Extracted cid:', cid);
console.log('Extracted type:', type);
console.log('---');
console.log('cid truthy:', !!cid);
console.log('type truthy:', !!type);
console.log('Check: !cid || !type =', !cid || !type);
