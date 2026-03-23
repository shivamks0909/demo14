import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/insforge-server'
import { getClientIp } from '@/lib/getClientIp'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export const runtime = "nodejs"

type UidParamConfig = {
    param: string
    value: 'client_rid' | 'supplier_uid' | 'session' | 'hash' | string
}

function buildSurveyUrl(
    rawUrl: string,
    sessionToken: string,
    clientRid: string,
    supplierUid: string,
    hashId: string,
    prefix: string,
    clientPidParam?: string | null,
    clientUidParam?: string | null,
    uidParams?: UidParamConfig[] | null
): string {
    const url = new URL(rawUrl)

    // CRITICAL FIX: forceSet always overwrites — even empty/placeholder params
    const forceSet = (key: string, value: string) => {
        url.searchParams.set(key, value)
    }

    const resolveValue = (valueType: string): string => {
        switch (valueType) {
            case 'client_rid':   return clientRid
            case 'supplier_uid': return supplierUid
            case 'session':      return sessionToken
            case 'hash':         return hashId
            default:             return valueType
        }
    }

    // Session always injected
    forceSet(`${prefix}session`, sessionToken)

    // Priority 1: uid_params array (multi param mode)
    if (uidParams && uidParams.length > 0) {
        for (const cfg of uidParams) {
            if (cfg.param) forceSet(cfg.param, resolveValue(cfg.value))
        }
        return url.toString()
    }

    // Priority 2: legacy single param mode
    if (clientPidParam) forceSet(clientPidParam, clientRid)
    if (clientUidParam) forceSet(clientUidParam, clientRid)

    // Priority 3: default fallback
    if (!clientPidParam && !clientUidParam) {
        let injected = false
        const PLACEHOLDERS = ['', '[UID]', '{uid}', '##RID##', 'REPLACE', '[RID]', '{rid}']
        for (const [key, val] of url.searchParams.entries()) {
            if (PLACEHOLDERS.includes(val)) {
                forceSet(key, clientRid)
                injected = true
            }
        }
        if (!injected) forceSet(`${prefix}uid`, clientRid)
    }

    return url.toString()
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ code: string; slug: string[] }> }
) {
    const { code, slug } = await context.params
    const ip = getClientIp(request)

    let incomingUid: string | null = null
    let supplierToken: string | null = null

    if (slug.length === 1) {
        incomingUid = slug[0]
        supplierToken = request.nextUrl.searchParams.get('supplier') || null
    } else if (slug.length >= 2) {
        supplierToken = slug[0]
        incomingUid = slug[1]
    }

    if (!code || !incomingUid) {
        return NextResponse.redirect(new URL('/paused?title=INVALID_LINK', request.url))
    }

    const insforge = await createAdminClient()
    if (!insforge) {
        return NextResponse.redirect(new URL('/paused?title=SYSTEM_OFFLINE', request.url))
    }

    try {
        const { data: project } = await insforge.database
            .from('projects')
            .select('*')
            .eq('project_code', code)
            .maybeSingle()

        if (!project) return NextResponse.redirect(new URL('/paused?title=PROJECT_NOT_FOUND', request.url))
        if (project.status === 'paused') return NextResponse.redirect(new URL(`/paused?pid=${code}&title=PROJECT_PAUSED`, request.url))

        let supplierName: string | null = null
        if (supplierToken) {
            const { data: supplierRow } = await insforge.database
                .from('suppliers')
                .select('name')
                .eq('supplier_token', supplierToken)
                .eq('status', 'active')
                .maybeSingle()
            if (supplierRow) supplierName = supplierRow.name
        }

        const sessionToken = crypto.randomUUID()
        const oiPrefix: string = (project as any).oi_prefix || 'oi_'
        let clientUidToSent = incomingUid  // default: pass supplier UID as-is

        // PID generation (custom RID)
        if (project.pid_prefix) {
            const { data: updatedProject, error: updateError } = await insforge.database
                .from('projects')
                .update({ pid_counter: (project.pid_counter || 0) + 1 })
                .eq('id', project.id)
                .select('pid_counter')
                .single()

            if (!updateError && updatedProject) {
                const countryParam = request.nextUrl.searchParams.get('country') || request.nextUrl.searchParams.get('c')
                const countryPart = countryParam ? countryParam.toUpperCase() : ''
                const generatedPid = `${project.pid_prefix}${countryPart}${String(updatedProject.pid_counter).padStart(project.pid_padding || 2, '0')}`
                if (project.force_pid_as_uid) clientUidToSent = generatedPid
            }
        }

        if (project.target_uid) clientUidToSent = project.target_uid

        const hashIdentifier = crypto.createHash('sha256')
            .update(`${incomingUid}-${Date.now()}`).digest('hex').substring(0, 8)

        // Parse uid_params from DB
        let uidParams: UidParamConfig[] | null = null
        if ((project as any).uid_params) {
            try {
                const raw = (project as any).uid_params
                uidParams = typeof raw === 'string' ? JSON.parse(raw) : raw
            } catch {
                console.warn('[UnifiedRouter] uid_params parse failed, using legacy mode')
            }
        }

        // DB insert — supplier_uid is ALWAYS the original incomingUid
        const { error: insertError } = await insforge.database
            .from('responses')
            .insert([{
                project_id: project.id,
                project_code: code,
                project_name: project.project_name || code,
                supplier_uid: incomingUid,        // original supplier UID — never overwrite
                client_uid_sent: clientUidToSent, // custom RID sent to client
                uid: incomingUid,
                user_uid: incomingUid,
                hash_identifier: hashIdentifier,
                session_token: sessionToken,
                oi_session: sessionToken,
                clickid: sessionToken,
                hash: sessionToken,
                supplier_token: supplierToken,
                supplier_name: supplierName,
                supplier: supplierToken,
                status: 'in_progress',
                ip: ip,
                user_agent: request.headers.get('user-agent') || 'Unknown',
                last_landing_page: 'entry',
                start_time: new Date().toISOString(),
                created_at: new Date().toISOString()
            }])

        if (insertError) {
            console.error('[UnifiedRouter] DB Insert failed:', insertError)
            return NextResponse.redirect(new URL('/paused?title=TRACKING_ERROR', request.url))
        }

        const cookieStore = await cookies()
        const cookieOptions = { maxAge: 60 * 60 * 4, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const }
        cookieStore.set('last_sid', sessionToken, cookieOptions)
        cookieStore.set('last_uid', incomingUid, cookieOptions)
        cookieStore.set('last_pid', code, cookieOptions)

        const builtUrl = buildSurveyUrl(
            project.base_url,
            sessionToken,
            clientUidToSent,
            incomingUid,
            hashIdentifier,
            oiPrefix,
            project.client_pid_param,
            project.client_uid_param,
            uidParams
        )

        console.log(`[UnifiedRouter] supplier_uid=${incomingUid} | client_rid=${clientUidToSent} | url=${builtUrl}`)
        return NextResponse.redirect(new URL(builtUrl))

    } catch (e) {
        console.error('[UnifiedRouter] Exception:', e)
        return NextResponse.redirect(new URL('/paused?title=SYSTEM_ERROR', request.url))
    }
}
