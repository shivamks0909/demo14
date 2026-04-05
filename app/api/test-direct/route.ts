import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '../../../lib/unified-db'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Direct Test Flow Endpoint
 * One-click test: Creates response → Updates to complete → Redirects to landing page
 * Usage: /api/test-direct?type=complete
 *        /api/test-direct?type=terminate
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'complete'
    const projectCode = searchParams.get('code') || 'PROJ001'
    
    try {
        const { database: db } = await getUnifiedDb()
        if (!db) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        }

        // Generate unique session
        const sessionId = `test_${crypto.randomUUID()}`
        const testUid = `DIRECT_TEST_${Date.now()}`

        // 1. Create response record
        const responseId = `resp_${crypto.randomUUID()}`
        await db.from('responses').insert([{
            id: responseId,
            project_code: projectCode,
            uid: testUid,
            clickid: sessionId,
            oi_session: sessionId,
            session_token: sessionId,
            status: 'in_progress',
            ip: '127.0.0.1',
            user_agent: 'Direct Test',
            device_type: 'desktop',
            created_at: new Date().toISOString()
        }])

        console.log(`[Test Direct] Created response: ${responseId}`)

        // 2. Update status to terminal
        const now = new Date().toISOString()
        const statusMap: Record<string, string> = {
            complete: 'complete',
            terminate: 'terminate',
            quota: 'quota_full'
        }
        const finalStatus = statusMap[type] || 'complete'

        await db.from('responses').update({
            status: finalStatus,
            completion_time: finalStatus === 'complete' ? now : null,
            updated_at: now
        }).eq('id', responseId)

        console.log(`[Test Direct] Updated status to: ${finalStatus}`)

        // 3. Redirect to clean landing page (CID hidden in cookie)
        const statusUrl = `/status?code=${encodeURIComponent(projectCode)}&type=${encodeURIComponent(type)}`
        
        const redirectResponse = NextResponse.redirect(new URL(statusUrl, request.url))
        redirectResponse.cookies.set('survey_session', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 3600,
            path: '/'
        })
        
        return redirectResponse

    } catch (error: any) {
        console.error('[Test Direct] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
