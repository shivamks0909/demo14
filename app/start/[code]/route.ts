import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '@/lib/unified-db'
import { getClientIp } from '@/lib/getClientIp'
import { TrackingService, EntryContext } from '@/lib/tracking-service'
import { auditService } from '@/lib/audit-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Legacy/Alternative Start Route
 * Used for /start/[code]?uid=...&supplier=...
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ code: string }> }
) {
    const { code } = await context.params
    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent') || 'Unknown'
    const searchParams = request.nextUrl.searchParams
    
    // Explicitly fallback to empty string if missing, though it'll be replaced by UUID downstream if missing.
    const incomingUid = searchParams.get('uid') || 'N/A'
    const supplierToken = searchParams.get('supplier') || null

    if (!code) {
        return NextResponse.redirect(new URL('/paused?title=INVALID_LINK', request.url))
    }

    const { database: db } = await getUnifiedDb()
    if (!db) return NextResponse.redirect(new URL('/paused?title=SYSTEM_OFFLINE', request.url))

    try {
        // 2. Resolve Project BY CODE
        let { data: project } = await db
            .from('projects')
            .select('id')
            .eq('project_code', code)
            .maybeSingle()

        // Fallback for dynamic project if explicit code not found
        if (!project) {
            const { data: dynamicP } = await db.from('projects').select('id').eq('project_code', 'DYNAMIC_ENTRY').maybeSingle()
            if (dynamicP) project = dynamicP
        }

        if (!project) {
            await auditService.log({
                event_type: 'entry_denied',
                payload: { reason: 'project_not_found', project_code: code, uid: incomingUid },
                ip, user_agent: userAgent
            })
            return NextResponse.redirect(new URL('/paused?title=PROJECT_NOT_FOUND', request.url))
        }

        // 3. Fetch GeoIP data (Production-grade service)
        let geoData = null
        try {
            const { getCountryFromIp } = await import('@/lib/geoip-service')
            const geoCountry = await getCountryFromIp(request, ip)
            geoData = { country: geoCountry }
        } catch (e) {
            console.error('[GeoIP] Lookup failed:', e)
        }

        // 4. Process Entry through Unified Tracking Service
        const ctx: EntryContext = {
            projectId: project.id,
            rid: incomingUid,
            supplierToken: supplierToken || undefined,
            userAgent,
            ip,
            geoData,
            queryParams: Object.fromEntries(searchParams.entries())
        }

        const result = await TrackingService.processEntry(ctx)

        if (result.success && result.redirectUrl) {
            const response = NextResponse.redirect(new URL(result.redirectUrl))
            // Set tracking cookies for persistence
            const cookieOptions = { maxAge: 86400, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const }
            response.cookies.set('last_uid', incomingUid, cookieOptions)
            if (result.responseData?.oi_session) {
                response.cookies.set('last_sid', result.responseData.oi_session, cookieOptions)
            }
            response.cookies.set('last_pid', code, cookieOptions)
            return response
        }

        // 5. Handle Specialized Error Redirects
        const uid = encodeURIComponent(incomingUid)
        const errorMap: Record<string, string> = {
          PROJECT_PAUSED:      `/status?code=${code}&uid=${uid}&type=paused`,
          THROTTLED:           `/paused?title=THROTTLED&desc=Too+many+requests.+Please+wait.`,
          DUPLICATE:           `/status?code=${code}&uid=${uid}&type=duplicate_string`,
          GEO_MISMATCH:        `/paused?title=GEO_MISMATCH`,
          COUNTRY_UNAVAILABLE: `/paused?title=COUNTRY+UNAVAILABLE`,
          QUOTA_FULL:          `/status?code=${code}&uid=${uid}&type=quota`,
          SERVER_ERROR:        `/paused?title=SERVER_ERROR`
        }

        const redirectPath = errorMap[result.errorType || 'SERVER_ERROR'] || `/paused?title=ENTRY_DENIED`
        return NextResponse.redirect(new URL(redirectPath, request.url))

    } catch (error: any) {
        console.error('[Routing Start] Unified Error:', error)
        return NextResponse.redirect(new URL('/paused?title=SERVER_ERROR', request.url))
    }
}
