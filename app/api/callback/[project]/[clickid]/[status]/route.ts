import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/insforge-server'

export const runtime = "nodejs";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ project: string; clickid: string; status: string }> }
) {
    const { project, clickid, status } = await context.params
    const db = await createAdminClient()

    if (!db) {
        return NextResponse.redirect(new URL('/paused?title=SYSTEM_OFFLINE', request.url))
    }

    const allowedStatuses = ['complete', 'terminated', 'quota_full', 'duplicate_ip', 'security_terminate']
    const incomingStatus = allowedStatuses.includes(status) ? status : 'terminated'

    try {
        // 1. Unified Match: check clickid first, then supplier_uid
        const { data: currentResp } = await db.database
            .from('responses')
            .select('id, status')
            .eq('project_code', project)
            .or(`clickid.eq.${clickid},supplier_uid.eq.${clickid}`)
            .maybeSingle()

        if (!currentResp) {
            console.warn(`[Callback] Response not found for clickid: ${clickid} in project: ${project}`)
            await db.database.from('callback_events').insert([{
                clickid,
                project_code: project,
                incoming_status: status,
                update_result: 'NOT_FOUND'
            }])
            return NextResponse.redirect(new URL(`/status/${clickid}`, request.url))
        }

        const { error: updateError } = await db.database
            .from('responses')
            .update({
                status: incomingStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentResp.id)

        const success = !updateError

        // 2. Audit Logging
        await db.database.from('callback_events').insert([{
            clickid,
            project_code: project,
            incoming_status: status,
            update_result: success ? 'SUCCESS' : 'FAILED'
        }])

        // 3. Final Hub Redirect
        return NextResponse.redirect(new URL(`/status/${clickid}`, request.url))

    } catch (e) {
        console.error('[API Callback] Error:', e)
        return NextResponse.redirect(new URL('/paused?title=CALLBACK_ERROR', request.url))
    }
}
