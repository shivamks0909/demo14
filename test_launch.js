const projectCode = 'LAUNCH_TEST_' + Math.floor(Math.random() * 1000);
const uid = 'LAUNCH_USER_' + Math.floor(Math.random() * 1000);
const surveyUrl = 'https://example-survey.com/start?q=1';
const encodedUrl = encodeURIComponent(surveyUrl);

const localRouterUrl = `http://localhost:3001/r/${projectCode}/${uid}?url=${encodedUrl}`;

async function verify() {
    console.log(`\n[Step 1] Hitting On-the-Fly Launch Link: ${localRouterUrl}`);
    try {
        const resp = await fetch(localRouterUrl, { redirect: 'manual' });
        const location = resp.headers.get('location');
        console.log(`Response status: ${resp.status}`);
        console.log(`Redirect Location: ${location}`);

        if (location && location.includes('example-survey.com')) {
            console.log('✅ Success: Correctly redirected to the external survey URL');
        } else {
            console.log('❌ Error: Expected redirect to example-survey.com, got ' + location);
        }
    } catch (e) {
        console.error('❌ Test failed unexpectedly:', e.message);
    }
}

verify();
