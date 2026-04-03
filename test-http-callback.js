// Test the full callback flow through HTTP endpoints
async function testCallbackFlow() {
    console.log('=== CALLBACK FLOW TEST (HTTP Only) ===\n')
    
    const BASE = 'http://localhost:3000'
    
    // Step 1: Hit the /r/ route to create a response record
    console.log('--- Step 1: Creating response via /r/ route ---')
    const entryUrl = `${BASE}/r/TEST_SINGLE/test_supplier/HTTP_TEST_${Date.now()}`
    console.log(`  URL: ${entryUrl}`)
    
    try {
        const entryResp = await fetch(entryUrl, { redirect: 'manual' })
        console.log(`  Status: ${entryResp.status}`)
        const location = entryResp.headers.get('location')
        console.log(`  Redirect: ${location || 'none'}`)
        
        // Extract oi_session from redirect URL
        if (location) {
            const url = new URL(location)
            const oiSession = url.searchParams.get('oisession') || url.searchParams.get('oi_session')
            console.log(`  oi_session from URL: ${oiSession}`)
            
            if (oiSession) {
                console.log('\n--- Step 2: Testing callback with oi_session ---')
                const callbackUrl = `${BASE}/api/callback?clickid=${oiSession}&status=complete`
                console.log(`  URL: ${callbackUrl}`)
                
                const cbResp = await fetch(callbackUrl, { redirect: 'manual' })
                console.log(`  Status: ${cbResp.status}`)
                const cbLocation = cbResp.headers.get('location')
                console.log(`  Redirect: ${cbLocation || 'none'}`)
                const cbBody = await cbResp.text()
                console.log(`  Body: ${cbBody}`)
                
                if (cbResp.status === 302 || cbResp.status === 307 || cbResp.status === 308) {
                    console.log('\n✅✅✅ SUCCESS: Callback redirected to status page!')
                } else if (cbResp.status === 200) {
                    console.log('\n✅ Callback returned 200 (idempotent - already complete)')
                } else {
                    console.log(`\n❌ Callback failed with status ${cbResp.status}`)
                }
            } else {
                console.log('\n⚠️ Could not extract oi_session from redirect URL')
            }
        }
    } catch (err) {
        console.error('  Error:', err.message)
    }
    
    console.log('\n=== TEST COMPLETE ===')
}

testCallbackFlow().catch(console.error)
