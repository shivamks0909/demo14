import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '@/lib/unified-db'
import { getClientIp } from '@/lib/getClientIp'
import { TrackingService, EntryContext } from '@/lib/tracking-service'
import { auditService } from '@/lib/audit-service'

export const runtime = "nodejs"

/**
 * Custom Init Endpoint for TrustSample Integration
 * URL pattern: /init/[transactionId]/[rid]
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ transactionId: string; rid: string }> }
) {
    const { transactionId, rid } = await context.params
    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    if (!transactionId || !rid) {
        return NextResponse.redirect(new URL('/paused?title=INVALID_LINK&desc=Missing parameters', request.url))
    }

    const { database: db } = await getUnifiedDb()
    if (!db) return NextResponse.redirect(new URL('/paused?title=SYSTEM_OFFLINE', request.url))

    try {
        // 1. Resolve Project (Fallback logic for external traffic)
        let { data: project } = await db
            .from('projects')
            .select('id')
            .eq('project_code', 'external_traffic')
            .maybeSingle()

        if (!project) {
            const { data: fallbackP } = await db.from('projects').select('id').eq('status', 'active').limit(1).maybeSingle()
            if (fallbackP) project = fallbackP
        }

        if (!project) {
            await auditService.log({
                event_type: 'entry_denied',
                payload: { reason: 'no_active_project', transactionId, rid },
                ip, user_agent: userAgent
            })
            return NextResponse.redirect(new URL('/paused?title=PROJECT_NOT_FOUND', request.url))
        }

        // 2. Fetch GeoIP data
        let geoData = null
        try {
            const { getCountryFromIp } = await import('@/lib/geoip-service')
            const geoCountry = await getCountryFromIp(request, ip)
            geoData = { country: geoCountry }
        } catch (e) {
            console.error('[CustomInit] GeoIP Error:', e)
        }

        // 3. Process Entry via Unified Service
        const ctx: EntryContext = {
            projectId: project.id,
            transactionId,
            rid,
            userAgent,
            ip,
            geoData,
            queryParams: Object.fromEntries(request.nextUrl.searchParams.entries())
        }

        const result = await TrackingService.processEntry(ctx)

        if (result.success && result.redirectUrl) {
            const response = NextResponse.redirect(new URL(result.redirectUrl))
            // Persist tracking cookies
            const cookieOptions = { maxAge: 86400, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const }
            response.cookies.set('last_uid', rid, cookieOptions)
            if (result.responseData?.oi_session) {
                response.cookies.set('last_sid', result.responseData.oi_session, cookieOptions)
            }
            return response
        }

        // 4. Map Errors to Specialized Redirects (include rid for display on status page)
        const uidEnc = encodeURIComponent(rid)
        const errorMap: Record<string, string> = {
          THROTTLED:           `/paused?title=THROTTLED`,
          DUPLICATE:           `/status?code=external&uid=${uidEnc}&type=duplicate_string`,
          QUOTA_FULL:          `/status?code=external&uid=${uidEnc}&type=quota`,
          GEO_MISMATCH:        `/paused?title=GEO_MISMATCH`,
          COUNTRY_UNAVAILABLE: `/paused?title=COUNTRY+UNAVAILABLE`,
          SERVER_ERROR:        `/paused?title=SERVER_ERROR`
        }

        const redirectPath = errorMap[result.errorType || 'SERVER_ERROR'] || '/paused?title=ENTRY_DENIED'
        return NextResponse.redirect(new URL(redirectPath, request.url))

    } catch (error: any) {
        console.error('[CustomInit] Exception:', error)
        return NextResponse.redirect(new URL('/paused?title=SERVER_ERROR', request.url))
    }
}
