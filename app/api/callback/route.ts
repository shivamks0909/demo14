import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '../../../lib/unified-db'
import { getClientIp } from '../../../lib/getClientIp'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Universal Callback Endpoint
 *
 * Query Parameters:
 *   pid (required): Project code
 *   cid (required): Click ID (maps to responses.clickid)
 *   type (required): complete | terminate | quota | security_terminate
 *   sig (optional): HMAC signature for verification
 *
 * Behavior:
 * 1. Validate parameters
 * 2. Find response by (project_code, clickid)
 * 3. Verify HMAC signature if provided
 * 4. Map type → internal status
 * 5. Update response status (if not terminal)
 * 6. Log to callback_logs and s2s_logs
 * 7. Redirect to /status page on success
 *
 * Idempotent: won't update if already terminal
 * Does NOT auto-create missing responses
 * Redirects: /status?code={pid}&cid={cid}&type={type}
 */

// Map client callback types to internal status values
const TYPE_TO_STATUS: Record<string, string> = {
    complete: 'complete',
    terminate: 'terminate',
    quota: 'quota_full',
    quota_full: 'quota_full',
    security_terminate: 'security_terminate'
}

// Optional HMAC verification
function verifySignature(secret: string, params: Record<string, string>, receivedSig: string): boolean {
    // Create canonical string: sorted keys alphabetically
    const canonical = Object.keys(params)
        .sort()
        .map(k => `${k}=${params[k]}`)
        .join('&')

    const expected = crypto
        .createHmac('sha256', secret)
        .update(canonical)
        .digest('hex')

    return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(receivedSig)
    )
}

export async function GET(request: NextRequest) {
    const startTime = Date.now()
    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    // Extract params — support legacy TeamExploreSearch (code, uid) & new (pid, cid, clickid) formats
    const searchParams = request.nextUrl.searchParams
    const pid = searchParams.get('pid') || searchParams.get('code')
    const cid = searchParams.get('cid') || searchParams.get('clickid') || searchParams.get('uid')
    const type = searchParams.get('type') || searchParams.get('status')
    const sig = searchParams.get('sig')

    // Debug logging: log received query parameters
    console.log('[Callback] Received query params:', {
        pid,
        cid,
        type,
        rawQuery: request.nextUrl.search.toString(),
        allParams: Object.fromEntries(searchParams.entries())
    })

    // Build raw query for logging
    const rawQuery = request.nextUrl.search.toString()

    // Validation — pid is optional if clickid+status direct format used
    if (!cid || !type) {
        await logCallback({
            project_code: pid || null,
            clickid: cid,
            type,
            status_mapped: null,
            response_code: 400,
            success: false,
            error_message: 'Missing required parameters: clickid (or cid) and status (or type)',
            raw_query: rawQuery,
            ip_address: ip,
            user_agent: userAgent,
            latency_ms: Date.now() - startTime
        })

        return NextResponse.json(
            { success: false, error: 'Missing required parameters: clickid and status' },
            { status: 400 }
        )
    }

    // Validate type
    const internalStatus = TYPE_TO_STATUS[type]
    if (!internalStatus) {
        await logCallback({
            project_code: pid,
            clickid: cid,
            type,
            status_mapped: null,
            response_code: 400,
            success: false,
            error_message: `Invalid type. Allowed: ${Object.keys(TYPE_TO_STATUS).join(', ')}`,
            raw_query: rawQuery,
            ip_address: ip,
            user_agent: userAgent,
            latency_ms: Date.now() - startTime
        })

        return NextResponse.json(
            { success: false, error: `Invalid type: ${type}` },
            { status: 400 }
        )
    }

    const { database: db } = await getUnifiedDb()
    if (!db) {
        await logCallback({
            project_code: pid,
            clickid: cid,
            type,
            status_mapped: internalStatus,
            response_code: 503,
            success: false,
            error_message: 'Database unavailable',
            raw_query: rawQuery,
            ip_address: ip,
            user_agent: userAgent,
            latency_ms: Date.now() - startTime
        })

        return NextResponse.json(
            { success: false, error: 'Database unavailable' },
            { status: 503 }
        )
    }

    try {
        // 1. Find response - Multi-strategy lookup
        // Strategy A: Lookup by oi_session (primary — session tokens are unique)
        console.log(`[Callback] DB Lookup Strategy A: oi_session = "${cid}"`)
        let { data: response, error: lookupError } = await db
            .from('responses')
            .select('id, status, clickid, project_code, project_id, uid, oi_session')
            .eq('oi_session', cid)
            .maybeSingle()

        // Strategy B: Lookup by clickid + project_code
        if (!response && !lookupError) {
            console.log(`[Callback] DB Lookup Strategy B: clickid = "${cid}", project_code = "${pid}"`)
            const { data: fallbackResponse } = await db
                .from('responses')
                .select('id, status, clickid, project_code, project_id, uid, oi_session')
                .eq('clickid', cid)
                .ilike('project_code', pid)
                .maybeSingle()
            response = fallbackResponse
        }

        // Strategy C: Lookup by uid + project_code (Legacy TeamExploreSearch compatibility)
        if (!response && !lookupError) {
            console.log(`[Callback] DB Lookup Strategy C: uid = "${cid}", project_code = "${pid}"`)
            const { data: legacyResponse } = await db
                .from('responses')
                .select('id, status, clickid, project_code, project_id, uid, oi_session')
                .eq('uid', cid)
                .ilike('project_code', pid)
                .maybeSingle()
            response = legacyResponse
        }

        // Strategy D: Lookup by oi_session WITHOUT project_code (broadest search)
        if (!response && !lookupError) {
            console.log(`[Callback] DB Lookup Strategy D: oi_session = "${cid}" (no project filter)`)
            const { data: broadResponse } = await db
                .from('responses')
                .select('id, status, clickid, project_code, project_id, uid, oi_session')
                .eq('oi_session', cid)
                .maybeSingle()
            response = broadResponse
        }

        console.log(`[Callback] DB Lookup Result:`, response ? `Found (id=${response.id}, status=${response.status})` : 'NOT FOUND')

        if (lookupError || !response) {
            console.error(`[Callback] Response not found for CID=${cid}, PID=${pid}. Error:`, lookupError)
            // Response not found - log and return error
            await logCallback({
                project_code: pid,
                clickid: cid,
                type,
                status_mapped: internalStatus,
                response_code: 404,
                success: false,
                error_message: 'Response not found',
                raw_query: rawQuery,
                ip_address: ip,
                user_agent: userAgent,
                latency_ms: Date.now() - startTime
            })

            return NextResponse.redirect(
                new URL(`/status?code=${encodeURIComponent(pid || 'UNKNOWN')}&cid=${encodeURIComponent(cid)}&type=${encodeURIComponent(type)}`, request.url)
            )
        }

        // 2. HMAC Signature Verification - OPTIONAL (only if S2S config exists)
        let s2sConfig: any = null
        let canonical = ''

        // Fetch S2S config for the project
        const { data: config } = await db
            .from('s2s_config')
            .select('secret_key, require_s2s_for_complete, unverified_action')
            .eq('project_id', response.project_id)
            .maybeSingle()

        s2sConfig = config

        if (s2sConfig && s2sConfig.secret_key) {
            // S2S config exists — verify signature
            const paramsForSig: Record<string, string> = { 
                pid: response.project_code || '', 
                cid: cid || '', 
                type: type || '' 
            }
            canonical = Object.keys(paramsForSig)
                .sort()
                .map(k => `${k}=${paramsForSig[k]}`)
                .join('&')

            const expectedSig = crypto
                .createHmac('sha256', s2sConfig.secret_key)
                .update(canonical)
                .digest('hex')

            const providedSigBuf = Buffer.from(sig || '', 'utf8')
            const expectedSigBuf = Buffer.from(expectedSig, 'utf8')

            let sigValid = false
            if (providedSigBuf.length === expectedSigBuf.length) {
                sigValid = crypto.timingSafeEqual(providedSigBuf, expectedSigBuf)
            }

            // Log S2S verification attempt
            await logS2SVerification({
                response_id: response.id,
                project_id: response.project_id,
                hash_match: sigValid,
                ip_match: null,
                timestamp_check: null,
                overall_result: sigValid ? 1 : 0,
                callback_url: request.url,
                callback_method: 'GET',
                callback_status: null,
                callback_response: null,
                payload: JSON.stringify({ pid, cid, type, sig, canonical })
            })

            if (!sigValid) {
                await logCallback({
                    project_code: pid || null,
                    clickid: cid,
                    type,
                    status_mapped: internalStatus,
                    response_code: 403,
                    success: false,
                    error_message: 'Invalid or missing signature',
                    raw_query: rawQuery,
                    ip_address: ip,
                    user_agent: userAgent,
                    latency_ms: Date.now() - startTime
                })

                return NextResponse.json(
                    { success: false, error: 'Invalid signature' },
                    { status: 403 }
                )
            }
        } else {
            // No S2S config — allow callback without signature (open callback mode)
            console.log(`[Callback] No S2S config for project ${response.project_code} — allowing unsigned callback`)
        }

        // 5. Check if already terminal (idempotent)
        const terminalStatuses = ['complete', 'terminate', 'security_terminate', 'quota_full', 'duplicate_ip', 'duplicate_string']
        if (terminalStatuses.includes(response.status)) {
            // Already terminal - log idempotent and return success
            await logCallback({
                project_code: pid,
                clickid: cid,
                type,
                status_mapped: internalStatus,
                response_code: 200,
                response_body: JSON.stringify({ success: true, idempotent: true }),
                success: true,
                raw_query: rawQuery,
                ip_address: ip,
                user_agent: userAgent,
                latency_ms: Date.now() - startTime
            })

            return NextResponse.json({
                success: true,
                idempotent: true,
                status: response.status
            })
        }

        // 6. Update response status using raw SQL to bypass PostgREST schema cache
        const now = new Date().toISOString()
        const { error: updateError } = await db
            .from('responses')
            .update({
                status: internalStatus,
                updated_at: now
            })
            .eq('id', response.id)

        if (updateError) {
            console.error('[Callback] Database update failed:', updateError)
            // Fallback to raw SQL if PostgREST update fails
            try {
                const { error: sqlError } = await db.rpc('update_response_status', {
                    p_response_id: response.id,
                    p_status: internalStatus,
                    p_completion_time: internalStatus === 'complete' ? now : null,
                    p_updated_at: now
                })
                
                if (sqlError) {
                    console.error('[Callback] Raw SQL update also failed:', sqlError)
                    throw new Error(`Database update failed: ${updateError.message}`)
                }
            } catch (sqlErr: any) {
                console.error('[Callback] Raw SQL fallback failed:', sqlErr)
                throw new Error(`Database update failed: ${updateError.message}`)
            }
        }

        // 7. Log successful callback
        await logCallback({
            project_code: pid,
            clickid: cid,
            type,
            status_mapped: internalStatus,
            response_code: 200,
            response_body: JSON.stringify({ success: true }),
            success: true,
            raw_query: rawQuery,
            ip_address: ip,
            user_agent: userAgent,
            latency_ms: Date.now() - startTime
        })

        // 8. Redirect to /status page after successful update
        const projectCode = response.project_code || pid || ''
        const statusUrl = `/status?code=${encodeURIComponent(projectCode)}&cid=${encodeURIComponent(cid)}&type=${encodeURIComponent(type)}`
        
        console.log(`[Callback] Redirecting to: ${statusUrl}`)
        return NextResponse.redirect(new URL(statusUrl, request.url))

    } catch (error: any) {
        console.error('[Callback] Error:', error)

        await logCallback({
            project_code: pid,
            clickid: cid,
            type,
            status_mapped: internalStatus,
            response_code: 500,
            success: false,
            error_message: error.message,
            raw_query: rawQuery,
            ip_address: ip,
            user_agent: userAgent,
            latency_ms: Date.now() - startTime
        })

        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Helper to log callback attempts (fire-and-forget, errors don't block)
async function logCallback(data: {
    project_code: string | null
    clickid: string | null
    type: string | null
    status_mapped: string | null
    response_code: number | null
    response_body?: string
    success: boolean
    error_message?: string
    raw_query: string
    ip_address: string
    user_agent: string
    latency_ms: number
}) {
    try {
        const { database: db } = await getUnifiedDb()
        if (!db) return

        await db
            .from('callback_logs')
            .insert([{
                project_code: data.project_code,
                clickid: data.clickid,
                type: data.type,
                status_mapped: data.status_mapped,
                response_code: data.response_code,
                response_body: data.response_body,
                latency_ms: data.latency_ms,
                raw_query: data.raw_query,
                ip_address: data.ip_address,
                user_agent: data.user_agent,
                success: data.success,
                error_message: data.error_message,
                created_at: new Date().toISOString()
            }])
    } catch (err: any) {
        // Never throw from logging - best effort only
        console.error('[CallbackLog] Failed to log:', err.message || err)
    }
}

// Helper to log S2S verification attempts
async function logS2SVerification(data: {
    response_id: string
    project_id: string
    hash_match: boolean | null
    ip_match: boolean | null
    timestamp_check: boolean | null
    overall_result: number // 0=fail, 1=pass
    callback_url: string
    callback_method: string
    callback_status: number | null
    callback_response: string | null
    payload: string // JSON string
}) {
    try {
        const { database: db } = await getUnifiedDb()
        if (!db) return

        await db
            .from('s2s_logs')
            .insert([{
                response_id: data.response_id,
                project_id: data.project_id,
                hash_match: data.hash_match,
                ip_match: data.ip_match,
                timestamp_check: data.timestamp_check,
                overall_result: data.overall_result,
                callback_url: data.callback_url,
                callback_method: data.callback_method,
                callback_status: data.callback_status,
                callback_response: data.callback_response,
                payload: data.payload,
                created_at: new Date().toISOString()
            }])
    } catch (err: any) {
        // Never throw from logging - best effort only
        console.error('[S2SLog] Failed to log:', err.message || err)
    }
}
