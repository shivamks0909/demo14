import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '@/lib/unified-db'
import { getClientIp } from '@/lib/getClientIp'
import { TrackingService, EntryContext } from '@/lib/tracking-service'
import { auditService } from '@/lib/audit-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Route: /r/{projectCode}/{supplier}/{uid}
 * Purpose: Handle supplier redirect links with UID tracking
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string; slug?: string[] }> }
) {
  const { code, slug = [] } = await context.params
  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent') || 'Unknown'
  const searchParams = request.nextUrl.searchParams

  // Parse slug to extract supplierToken and incomingUid
  let supplierToken: string | null = null
  let incomingUid: string = 'N/A'

  if (slug.length < 2) {
    // Require both supplier and UID in path
    const uid = encodeURIComponent('missing')
    return NextResponse.redirect(new URL(`/paused?title=INVALID_LINK&uid=${uid}`, request.url))
  }

  supplierToken = slug[0]
  incomingUid = slug[1]

  // Validate UID is not placeholder or empty
  if (!incomingUid || incomingUid === 'N/A' || incomingUid.trim() === '') {
    const uid = encodeURIComponent(incomingUid || 'missing')
    return NextResponse.redirect(new URL(`/paused?title=INVALID_LINK&uid=${uid}`, request.url))
  }

  const projectCode = code

  const { database: db } = await getUnifiedDb()
  if (!db) {
    const uid = encodeURIComponent(incomingUid)
    return NextResponse.redirect(new URL(`/paused?title=SYSTEM_OFFLINE&uid=${uid}`, request.url))
  }

  try {
    // Resolve Project BY CODE
    let { data: project } = await db
      .from('projects')
      .select('id')
      .eq('project_code', projectCode)
      .maybeSingle()

    // Fallback for dynamic project if explicit code not found
    if (!project) {
      const { data: dynamicP } = await db.from('projects').select('id').eq('project_code', 'DYNAMIC_ENTRY').maybeSingle()
      if (dynamicP) project = dynamicP
    }

    if (!project) {
      await auditService.log({
        event_type: 'entry_denied',
        payload: { reason: 'project_not_found', project_code: projectCode, uid: incomingUid },
        ip, user_agent: userAgent
      })
      const uid = encodeURIComponent(incomingUid)
      return NextResponse.redirect(new URL(`/paused?title=PROJECT_NOT_FOUND&uid=${uid}`, request.url))
    }

    // Fetch GeoIP data
    let geoData = null
    try {
      const { getCountryFromIp } = await import('@/lib/geoip-service')
      const geoCountry = await getCountryFromIp(request, ip)
      geoData = { country: geoCountry }
    } catch (e) {
      console.error('[GeoIP] Lookup failed:', e)
    }

    // Process Entry through Unified Tracking Service
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
      response.cookies.set('last_pid', projectCode, cookieOptions)
      return response
    }

    // Handle Specialized Error Redirects
    const uid = encodeURIComponent(incomingUid)
    const errorMap: Record<string, string> = {
      PROJECT_NOT_FOUND:   `/paused?title=PROJECT_NOT_FOUND&uid=${uid}`,
      PROJECT_PAUSED:      `/status?code=${projectCode}&uid=${uid}&type=paused`,
      THROTTLED:           `/paused?title=THROTTLED&desc=Too+many+requests.+Please+wait.&uid=${uid}`,
      DUPLICATE:           `/status?code=${projectCode}&uid=${uid}&type=duplicate_string`,
      GEO_MISMATCH:        `/paused?title=GEO_MISMATCH&uid=${uid}`,
      COUNTRY_UNAVAILABLE: `/paused?title=COUNTRY+UNAVAILABLE&uid=${uid}`,
      QUOTA_FULL:          `/status?code=${projectCode}&uid=${uid}&type=quota`,
      SERVER_ERROR:        `/paused?title=SERVER_ERROR&uid=${uid}`,
      UNAUTHORIZED:        `/paused?title=UNAUTHORIZED&uid=${uid}`
    }

    const redirectPath = errorMap[result.errorType || 'SERVER_ERROR'] || `/paused?title=ENTRY_DENIED&uid=${uid}`
    return NextResponse.redirect(new URL(redirectPath, request.url))

  } catch (error: any) {
    console.error('[Routing /r] Unified Error:', error)
    const uid = encodeURIComponent(incomingUid)
    return NextResponse.redirect(new URL(`/paused?title=SERVER_ERROR&uid=${uid}`, request.url))
  }
}
