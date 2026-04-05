import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '../../../lib/unified-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Test Callback API - Updates response status and returns JSON (no redirect)
 */
const TYPE_TO_STATUS: Record<string, string> = {
    complete: 'complete',
    terminate: 'terminate',
    quota: 'quota_full',
    quota_full: 'quota_full',
    security_terminate: 'security_terminate'
}

export async function POST(request: NextRequest) {
    const body = await request.json()
    const { clickid, type } = body

    if (!clickid || !type) {
        return NextResponse.json(
            { success: false, error: 'Missing clickid or type' },
            { status: 400 }
        )
    }

    const internalStatus = TYPE_TO_STATUS[type]
    if (!internalStatus) {
        return NextResponse.json(
            { success: false, error: `Invalid type: ${type}. Allowed: ${Object.keys(TYPE_TO_STATUS).join(', ')}` },
            { status: 400 }
        )
    }

    const { database: db } = await getUnifiedDb()
    if (!db) {
        return NextResponse.json(
            { success: false, error: 'Database unavailable' },
            { status: 503 }
        )
    }

    try {
        // Find response by clickid or oi_session
        let { data: response } = await db
            .from('responses')
            .select('id, status, project_code, uid, oi_session, clickid, created_at')
            .eq('oi_session', clickid)
            .maybeSingle()

        if (!response) {
            const { data: fallback } = await db
                .from('responses')
                .select('id, status, project_code, uid, oi_session, clickid, created_at')
                .eq('clickid', clickid)
                .maybeSingle()
            response = fallback
        }

        if (!response) {
            return NextResponse.json(
                { success: false, error: `Response not found for clickid: ${clickid}` },
                { status: 404 }
            )
        }

        // Check if already terminal
        const terminalStatuses = ['complete', 'terminate', 'security_terminate', 'quota_full', 'duplicate_ip', 'duplicate_string']
        if (terminalStatuses.includes(response.status)) {
            return NextResponse.json({
                success: true,
                idempotent: true,
                message: `Already terminal: ${response.status}`,
                previous_status: response.status,
                new_status: response.status
            })
        }

        // Update status
        const now = new Date().toISOString()
        const { error: updateError } = await db
            .from('responses')
            .update({
                status: internalStatus,
                completion_time: internalStatus === 'complete' ? now : null,
                updated_at: now
            })
            .eq('id', response.id)

        if (updateError) {
            return NextResponse.json(
                { success: false, error: 'Failed to update status', details: updateError },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: `Status updated: ${response.status} → ${internalStatus}`,
            previous_status: response.status,
            new_status: internalStatus,
            session: {
                id: response.id,
                project_code: response.project_code,
                uid: response.uid,
                oi_session: response.oi_session,
                clickid: response.clickid,
                status: internalStatus
            }
        })

    } catch (error: any) {
        console.error('[Test Callback] Error:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
