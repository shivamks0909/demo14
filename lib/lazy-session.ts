/**
 * Lazy Session Creation Module
 * 
 * Creates tracking sessions on-the-fly when a valid callback is received
 * without a pre-existing response record. This enables direct URL tracking
 * where clients send callbacks without going through our /track endpoint.
 * 
 * Security: Validates callbacks before creating sessions to prevent fake entries.
 */

import { getUnifiedDb } from './unified-db'
import * as crypto from 'crypto'

export interface LazySessionParams {
    clickid: string
    type: string
    ip: string
    userAgent: string
    projectCode?: string
    uid?: string
}

export interface LazySessionResult {
    success: boolean
    error?: string
    sessionId?: string
}

/**
 * Validates a callback before lazy session creation.
 * Returns true if the callback passes all security checks.
 */
async function validateCallback(params: LazySessionParams): Promise<{ valid: boolean; reason?: string }> {
    // 1. Input validation
    if (!params.clickid || params.clickid.length > 255) {
        return { valid: false, reason: 'Invalid clickid' }
    }
    
    // Check for suspicious patterns (SQL injection, XSS)
    if (/[;'"\\]/.test(params.clickid) || /<script/i.test(params.clickid)) {
        return { valid: false, reason: 'Suspicious clickid format' }
    }

    // 2. Type validation
    const validTypes = ['complete', 'terminate', 'quota_full', 'security_terminate']
    if (!validTypes.includes(params.type)) {
        return { valid: false, reason: `Invalid type: ${params.type}` }
    }

    // 3. Rate limiting - max 3 lazy creations per IP per minute
    const { database: db } = await getUnifiedDb()
    if (!db) return { valid: false, reason: 'Database unavailable' }

    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
    const { data: recentCreations } = await db
        .from('responses')
        .select('id')
        .eq('ip', params.ip)
        .eq('source', 'direct_url')
        .gt('created_at', oneMinuteAgo)

    if (recentCreations && recentCreations.length >= 3) {
        return { valid: false, reason: 'Rate limit exceeded' }
    }

    // 4. Check if this clickid already exists (prevent duplicates)
    const { data: existing } = await db
        .from('responses')
        .select('id')
        .eq('clickid', params.clickid)
        .maybeSingle()

    if (existing) {
        return { valid: false, reason: 'Duplicate clickid' }
    }

    return { valid: true }
}

/**
 * Creates a lazy session for a direct URL callback.
 * Only called after validation passes.
 */
export async function createLazySession(params: LazySessionParams): Promise<LazySessionResult> {
    try {
        // Validate first
        const validation = await validateCallback(params)
        if (!validation.valid) {
            return { success: false, error: validation.reason }
        }

        const { database: db } = await getUnifiedDb()
        if (!db) {
            return { success: false, error: 'Database unavailable' }
        }

        const now = new Date().toISOString()
        const sessionId = `lazy_${crypto.randomUUID()}`

        // Map type to status
        const statusMap: Record<string, string> = {
            complete: 'complete',
            terminate: 'terminate',
            quota_full: 'quota_full',
            security_terminate: 'security_terminate'
        }

        const status = statusMap[params.type] || 'terminate'

        // Create response record
        const { error: insertError } = await db
            .from('responses')
            .insert([{
                id: sessionId,
                project_id: null,
                project_code: params.projectCode || 'DIRECT_URL',
                project_name: 'Direct URL Launch',
                uid: params.uid || 'unknown',
                oi_session: params.clickid,
                clickid: params.clickid,
                session_token: params.clickid,
                status: status,
                ip: params.ip,
                user_agent: params.userAgent,
                device_type: detectDevice(params.userAgent),
                start_time: now,
                completion_time: status === 'complete' ? now : null,
                created_at: now,
                updated_at: now,
            }])

        if (insertError) {
            console.error('[LazySession] Failed to create session:', insertError)
            return { success: false, error: 'Failed to create session' }
        }

        console.log(`[LazySession] Created session ${sessionId} for clickid ${params.clickid}`)
        return { success: true, sessionId }

    } catch (error: any) {
        console.error('[LazySession] Error:', error)
        return { success: false, error: error.message || 'Unknown error' }
    }
}

function detectDevice(userAgent: string): string {
    const ua = userAgent.toLowerCase()
    if (/mobile|android|iphone|ipad|ipod/i.test(ua)) return 'mobile'
    if (/tablet|ipad/i.test(ua)) return 'tablet'
    return 'desktop'
}
