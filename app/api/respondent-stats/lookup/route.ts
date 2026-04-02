import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '@/lib/unified-db'

export const runtime = 'nodejs'

/**
 * Respondent Stats Lookup by UID + Project Code
 * GET /api/respondent-stats/lookup?uid=6977128&code=OPITS6977128
 *
 * Used by WavyOutcomeView when no oi_session is present in the URL
 * (e.g. TrustSample/Quantclix redirects back with only uid and project code)
 */
export async function GET(request: NextRequest) {
    const uid = request.nextUrl.searchParams.get('uid')
    const code = request.nextUrl.searchParams.get('code')

    if (!uid || uid === '-' || !code || code === '-') {
        return NextResponse.json({ error: 'uid and code required' }, { status: 400 })
    }

    const { database: db } = await getUnifiedDb()
    if (!db) return NextResponse.json({ error: 'system offline' }, { status: 503 })

    try {
        // Look up the most recent response for this uid + project_code
        const { data: response, error } = await db
            .from('responses')
            .select('uid, project_code, start_time, completion_time, updated_at, status, ip')
            .eq('uid', uid)
            .ilike('project_code', code)   // case-insensitive match
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error || !response) {
            return NextResponse.json({ error: 'not found' }, { status: 404 })
        }

        // Calculate LOI — prefer completion_time over updated_at
        let loi = 0
        const endTs = response.completion_time || response.updated_at
        if (response.start_time && endTs) {
            const start = new Date(response.start_time).getTime()
            const end = new Date(endTs).getTime()
            const diffSec = Math.floor((end - start) / 1000)
            if (diffSec > 0) loi = diffSec
        }

        return NextResponse.json({
            supplierRid: response.uid,
            projectCode: response.project_code,
            status: response.status,
            ip: response.ip,
            loi: Math.floor(loi / 60),
            endTime: endTs ? Math.floor(new Date(endTs).getTime() / 1000) : null
        })
    } catch (e) {
        return NextResponse.json({ error: 'server error' }, { status: 500 })
    }
}
