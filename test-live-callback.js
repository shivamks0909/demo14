const { getUnifiedDb } = require('./lib/unified-db')
const crypto = require('crypto')

async function fullLiveTest() {
    console.log('=== FULL LIVE CALLBACK TEST ===\n')
    
    const { database: db } = await getUnifiedDb()
    if (!db) {
        console.error('❌ DB connection failed')
        process.exit(1)
    }
    console.log('✅ DB connected\n')

    // Step 1: Create a fresh test response
    const sessionToken = crypto.randomUUID()
    const testUid = `LIVE_${Date.now()}`
    const testTxnId = `TXN_${Date.now()}`
    
    console.log('--- Step 1: Creating test response ---')
    console.log(`  oi_session: ${sessionToken}`)
    console.log(`  uid: ${testUid}`)
    console.log(`  transaction_id: ${testTxnId}`)
    
    const { data: response, error: insertError } = await db
        .from('responses')
        .insert([{
            project_id: 'b997c786-68a0-4b18-bd5c-ea9db24b1bc7',
            project_code: 'TEST_SINGLE',
            project_name: 'Test Single Country Survey',
            uid: testUid,
            clickid: sessionToken,
            oi_session: sessionToken,
            session_token: sessionToken,
            transaction_id: testTxnId,
            status: 'in_progress',
            ip: '127.0.0.1',
            user_agent: 'LiveTest/1.0',
            device_type: 'Desktop',
            created_at: new Date().toISOString()
        }])
        .select()
        .single()

    if (insertError) {
        console.error('❌ Insert failed:', insertError)
        process.exit(1)
    }
    console.log(`✅ Response created: id=${response.id}, status=${response.status}\n`)

    // Step 2: Test callback via HTTP
    console.log('--- Step 2: Testing callback ---')
    const callbackUrl = `http://localhost:3000/api/callback?clickid=${sessionToken}&status=complete`
    console.log(`  URL: ${callbackUrl}`)
    
    try {
        const resp = await fetch(callbackUrl, { redirect: 'manual' })
        const body = await resp.text()
        console.log(`  Status: ${resp.status}`)
        console.log(`  Location: ${resp.headers.get('location') || 'none'}`)
        console.log(`  Body: ${body}`)
    } catch (err) {
        console.error('  Callback error:', err.message)
    }

    // Step 3: Verify DB update
    console.log('\n--- Step 3: Verifying DB update ---')
    const { data: updated } = await db
        .from('responses')
        .select('id, status, oi_session, transaction_id, updated_at')
        .eq('id', response.id)
        .single()

    if (updated) {
        console.log(`  ID: ${updated.id}`)
        console.log(`  Status: ${updated.status}`)
        console.log(`  oi_session: ${updated.oi_session}`)
        console.log(`  transaction_id: ${updated.transaction_id}`)
        console.log(`  updated_at: ${updated.updated_at}`)
        
        if (updated.status === 'complete') {
            console.log('\n✅✅✅ SUCCESS: Database updated correctly!')
        } else {
            console.log(`\n❌ FAILED: Expected status=complete, got ${updated.status}`)
        }
    } else {
        console.error('❌ Record not found after update')
    }

    // Step 4: Test terminate callback
    console.log('\n--- Step 4: Testing terminate callback ---')
    const termSession = crypto.randomUUID()
    const { data: termResponse } = await db
        .from('responses')
        .insert([{
            project_id: 'b997c786-68a0-4b18-bd5c-ea9db24b1bc7',
            project_code: 'TEST_SINGLE',
            uid: `TERM_${Date.now()}`,
            clickid: termSession,
            oi_session: termSession,
            session_token: termSession,
            transaction_id: `TERM_TXN_${Date.now()}`,
            status: 'in_progress',
            ip: '127.0.0.1',
            user_agent: 'LiveTest/1.0',
            device_type: 'Desktop',
            created_at: new Date().toISOString()
        }])
        .select()
        .single()

    const termUrl = `http://localhost:3000/api/callback?clickid=${termSession}&status=terminate`
    console.log(`  URL: ${termUrl}`)
    
    try {
        const resp = await fetch(termUrl, { redirect: 'manual' })
        const body = await resp.text()
        console.log(`  Status: ${resp.status}`)
        console.log(`  Body: ${body}`)
    } catch (err) {
        console.error('  Error:', err.message)
    }

    const { data: termUpdated } = await db
        .from('responses')
        .select('status')
        .eq('id', termResponse.id)
        .single()

    if (termUpdated?.status === 'terminate') {
        console.log('✅ Terminate callback worked!')
    } else {
        console.log(`❌ Terminate failed: status=${termUpdated?.status}`)
    }

    // Step 5: Test quota_full callback
    console.log('\n--- Step 5: Testing quota_full callback ---')
    const quotaSession = crypto.randomUUID()
    const { data: quotaResponse } = await db
        .from('responses')
        .insert([{
            project_id: 'b997c786-68a0-4b18-bd5c-ea9db24b1bc7',
            project_code: 'TEST_SINGLE',
            uid: `QUOTA_${Date.now()}`,
            clickid: quotaSession,
            oi_session: quotaSession,
            session_token: quotaSession,
            transaction_id: `QUOTA_TXN_${Date.now()}`,
            status: 'in_progress',
            ip: '127.0.0.1',
            user_agent: 'LiveTest/1.0',
            device_type: 'Desktop',
            created_at: new Date().toISOString()
        }])
        .select()
        .single()

    const quotaUrl = `http://localhost:3000/api/callback?clickid=${quotaSession}&status=quota_full`
    console.log(`  URL: ${quotaUrl}`)
    
    try {
        const resp = await fetch(quotaUrl, { redirect: 'manual' })
        const body = await resp.text()
        console.log(`  Status: ${resp.status}`)
        console.log(`  Body: ${body}`)
    } catch (err) {
        console.error('  Error:', err.message)
    }

    const { data: quotaUpdated } = await db
        .from('responses')
        .select('status')
        .eq('id', quotaResponse.id)
        .single()

    if (quotaUpdated?.status === 'quota_full') {
        console.log('✅ Quota full callback worked!')
    } else {
        console.log(`❌ Quota full failed: status=${quotaUpdated?.status}`)
    }

    // Step 6: Test security_terminate callback
    console.log('\n--- Step 6: Testing security_terminate callback ---')
    const secSession = crypto.randomUUID()
    const { data: secResponse } = await db
        .from('responses')
        .insert([{
            project_id: 'b997c786-68a0-4b18-bd5c-ea9db24b1bc7',
            project_code: 'TEST_SINGLE',
            uid: `SEC_${Date.now()}`,
            clickid: secSession,
            oi_session: secSession,
            session_token: secSession,
            transaction_id: `SEC_TXN_${Date.now()}`,
            status: 'in_progress',
            ip: '127.0.0.1',
            user_agent: 'LiveTest/1.0',
            device_type: 'Desktop',
            created_at: new Date().toISOString()
        }])
        .select()
        .single()

    const secUrl = `http://localhost:3000/api/callback?clickid=${secSession}&status=security_terminate`
    console.log(`  URL: ${secUrl}`)
    
    try {
        const resp = await fetch(secUrl, { redirect: 'manual' })
        const body = await resp.text()
        console.log(`  Status: ${resp.status}`)
        console.log(`  Body: ${body}`)
    } catch (err) {
        console.error('  Error:', err.message)
    }

    const { data: secUpdated } = await db
        .from('responses')
        .select('status')
        .eq('id', secResponse.id)
        .single()

    if (secUpdated?.status === 'security_terminate') {
        console.log('✅ Security terminate callback worked!')
    } else {
        console.log(`❌ Security terminate failed: status=${secUpdated?.status}`)
    }

    // Step 7: Test transaction_id lookup
    console.log('\n--- Step 7: Testing transaction_id callback ---')
    const txnSession = crypto.randomUUID()
    const txnId = `TXN_LOOKUP_${Date.now()}`
    const { data: txnResponse } = await db
        .from('responses')
        .insert([{
            project_id: 'b997c786-68a0-4b18-bd5c-ea9db24b1bc7',
            project_code: 'TEST_SINGLE',
            uid: `TXN_${Date.now()}`,
            clickid: txnSession,
            oi_session: txnSession,
            session_token: txnSession,
            transaction_id: txnId,
            status: 'in_progress',
            ip: '127.0.0.1',
            user_agent: 'LiveTest/1.0',
            device_type: 'Desktop',
            created_at: new Date().toISOString()
        }])
        .select()
        .single()

    // Callback using transaction_id as clickid
    const txnUrl = `http://localhost:3000/api/callback?clickid=${txnId}&status=complete`
    console.log(`  URL: ${txnUrl}`)
    console.log(`  (clickid = transaction_id, not oi_session)`)
    
    try {
        const resp = await fetch(txnUrl, { redirect: 'manual' })
        const body = await resp.text()
        console.log(`  Status: ${resp.status}`)
        console.log(`  Body: ${body}`)
    } catch (err) {
        console.error('  Error:', err.message)
    }

    const { data: txnUpdated } = await db
        .from('responses')
        .select('status')
        .eq('id', txnResponse.id)
        .single()

    if (txnUpdated?.status === 'complete') {
        console.log('✅ Transaction ID lookup worked!')
    } else {
        console.log(`❌ Transaction ID lookup failed: status=${txnUpdated?.status}`)
    }

    console.log('\n=== TEST COMPLETE ===')
}

fullLiveTest().catch(console.error)
