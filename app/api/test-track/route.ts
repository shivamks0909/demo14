import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '../../../lib/unified-db'
import * as crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Test API - Creates a response entry and returns JSON (no redirect)
 * Used by /test-survey page for testing
 */
export async function POST(request: NextRequest) {
    const body = await request.json()
    const { projectCode, uid } = body

    if (!projectCode || !uid) {
        return NextResponse.json(
            { success: false, error: 'Missing projectCode or uid' },
            { status: 400 }
        )
    }

    const { database: db } = await getUnifiedDb()
    if (!db) {
        return NextResponse.json(
            { success: false, error: 'Database unavailable' },
            { status: 503 }
        )
    }

    try {
        // 1. Find project
        const { data: project, error: projectError } = await db
            .from('projects')
            .select('*')
            .eq('project_code', projectCode)
            .maybeSingle()

        if (projectError || !project) {
            return NextResponse.json(
                { success: false, error: `Project not found: ${projectCode}` },
                { status: 404 }
            )
        }

        if (project.status !== 'active') {
            return NextResponse.json(
                { success: false, error: `Project is ${project.status}` },
                { status: 400 }
            )
        }

        // 2. Generate session
        const oiSession = crypto.randomUUID()
        const now = new Date().toISOString()
        const responseId = `resp_${crypto.randomUUID()}`

        // 3. Create response record
        const { error: insertError } = await db
            .from('responses')
            .insert([{
                id: responseId,
                project_id: project.id,
                project_code: project.project_code,
                project_name: project.project_name,
                uid: uid,
                oi_session: oiSession,
                clickid: oiSession,
                session_token: oiSession,
                status: 'in_progress',
                ip: '127.0.0.1',
                user_agent: 'Test Browser',
                device_type: 'desktop',
                start_time: now,
                created_at: now,
                updated_at: now,
            }])

        if (insertError) {
            console.error('[Test Track] Insert error:', insertError)
            return NextResponse.json(
                { success: false, error: 'Failed to create response', details: insertError },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            session: {
                id: responseId,
                project_code: project.project_code,
                project_name: project.project_name,
                uid: uid,
                oi_session: oiSession,
                clickid: oiSession,
                status: 'in_progress',
                survey_url: project.base_url
            }
        })

    } catch (error: any) {
        console.error('[Test Track] Error:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
