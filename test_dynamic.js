// Native fetch used

const projectCode = 'NEW_PROJECT_X'; // This does not exist in DB
const uid = 'AUTO_USER_999';
const status = 'complete';

const url = `http://localhost:3000/r/${projectCode}/${uid}?status=${status}`;

async function test() {
    console.log(`[Test] Hitting Dynamic Gateway Link: ${url}`);
    try {
        const resp = await fetch(url, { redirect: 'manual' });
        console.log(`Response Status: ${resp.status}`);
        console.log(`Redirect Location: ${resp.headers.get('location')}`);
        
        if (resp.headers.get('location')?.includes('/complete')) {
            console.log('✅ PASS: Correctly redirected to landing page');
        } else {
            console.log('❌ FAIL: Wrong redirect');
        }
    } catch (e) {
        console.error('Test failed:', e.message);
    }
}

test();
