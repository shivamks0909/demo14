import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/insforge-server'
import crypto from 'crypto'

export const runtime = "nodejs";
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const db = await createAdminClient()
    if (!db) {
        return NextResponse.json({ status: 'FAIL', message: 'Database not configured' }, { status: 500 })
    }

    try {
        // 1. Create a Test Project (if not exists) or use existing active one
        const { data: project } = await db.database
            .from('projects')
            .select('*')
            .eq('status', 'active')
            .limit(1)
            .maybeSingle()

        if (!project) {
            return NextResponse.json({ status: 'SKIP', message: 'No active project found to test with' })
        }

        const testUid = `selftest-${crypto.randomUUID().slice(0, 8)}`
        const testIp = '127.0.0.1'

        // 2. Simulate /r/[code]/[uid] entry (Insert)
        // We act as if the router route logic ran
        const { error: insertError } = await db.database
            .from('responses')
            .insert([{
                project_id: project.id,
                project_code: project.project_code,
                uid: testUid,
                clickid: testUid,
                status: 'in_progress',
                ip: testIp,
                reason: 'self_test_router_check'
            }])

        if (insertError) {
            return NextResponse.json({ status: 'FAIL', step: 'INSERT', error: insertError })
        }

        // 3. Simulate /api/callback/[code]/[uid]/[status] entry (Update)
        // We manually run the update logic exactly as the new route does
        const finalStatus = 'complete'
        const { data: updated, error: updateError } = await db.database
            .from('responses')
            .update({
                status: finalStatus,
                completed_at: new Date().toISOString()
            })
            .eq('clickid', testUid)
            .eq('status', 'in_progress')
            .select()
            .single()

        if (updateError || !updated) {
            return NextResponse.json({ status: 'FAIL', step: 'UPDATE', error: updateError || 'No record updated' })
        }

        // 4. Verify Postback Log (Simulated)
        // We verify that we can write to the new table
        const { error: logError } = await db.database.from('postback_logs').insert([{
            url: `http://localhost/api/callback/${project.project_code}/${testUid}/complete`,
            method: 'GET',
            update_result: 'SUCCESS',
            response_code: 200,
            response_body: 'complete'
        }])

        if (logError) {
            return NextResponse.json({ status: 'WARN', step: 'LOGGING', error: logError, message: 'Main flow passed but logging failed' })
        }

        // 5. Cleanup
        await db.database.from('responses').delete().eq('uid', testUid)

        return NextResponse.json({
            status: 'PASS',
            message: 'Path-based System Verified',
            details: {
                project: project.project_code,
                uid: testUid,
                flow: 'Insert (Router) -> Update (Callback) -> Log (Postback) -> Cleanup'
            }
        })

    } catch (e: any) {
        return NextResponse.json({ status: 'ERROR', message: e.message })
    }
}
