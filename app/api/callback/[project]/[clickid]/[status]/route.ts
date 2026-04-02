import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '@/lib/unified-db'

export const runtime = 'nodejs';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ project: string; clickid: string; status: string }> }
) {
    const { project, clickid, status } = await context.params
    const { database: db } = await getUnifiedDb()

    const allowedStatuses = ['complete', 'terminate', 'quota_full', 'duplicate_ip', 'security_terminate']
    const incomingStatus = allowedStatuses.includes(status) ? status : 'terminate'

    try {
        // 1. Find by clickid OR supplier_uid
        let currentResp: any = null

        // Try clickid first
        const { data: byClickid } = await db.from('responses')
            .select('id, status')
            .eq('project_code', project)
            .eq('clickid', clickid)
            .maybeSingle()

        if (byClickid) {
            currentResp = byClickid
        } else {
            // Fallback: try supplier_uid
            const { data: byUid } = await db.from('responses')
                .select('id, status')
                .eq('project_code', project)
                .eq('supplier_uid', clickid)
                .maybeSingle()
            currentResp = byUid
        }

        if (!currentResp) {
            console.warn(`[PathCallback] Not found: clickid=${clickid}, project=${project}`)
            await db.from('callback_events').insert([{
                id: `cbe_${Date.now()}`,
                clickid, project_code: project, status, incoming_status: status,
                update_result: 'NOT_FOUND', created_at: new Date().toISOString()
            }])
            return NextResponse.redirect(new URL(`/status/${clickid}`, request.url))
        }

        // 2. Update status
        const { error: updateError } = await db.from('responses')
            .update({ status: incomingStatus, updated_at: new Date().toISOString() })
            .eq('id', currentResp.id)

        // 3. Audit log
        await db.from('callback_events').insert([{
            id: `cbe_${Date.now()}`,
            clickid, project_code: project, status: incomingStatus, incoming_status: status,
            update_result: updateError ? 'FAILED' : 'SUCCESS',
            created_at: new Date().toISOString()
        }])

        return NextResponse.redirect(new URL(`/status/${clickid}`, request.url))

    } catch (e: any) {
        console.error('[PathCallback] Error:', e)
        return NextResponse.redirect(new URL('/paused?title=CALLBACK_ERROR', request.url))
    }
}
