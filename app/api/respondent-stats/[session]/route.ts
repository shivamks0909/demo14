import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/insforge-server'

export const runtime = "nodejs";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ session: string }> }
) {
    const { session } = await context.params
    const insforge = await createAdminClient()
    
    if (!insforge) {
        return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
    }

    try {
        const { data: response, error } = await insforge.database
            .from('responses')
            .select('*')
            .eq('oi_session', session)
            .maybeSingle()

        if (error || !response) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }

        // Return stats specifically formatted for Wavy/Quirky views
        return NextResponse.json({
            id: response.id,
            projectCode: response.project_code,
            supplierRid: response.supplier_uid || response.uid,
            ip: response.ip,
            status: response.status,
            loi: response.duration_seconds ? Math.round(response.duration_seconds / 60) : 0,
            loiSeconds: response.duration_seconds || 0,
            endTime: response.completed_at ? Math.floor(new Date(response.completed_at).getTime() / 1000) : null,
            startTime: response.start_time ? Math.floor(new Date(response.start_time).getTime() / 1000) : null
        })

    } catch (e) {
        console.error('[respondent-stats] error:', e)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
