import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '../../lib/unified-db'
import { getClientIp } from '../../lib/getClientIp'
import { TrackingService, EntryContext } from '../../lib/tracking-service'
import { auditService } from '../../lib/audit-service'

export const dynamic = 'force-dynamic'
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown'
    const searchParams = request.nextUrl.searchParams
    
    const code = (searchParams.get('code') || searchParams.get('pid') || '').trim()
    const incomingUid = (searchParams.get('uid') || 'N/A').trim()
    const supplierToken = searchParams.get('supplier') || searchParams.get('oi_supplier') || null

    if (!code) {
        const errorUrl = new URL('/paused', request.url)
        errorUrl.searchParams.set('title', 'INVALID LINK')
        errorUrl.searchParams.set('desc', 'The project code is missing or invalid.')
        return NextResponse.redirect(errorUrl)
    }

    const { database: db } = await getUnifiedDb()
    if (!db) {
        const fatalUrl = new URL('/paused', request.url)
        fatalUrl.searchParams.set('title', 'SYSTEM OFFLINE')
        return NextResponse.redirect(fatalUrl)
    }

    try {
        // 1. Resolve Project BY CODE
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
            const errorUrl = new URL('/paused', request.url)
            errorUrl.searchParams.set('title', 'PROJECT NOT FOUND')
            return NextResponse.redirect(errorUrl)
        }

        // 2. Fetch GeoIP data
        let geoData = null
        try {
            const { getCountryFromIp } = await import('@/lib/geoip-service')
            const geoCountry = await getCountryFromIp(request, ip)
            geoData = { country: geoCountry }
        } catch (e) {
            console.error('[Track] GeoIP Lookup failed:', e)
        }

        // 3. Process Entry through Unified Tracking Service
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
            const cookieOptions = { 
                maxAge: 86400, 
                path: '/', 
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production', 
                sameSite: 'lax' as const 
            }
            response.cookies.set('last_uid', incomingUid, cookieOptions)
            if (result.responseData?.oi_session) {
                response.cookies.set('last_sid', result.responseData.oi_session, cookieOptions)
            }
            response.cookies.set('last_pid', code, cookieOptions)
            
            return response
        }

        // 4. Handle Redirections for Errors/Quota
        const uid = encodeURIComponent(incomingUid)
        const errorMap: Record<string, string> = {
          PROJECT_PAUSED:      `/status?code=${code}&uid=${uid}&type=paused`,
          THROTTLED:           `/paused?title=THROTTLED&desc=Too+many+requests.`,
          DUPLICATE:           `/status?code=${code}&uid=${uid}&type=duplicate_string`,
          GEO_MISMATCH:        `/paused?title=GEO_MISMATCH`,
          COUNTRY_UNAVAILABLE: `/paused?title=COUNTRY+UNAVAILABLE`,
          QUOTA_FULL:          `/status?code=${code}&uid=${uid}&type=quota`,
          SERVER_ERROR:        `/paused?title=SERVER_ERROR`
        }

        const redirectPath = errorMap[result.errorType || 'SERVER_ERROR'] || `/paused?title=ENTRY_DENIED`
        const finalRedirect = new URL(redirectPath, request.url)
        
        // Pass clickid if available for status persistence
        if (result.responseData?.oi_session) {
            finalRedirect.searchParams.set('clickid', result.responseData.oi_session)
        } else if (result.responseData?.clickid) {
            finalRedirect.searchParams.set('clickid', result.responseData.clickid)
        }

        return NextResponse.redirect(finalRedirect)

    } catch (error: any) {
        console.error('[Track Route] Unified Error:', error)
        return NextResponse.redirect(new URL('/paused?title=SERVER_ERROR', request.url))
    }
}







// Debug logging added - check server logs

// Debug logging added - check server logs
