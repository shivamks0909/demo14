const { createClient } = require('@insforge/sdk');
require('dotenv').config({ path: '.env.local' });

// Setup DB connection
const db = createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL,
    anonKey: process.env.INSFORGE_API_KEY
});

async function runLiveTest() {
    console.log("=== STARTING LIVE END-TO-END TEST ===");

    const startUrl = 'http://localhost:3000/start/MTkxNkAyOA==?uid=live_test_uid_2128';
    console.log(`\n1. Simulating survey entry (Respondent clicks URL)`);
    console.log(`   GET ${startUrl}`);

    let redirectLocation = '';
    
    try {
        const res = await fetch(startUrl, { redirect: 'manual' });
        redirectLocation = res.headers.get('location');
        console.log(`   Status: ${res.status}`);
        console.log(`   Redirected To: ${redirectLocation}`);
        
        if (!redirectLocation || redirectLocation.includes('paused')) {
            console.error("   ❌ Failed to route successfully. Server might be down or code missing.");
            return;
        }
    } catch (e) {
        console.error("   ❌ Fetch failed. Make sure your local server is running on port 3000!");
        return;
    }

    // Attempt to extract session or uid from redirectLocation to return
    console.log(`\n2. Respondent takes the survey and returns via /complete`);
    
    let redirectUrl;
    try {
        redirectUrl = new URL(redirectLocation);
    } catch (e) {
         console.error("   ❌ Invalid redirect URL");
         return;
    }
    
    const oiSession = redirectUrl.searchParams.get('oi_session');
    
    if (!oiSession) {
        console.error("   ❌ oi_session not found in the redirect URL. Something is wrong.");
        return;
    }
    
    // Simulate return
    const completeUrl = `http://localhost:3000/complete?pid=MTkxNkAyOA==&uid=live_test_uid_2128&oi_session=${oiSession}`;
    console.log(`   Hitting Return URL: GET ${completeUrl}`);

    try {
        const resComplete = await fetch(completeUrl);
        console.log(`   Complete Page Status: ${resComplete.status} (Renders UI)`);
    } catch (e) {
        console.error("   ❌ Return hit failed:", e.message);
        return;
    }

    console.log(`\n3. Verifying Database Status Update (Checking Admin Response logic)`);
    
    // Give NextJS server component a moment to commit to DB
    await new Promise(r => setTimeout(r, 1500));

    // Verify
    const { data: responseRecord, error } = await db.database
        .from('responses')
        .select('*')
        .eq('oi_session', oiSession)
        .maybeSingle();

    if (error) {
        console.error("   ❌ Database lookup error:", error);
        return;
    }

    if (!responseRecord) {
        console.error("   ❌ Could not find the response tracking record. Entry failed.");
    } else {
        console.log(`   Found Tracking Record ID: ${responseRecord.id}`);
        console.log(`   Current Status: ${responseRecord.status}`);
        
        if (responseRecord.status === 'complete') {
            console.log(`\n✅ LIVE TEST PASSED! The response status correctly updated to 'complete' when respondent returned.`);
        } else {
            console.error(`\n❌ LIVE TEST FAILED! The response status is still '${responseRecord.status}'.`);
        }
    }
    
    console.log("\n=== TEST COMPLETED ===");
}

runLiveTest();
