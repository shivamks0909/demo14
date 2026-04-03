/**
 * End-to-End Callback Flow Test
 * 
 * Tests the complete pipeline:
 * 1. Entry via /r/{code}/{supplier}/{uid}
 * 2. Verify DB record creation with correct identifiers
 * 3. Trigger callback with correct clickid/oi_session
 * 4. Verify DB status update
 * 5. Test all status types: complete, terminate, quota_full, security_terminate
 */

import { getUnifiedDb } from './lib/unified-db'
import * as crypto from 'crypto'

const BASE_URL = 'http://localhost:3000'

// Test configuration
const TEST_CONFIG = {
    projectCode: 'TEST_PROJECT',
    supplierToken: 'test_supplier',
    uid: `test_user_${Date.now()}`
}

async function runTests() {
    console.log('=== END-TO-END CALLBACK FLOW TEST ===\n')
    
    const { database: db } = await getUnifiedDb()
    if (!db) {
        console.error('❌ Database connection failed')
        process.exit(1)
    }
    console.log('✅ Database connected\n')

    // Step 1: Ensure test project exists
    console.log('--- Step 1: Setting up test project ---')
    let { data: project } = await db
        .from('projects')
        .select('id, project_code, base_url')
        .eq('project_code', TEST_CONFIG.projectCode)
        .maybeSingle()

    if (!project) {
        console.log('Creating test project...')
        const projectId = `proj_test_${Date.now()}`
        const { data: newProject, error } = await db
            .from('projects')
            .insert([{
                id: projectId,
                project_code: TEST_CONFIG.projectCode,
                project_name: 'Test Project for E2E',
                base_url: 'https://example.com/survey',
                status: 'active',
                oi_prefix: 'oi_'
            }])
            .select()
            .single()
        
        if (error) {
            console.error('❌ Failed to create test project:', error)
            process.exit(1)
        }
        project = newProject
        console.log(`✅ Test project created: ${project.id}`)
    } else {
        console.log(`✅ Test project exists: ${project.id}`)
    }

    // Step 2: Create a test response record (simulating entry flow)
    console.log('\n--- Step 2: Creating test response record ---')
    const sessionToken = crypto.randomUUID()
    const testUid = `test_uid_${Date.now()}`
    
    const { data: response, error: insertError } = await db
        .from('responses')
        .insert([{
            project_id: project.id,
            project_code: TEST_CONFIG.projectCode,
            project_name: 'Test Project for E2E',
            uid: testUid,
            clickid: sessionToken,
            oi_session: sessionToken,
            session_token: sessionToken,
            status: 'in_progress',
            ip: '127.0.0.1',
            user_agent: 'E2E-Test/1.0',
            device_type: 'Desktop',
            created_at: new Date().toISOString()
        }])
        .select()
        .single()

    if (insertError) {
        console.error('❌ Failed to create test response:', insertError)
        process.exit(1)
    }

    console.log(`✅ Response record created:`)
    console.log(`   ID: ${response.id}`)
    console.log(`   oi_session: ${response.oi_session}`)
    console.log(`   clickid: ${response.clickid}`)
    console.log(`   uid: ${response.uid}`)
    console.log(`   status: ${response.status}`)

    // Step 3: Test callback with different status types
    console.log('\n--- Step 3: Testing callback endpoint ---')
    
    const testCases = [
        { status: 'complete', expectedStatus: 'complete' },
        { status: 'terminate', expectedStatus: 'terminate' },
        { status: 'quota', expectedStatus: 'quota_full' },
        { status: 'quota_full', expectedStatus: 'quota_full' },
        { status: 'security_terminate', expectedStatus: 'security_terminate' }
    ]

    for (const testCase of testCases) {
        console.log(`\n   Testing status: "${testCase.status}" → expected: "${testCase.expectedStatus}"`)
        
        // Create a fresh response for each test
        const testSession = crypto.randomUUID()
        const { data: testResponse } = await db
            .from('responses')
            .insert([{
                project_id: project.id,
                project_code: TEST_CONFIG.projectCode,
                uid: `test_${testCase.status}_${Date.now()}`,
                clickid: testSession,
                oi_session: testSession,
                session_token: testSession,
                status: 'in_progress',
                ip: '127.0.0.1',
                user_agent: 'E2E-Test/1.0',
                device_type: 'Desktop',
                created_at: new Date().toISOString()
            }])
            .select()
            .single()

        // Test callback via HTTP
        const callbackUrl = `${BASE_URL}/api/callback?clickid=${testSession}&status=${testCase.status}`
        console.log(`   Callback URL: ${callbackUrl}`)
        
        try {
            const response = await fetch(callbackUrl)
            const data = await response.json()
            
            if (data.success) {
                console.log(`   ✅ Callback successful: ${JSON.stringify(data)}`)
                
                // Verify DB update
                const { data: updatedResponse } = await db
                    .from('responses')
                    .select('status')
                    .eq('id', testResponse.id)
                    .single()
                
                if (updatedResponse.status === testCase.expectedStatus) {
                    console.log(`   ✅ DB status updated correctly: ${updatedResponse.status}`)
                } else {
                    console.error(`   ❌ DB status mismatch! Expected: ${testCase.expectedStatus}, Got: ${updatedResponse.status}`)
                }
            } else {
                console.error(`   ❌ Callback failed: ${JSON.stringify(data)}`)
            }
        } catch (error) {
            console.error(`   ❌ Callback request failed: ${error}`)
        }
    }

    // Step 4: Test idempotency (calling callback again on completed record)
    console.log('\n--- Step 4: Testing idempotency ---')
    const { data: completedResponse } = await db
        .from('responses')
        .select('id, oi_session, status')
        .eq('project_id', project.id)
        .eq('status', 'complete')
        .maybeSingle()

    if (completedResponse) {
        const idempotentUrl = `${BASE_URL}/api/callback?clickid=${completedResponse.oi_session}&status=complete`
        console.log(`   Testing idempotent callback: ${idempotentUrl}`)
        
        try {
            const response = await fetch(idempotentUrl)
            const data = await response.json()
            
            if (data.success && data.idempotent) {
                console.log(`   ✅ Idempotent callback handled correctly: ${JSON.stringify(data)}`)
            } else {
                console.error(`   ❌ Idempotent callback failed: ${JSON.stringify(data)}`)
            }
        } catch (error) {
            console.error(`   ❌ Idempotent callback request failed: ${error}`)
        }
    }

    // Step 5: Test error cases
    console.log('\n--- Step 5: Testing error cases ---')
    
    // Missing parameters
    console.log('   Testing missing parameters...')
    try {
        const response = await fetch(`${BASE_URL}/api/callback`)
        const data = await response.json()
        
        if (!data.success && response.status === 400) {
            console.log(`   ✅ Missing params handled correctly: ${JSON.stringify(data)}`)
        } else {
            console.error(`   ❌ Missing params not handled correctly: ${JSON.stringify(data)}`)
        }
    } catch (error) {
        console.error(`   ❌ Missing params test failed: ${error}`)
    }

    // Invalid status type
    console.log('   Testing invalid status type...')
    try {
        const response = await fetch(`${BASE_URL}/api/callback?clickid=test123&status=invalid_type`)
        const data = await response.json()
        
        if (!data.success && response.status === 400) {
            console.log(`   ✅ Invalid type handled correctly: ${JSON.stringify(data)}`)
        } else {
            console.error(`   ❌ Invalid type not handled correctly: ${JSON.stringify(data)}`)
        }
    } catch (error) {
        console.error(`   ❌ Invalid type test failed: ${error}`)
    }

    console.log('\n=== TEST SUMMARY ===')
    console.log('Check the console output above for pass/fail status of each test case.')
    console.log('All callback types should return success:true and update DB status correctly.')
}

// Run the tests
runTests().catch(console.error)
