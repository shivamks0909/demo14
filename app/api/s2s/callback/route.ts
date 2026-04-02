import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '@/lib/unified-db'
import crypto from 'crypto'

export const runtime = "nodejs"

interface S2SCallbackPayload {
    oi_session: string
    status: 'complete' | 'terminate' | 'quota' | 'security'
    timestamp: number
    hash: string
}

function verifyHmac(secret: string, payload: Record<string, any>, receivedHash: string): boolean {
    // Recreate canonical payload
    const canonical = Object.keys(payload)
        .sort()
        .map(k => `${k}=${payload[k]}`)
        .join('&')

    const expectedHash = crypto
        .createHmac('sha256', secret)
        .update(canonical)
        .digest('hex')

    return crypto.timingSafeEqual(
        Buffer.from(expectedHash),
        Buffer.from(receivedHash)
    )
}

function isIpAllowed(allowedIps: string | null, callerIp: string): boolean {
    if (!allowedIps) return true

    const ips = allowedIps.split(',').map(ip => ip.trim())
    return ips.includes(callerIp) || ips.includes('*')
}

export async function POST(request: NextRequest) {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    try {
        const body: S2SCallbackPayload = await request.json()

        // Validate required fields
        if (!body.oi_session || !body.status || !body.timestamp || !body.hash) {
            return NextResponse.json(
                { success: false, reason: 'missing_required_fields' },
                { status: 400 }
            )
        }

        // Timestamp validation (5 minute window)
        const now = Math.floor(Date.now() / 1000)
        const age = Math.abs(now - body.timestamp)

        if (age > 300) {
            return NextResponse.json(
                { success: false, reason: 'timestamp_expired' },
                { status: 400 }
            )
        }

        const { database: db } = await getUnifiedDb()
        if (!db) {
            return NextResponse.json(
                { success: false, reason: 'database_unavailable' },
                { status: 503 }
            )
        }

        // Find response by oi_session
        const { data: response } = await db
            .from('responses')
            .select('*')
            .eq('oi_session', body.oi_session)
            .maybeSingle()

        if (!response) {
            return NextResponse.json(
                { success: false, reason: 'session_not_found' },
                { status: 404 }
            )
        }

        // Check if already verified (idempotent)
        if (response.s2s_verified) {
            return NextResponse.json(
                { success: true, idempotent: true, verified_at: response.s2s_verified_at }
            )
        }

        // Get S2S config for project
        const { data: s2sConfig } = await db
            .from('s2s_config')
            .select('*')
            .eq('project_id', response.project_id)
            .maybeSingle()

        const secret = s2sConfig?.secret_key || response.s2s_token

        if (!secret) {
            return NextResponse.json(
                { success: false, reason: 's2s_not_configured' },
                { status: 400 }
            )
        }

        // Verify HMAC signature
        const payloadForVerification = {
            oi_session: body.oi_session,
            status: body.status,
            timestamp: body.timestamp
        }

        const isValid = verifyHmac(secret, payloadForVerification, body.hash)

        if (!isValid) {
            // Log failed verification
            await db.from('s2s_logs').insert([{
                response_id: response.id,
                hash_match: false,
                ip_match: null,
                timestamp_check: false,
                overall_result: false,
                payload: payloadForVerification,
                verified_at: new Date().toISOString()
            }])

            return NextResponse.json(
                { success: false, reason: 'invalid_signature' },
                { status: 401 }
            )
        }

        // Check IP whitelist if configured
        if (s2sConfig?.allowed_ips && !isIpAllowed(s2sConfig.allowed_ips, ip)) {
            await db.from('s2s_logs').insert([{
                response_id: response.id,
                hash_match: true,
                ip_match: false,
                timestamp_check: true,
                overall_result: false,
                payload: payloadForVerification,
                verified_at: new Date().toISOString()
            }])

            return NextResponse.json(
                { success: false, reason: 'ip_not_allowed' },
                { status: 403 }
            )
        }

        // All checks passed - mark as verified
        await db.from('responses')
            .update({
                s2s_verified: true,
                s2s_verified_at: new Date().toISOString()
            })
            .eq('id', response.id)

        // Log successful verification
        await db.from('s2s_logs').insert([{
            response_id: response.id,
            hash_match: true,
            ip_match: s2sConfig?.allowed_ips ? isIpAllowed(s2sConfig.allowed_ips, ip) : null,
            timestamp_check: true,
            overall_result: true,
            payload: payloadForVerification,
            verified_at: new Date().toISOString()
        }])

        return NextResponse.json({
            success: true,
            verified: true,
            verified_at: new Date().toISOString()
        })

    } catch (error) {
        console.error('[S2S] Callback error:', error)
        return NextResponse.json(
            { success: false, reason: 'server_error' },
            { status: 500 }
        )
    }
}
