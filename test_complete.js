const { updateResponseStatus } = require('./lib/landingService');
require('dotenv').config({ path: '.env.local' });

async function testComplete() {
    console.log("--- Testing updateResponseStatus ---");
    const pid = 'asdaweqdw';
    const uid = 'vff';
    const sid = 'e23ef197-8e08-4bc8-bf46-f8d7f83e016a';

    try {
        const result = await updateResponseStatus(pid, uid, 'complete', sid, '/test-complete');
        if (result) {
            console.log("✅ SUCCESS: Updated response status to complete");
            console.log(JSON.stringify(result, null, 2));
        } else {
            console.log("❌ FAILURE: Could not update response status");
        }
    } catch (err) {
        console.error("Test Error:", err);
    }
}

testComplete();
