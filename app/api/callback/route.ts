import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/insforge-server'
import crypto from 'crypto'

export const runtime = "nodejs";

function verifySignature(uid: string, sig: string): boolean {
    const secret = process.env.CALLBACK_SECRET;
    if (!secret) return true;

    const expected = crypto
        .createHmac("sha256", secret)
        .update(uid)
        .digest("hex");

    return expected === sig;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code') || searchParams.get('pid')
    const uid = searchParams.get('uid')
    const type = searchParams.get('type') || searchParams.get('status')
    const sig = searchParams.get('sig')

    // Primary match key — oi_session (zero PID collision risk)
    const oiSession = searchParams.get('oi_session') || searchParams.get('session_token') || null

    if (!uid && !oiSession) {
        return NextResponse.json({ error: "Missing UID or oi_session" }, { status: 400 })
    }

    // 1. Signature Verification
    if (process.env.CALLBACK_SECRET && sig && uid) {
        if (!verifySignature(uid, sig)) {
            console.error(`[callback] Invalid signature for UID ${uid}`);
            const url = new URL('/status', request.url)
            url.searchParams.set('uid', uid)
            url.searchParams.set('type', 'security_terminate')
            url.searchParams.set('pid', code || 'unknown')
            return NextResponse.redirect(url)
        }
    }

    const db = await createAdminClient()
    if (!db) {
        return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const statusMap: Record<string, string> = {
        'complete': 'complete',
        'terminate': 'terminated',
        'quota': 'quota_full',
        'quotafull': 'quota_full',
        'duplicate_string': 'duplicate_string',
        'duplicate_ip': 'duplicate_ip',
        'security_terminate': 'security_terminate'
    }

    const finalStatus = (type && statusMap[type]) ? statusMap[type] : 'terminated'
    const now = new Date().toISOString()

    // Refactored to use centralized updateResponseStatus for LOI and end_time support
    const { updateResponseStatus } = await import('@/lib/landingService')

    try {
        console.log(`[callback] Processing: oiSession=${oiSession}, uid=${uid}, status=${type}`)
        const updated = await updateResponseStatus(
            code || '',
            uid || '',
            finalStatus,
            oiSession || uid, // oiSession takes priority
            'callback_api'
        )

        if (!updated) {
            console.warn(`[callback] No record updated for oi_session=${oiSession} uid=${uid}`)
        } else {
            console.log(`[callback] Successfully updated record: ${updated.id} to ${finalStatus}`)
        }

        // 3. Redirect to Landing Page
        const landingUrl = new URL('/status', request.url)
        if (uid) landingUrl.searchParams.set('uid', uid)

        const redirectType = finalStatus === 'quota_full' ? 'quota' : finalStatus
        landingUrl.searchParams.set('type', redirectType)

        return NextResponse.redirect(landingUrl)

    } catch (e) {
        console.error('[callback] Exception:', e)
        const errorUrl = new URL('/status', request.url)
        if (uid) errorUrl.searchParams.set('uid', uid)
        errorUrl.searchParams.set('type', 'security_terminate')
        return NextResponse.redirect(errorUrl)
    }
}
