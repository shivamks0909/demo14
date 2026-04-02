import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '@/lib/unified-db'
import { getClientIp } from '@/lib/getClientIp'
import crypto from 'crypto'

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
 * 7. Return JSON
 *
 * Idempotent: won't update if already terminal
 * Does NOT auto-create missing responses
 */

// Map client callback types to internal status values
const TYPE_TO_STATUS: Record<string, string> = {
    complete: 'complete',
    terminate: 'terminate',
    quota: 'quota_full',
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
    const url = new URL(request.url)

    // Extract params
    const pid = url.searchParams.get('pid')
    const cid = url.searchParams.get('cid')
    const type = url.searchParams.get('type')
    const sig = url.searchParams.get('sig')

    // Build raw query for logging
    const rawQuery = request.url.split('?')[1] || ''

    // Validation
    if (!pid || !cid || !type) {
        await logCallback({
            project_code: pid || null,
            clickid: cid,
            type,
            status_mapped: null,
            response_code: 400,
            success: false,
            error_message: 'Missing required parameters: pid, cid, type',
            raw_query: rawQuery,
            ip_address: ip,
            user_agent: userAgent,
            latency_ms: Date.now() - startTime
        })

        return NextResponse.json(
            { success: false, error: 'Missing required parameters: pid, cid, type' },
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
        // 1. Find response - Prioritize unique session identification (oi_session/cid)
        // This is more robust as session tokens are unique across the system
        let { data: response, error: lookupError } = await db
            .from('responses')
            .select('id, status, clickid, project_code, project_id')
            .eq('oi_session', cid)
            .maybeSingle()

        // Fallback: search by clickid + project_code if session-specific lookup failed
        if (!response && !lookupError) {
            const { data: fallbackResponse } = await db
                .from('responses')
                .select('id, status, clickid, project_code, project_id')
                .eq('clickid', cid)
                .ilike('project_code', pid) // Case-insensitive fallback
                .maybeSingle()
            response = fallbackResponse
        }

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

            return NextResponse.json(
                { success: false, error: 'Response not found' },
                { status: 404 }
            )
        }

        // 2. HMAC Signature Verification - MANDATORY
        let sigValid = false
        let s2sConfig: any = null
        let canonical = ''

        // Fetch S2S config for the project
        const { data: config } = await db
            .from('s2s_config')
            .select('secret_key, require_s2s_for_complete, unverified_action')
            .eq('project_id', response.project_id)
            .maybeSingle()

        s2sConfig = config

        if (!s2sConfig || !s2sConfig.secret_key) {
            // No S2S config found - this is a misconfiguration
            await logCallback({
                project_code: pid,
                clickid: cid,
                type,
                status_mapped: internalStatus,
                response_code: 500,
                success: false,
                error_message: 'S2S configuration missing for project',
                raw_query: rawQuery,
                ip_address: ip,
                user_agent: userAgent,
                latency_ms: Date.now() - startTime
            })

            return NextResponse.json(
                { success: false, error: 'Callback signature required but not configured' },
                { status: 500 }
            )
        }

        // 2. Signature verification (if applicable)
        // Use the CANONICAL project_code from our database for verification
        // as the passed 'pid' might be truncated or slightly different
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

        // Safety check for timingSafeEqual: Buffers must have identical length
        const providedSigBuf = Buffer.from(sig || '', 'utf8')
        const expectedSigBuf = Buffer.from(expectedSig, 'utf8')

        if (providedSigBuf.length === expectedSigBuf.length) {
            sigValid = crypto.timingSafeEqual(providedSigBuf, expectedSigBuf)
        } else {
            sigValid = false
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

        // Enforce signature verification
        if (!sigValid) {
            await logCallback({
                project_code: pid,
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

        // 6. Update response status
        const now = new Date().toISOString()
        const { error: updateError } = await db
            .from('responses')
            .update({
                status: internalStatus,
                completion_time: now,  // Correct column name is completion_time
                updated_at: now
            })
            .eq('id', response.id)

        if (updateError) {
            console.error('[Callback] Database update failed:', updateError)
            throw new Error(`Database update failed: ${updateError.message}`)
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

        // 8. Return success
        return NextResponse.json({
            success: true,
            status: internalStatus
        })

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
