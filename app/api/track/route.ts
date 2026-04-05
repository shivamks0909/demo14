import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '../../../lib/unified-db'
import { getClientIp } from '../../../lib/getClientIp'
import * as crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Track Endpoint - Entry point for survey routing
 * 
 * Query Parameters:
 *   code (required): Project code
 *   uid (required): User ID
 * 
 * Behavior:
 * 1. Validate project exists and is active
 * 2. Generate oi_session (UUID v4)
 * 3. Create response record (status: in_progress)
 * 4. Build survey URL with dynamic session params
 * 5. Redirect to client survey
 */

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    // Accept multiple parameter names for project identifier (code, pid, project, project_code)
    const projectCode = searchParams.get('code') || searchParams.get('pid') || searchParams.get('project') || searchParams.get('project_code')
    // Accept multiple parameter names for user identifier (uid, user, respondent, rid)
    const uid = searchParams.get('uid') || searchParams.get('user') || searchParams.get('respondent') || searchParams.get('rid')
    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    // Validate required params
    if (!projectCode || !uid) {
        return NextResponse.json(
            { success: false, error: 'Missing required parameters: code (or pid) and uid (or rid)' },
            { status: 400 }
        )
    }

    // Validate input format
    if (!/^[a-zA-Z0-9_-]+$/.test(projectCode) || projectCode.length > 50) {
        return NextResponse.json(
            { success: false, error: 'Invalid project code format' },
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
            // Fetch available project codes for helpful error message
            const { data: availableProjects } = await db
                .from('projects')
                .select('project_code, project_name, status')
            
            const availableCodes = availableProjects?.map((p: any) => ({
                code: p.project_code,
                name: p.project_name,
                status: p.status
            })) || []

            return NextResponse.json(
                { 
                    success: false, 
                    error: `Project not found: "${projectCode}". Available projects: ${availableCodes.map((p: {code: string}) => p.code).join(', ') || 'none'}`,
                    availableProjects: availableCodes
                },
                { status: 404 }
            )
        }

        if (project.status !== 'active') {
            return NextResponse.redirect(new URL('/paused', request.url))
        }

        // 2. Generate session
        const oiSession = crypto.randomUUID()
        const now = new Date().toISOString()

        // 3. Create response record
        const responseId = `resp_${crypto.randomUUID()}`
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
                ip: ip,
                user_agent: userAgent,
                device_type: detectDevice(userAgent),
                start_time: now,
                created_at: now,
                updated_at: now,
            }])

        if (insertError) {
            console.error('[Track] Failed to create response:', insertError)
            return NextResponse.json(
                { success: false, error: 'Failed to create session' },
                { status: 500 }
            )
        }

        // 4. Build survey URL with dynamic params
        const surveyUrl = buildSurveyUrl(project.base_url, {
            oiSession,
            uid,
            projectCode: project.project_code,
            project
        })

        console.log(`[Track] Session created: ${oiSession} for project ${projectCode}, uid ${uid}`)
        console.log(`[Track] Redirecting to: ${surveyUrl}`)

        // 5. Redirect to survey
        const redirectResponse = NextResponse.redirect(surveyUrl)
        
        // Set tracking cookie
        redirectResponse.cookies.set('survey_session', oiSession, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 3600,
            path: '/'
        })

        return redirectResponse

    } catch (error: any) {
        console.error('[Track] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

function buildSurveyUrl(baseUrl: string, params: {
    oiSession: string;
    uid: string;
    projectCode: string;
    project: any;
}): string {
    const url = new URL(baseUrl)
    
    // Always pass dynamic session params
    url.searchParams.set('transactionId', params.oiSession)
    url.searchParams.set('transactionid', params.oiSession)
    url.searchParams.set('oi_session', params.oiSession)
    url.searchParams.set('oid', params.oiSession)
    url.searchParams.set('uid', params.uid)
    url.searchParams.set('pid', params.uid)
    url.searchParams.set('rid', params.uid)
    
    // Add project-specific params if configured
    if (params.project.client_pid_param) {
        url.searchParams.set(params.project.client_pid_param, params.uid)
    }
    if (params.project.client_uid_param) {
        url.searchParams.set(params.project.client_uid_param, params.uid)
    }
    
    return url.toString()
}

function detectDevice(userAgent: string): string {
    const ua = userAgent.toLowerCase()
    if (/mobile|android|iphone|ipad|ipod/i.test(ua)) return 'mobile'
    if (/tablet|ipad/i.test(ua)) return 'tablet'
    return 'desktop'
}
