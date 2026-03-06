import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getClientIp } from '@/lib/getClientIp'

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    const ip = getClientIp(request);
    const searchParams = request.nextUrl.searchParams

    // Accept both pid and code (pid takes priority)
    const rawCode = searchParams.get('pid') || searchParams.get('code')
    const uid = searchParams.get('uid')
    const type = searchParams.get('type')
    const sessionToken = searchParams.get('session_token') || request.cookies.get('last_sid')?.value
    const cookieUid = request.cookies.get('last_uid')?.value
    const cookiePid = request.cookies.get('last_pid')?.value

    // Use cookie values as fallbacks if URL values are missing or placeholders
    const finalUid = (uid && uid !== '[UID]' && uid !== '{uid}') ? uid : cookieUid
    const finalPid = (rawCode && rawCode !== '[PID]') ? rawCode : cookiePid

    if (!type) {
        const errorUrl = new URL('/paused', request.url)
        errorUrl.searchParams.set('title', 'INVALID REQUEST')
        errorUrl.searchParams.set('desc', 'Missing type parameter.')
        return NextResponse.redirect(errorUrl)
    }

    const supabase = await createAdminClient()
    if (!supabase) {
        const fatalUrl = new URL('/paused', request.url)
        fatalUrl.searchParams.set('title', 'SYSTEM OFFLINE')
        fatalUrl.searchParams.set('desc', 'Database is not configured. Please try again later.')
        return NextResponse.redirect(fatalUrl)
    }

    const landingMap: Record<string, { db: string; route: string; title: string; desc: string }> = {
        'complete': { db: 'complete', route: '/complete', title: 'THANK YOU!', desc: 'Survey Completed Successfully' },
        'terminate': { db: 'terminated', route: '/terminate', title: 'SORRY!', desc: 'The link you are looking for is TERMINATED' },
        'terminated': { db: 'terminated', route: '/terminate', title: 'SORRY!', desc: 'The link you are looking for is TERMINATED' },
        'quota': { db: 'quota_full', route: '/quotafull', title: 'SORRY!', desc: 'The Quota for this survey is FULL' },
        'quota_full': { db: 'quota_full', route: '/quotafull', title: 'SORRY!', desc: 'The Quota for this survey is FULL' },
        'duplicate_string': { db: 'duplicate_string', route: '/duplicate-string', title: 'SORRY!', desc: 'Duplicate Entry Detected' },
        'duplicate_ip': { db: 'duplicate_ip', route: '/duplicate-ip', title: 'SORRY!', desc: 'Duplicate IP Address Detected' },
        'security_terminate': { db: 'security_terminate', route: '/security-terminate', title: 'ERROR!', desc: 'Security Validation Failed' }
    }

    const config = landingMap[type] || { db: 'terminate', route: '/terminate', title: 'SORRY!', desc: 'Survey session ended.' }

    try {
        let project: any = null
        let targetId: string | null = null
        let startedAt: string | null = null

        // ─── STEP 1: SESSION TOKEN LOOKUP (most reliable) ───────────────────
        if (sessionToken) {
            const { data: rec } = await supabase
                .from('responses')
                .select('id, started_at, project_id, project_code, projects!inner(*)')
                .eq('session_token', sessionToken)
                .maybeSingle()

            if (rec) {
                targetId = rec.id
                startedAt = rec.started_at
                project = (rec as any).projects
                console.log(`[status] Found via session_token → project: ${project?.project_code}, record: ${targetId}`)
            }
        }

        // ─── STEP 2: UID RECOVERY (cross-project, case-insensitive) ─────────
        if (!project && finalUid) {
            const cleanUid = finalUid.trim()
            const { data: rec } = await supabase
                .from('responses')
                .select('id, started_at, project_id, project_code, projects!inner(*)')
                .or(`uid.ilike.${cleanUid},client_uid_sent.ilike.${cleanUid},client_pid.ilike.${cleanUid}`)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (rec && (rec as any).projects) {
                targetId = rec.id
                startedAt = rec.started_at
                project = (rec as any).projects
                console.log(`[status] Recovered via UID → project: ${project?.project_code}, record: ${targetId}`)
            }
        }

        // ─── STEP 3: FALLBACK TO RAW CODE (only if UID found nothing) ───────
        if (!project && finalPid) {
            // First try internal project_code
            const { data: byCode } = await supabase
                .from('projects')
                .select('*')
                .eq('project_code', finalPid)
                .maybeSingle()

            project = byCode

            // If not found, it might be a client_pid being passed as 'pid'
            if (!project) {
                const { data: byPid } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('pid_prefix', finalPid.replace(/[0-9]/g, '')) // Rough extraction of prefix
                    .limit(1)
                    .maybeSingle()

                // Note: The projects table doesn't index generated PIDs, but responses does.
                // However, the status route needs the project object for RLS/Logic.
                // Better approach: if finalPid doesn't match project_code, we rely on Step 7's fallback update.
            }

            if (project) {
                console.log(`[status] Found project via provided code: ${finalPid}`)
            }
        }

        // ─── STEP 3.5: ATTEMPT TO FIND RECORD BY CLIENT_PID + UID ──────────
        if (!targetId && finalPid && finalUid) {
            const cleanUid = finalUid.trim()
            const { data: rec } = await supabase
                .from('responses')
                .select('id, started_at, project_id, project_code, projects!inner(*)')
                .eq('client_pid', finalPid)
                .or(`uid.ilike.${cleanUid},client_uid_sent.ilike.${cleanUid}`)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (rec) {
                targetId = rec.id
                startedAt = rec.started_at
                project = (rec as any).projects
                console.log(`[status] Recovered via Client PID + UID → record: ${targetId}`)
            }
        }

        // ─── STEP 4: IF NO PROJECT AT ALL - STILL REDIRECT CLEANLY ─────────
        if (!project) {
            // Unknown project/code - redirect to appropriate page, no DB write
            const landingUrl = new URL(config.route, request.url)
            landingUrl.searchParams.set('pid', finalPid || 'unknown')
            landingUrl.searchParams.set('uid', finalUid || 'N/A')
            console.log(`[status] No project found for code=${finalPid}, uid=${finalUid} → clean redirect`)
            return NextResponse.redirect(landingUrl)
        }

        // ─── STEP 5: CHECK IF PROJECT IS PAUSED ─────────────────────────────
        if (project.status === 'paused') {
            const pauseUrl = new URL('/paused', request.url)
            pauseUrl.searchParams.set('pid', project.project_code)
            pauseUrl.searchParams.set('uid', finalUid || 'N/A')
            return NextResponse.redirect(pauseUrl)
        }

        // ─── STEP 6: IF NO RECORD FOUND YET, TRY UID + PROJECT FALLBACK ────
        if (!targetId && finalUid) {
            const cleanUid = finalUid.trim()
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            const { data: rec } = await supabase
                .from('responses')
                .select('id, started_at')
                .eq('project_id', project.id)
                .or(`uid.ilike.${cleanUid},client_uid_sent.ilike.${cleanUid}`)
                .gt('created_at', twentyFourHoursAgo)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (rec) {
                targetId = rec.id
                startedAt = rec.started_at
                console.log(`[status] Found record via UID+project fallback: ${targetId}`)
            }
        }

        // ─── STEP 7: PERFORM DATABASE UPDATE (INSTANT FEEDBACK) ─────────────
        const now = new Date().toISOString()
        const updatePayload: any = {
            status: config.db,
            updated_at: now
        }
        if (config.db === 'complete') {
            updatePayload.completed_at = now
        }

        if (targetId) {
            console.log(`[status] Updating record ${targetId} to ${config.db}`)
            const { error: updateError } = await supabase
                .from('responses')
                .update(updatePayload)
                .eq('id', targetId)
                .in('status', ['in_progress', 'started', 'click']) // Prevent overwriting finalized statuses

            if (updateError) {
                console.error('[status] DB update failed:', updateError)
            }
        } else if (finalUid && project) {
            // Fallback: If we didn't have a targetId but had a UID/Project, try updating the latest in_progress record
            console.log(`[status] Fallback update for uid=${finalUid}, project=${project.project_code} to ${config.db}`)
            const cleanUid = finalUid.trim()
            const { error: fallbackError } = await supabase
                .from('responses')
                .update(updatePayload)
                .eq('project_id', project.id)
                .or(`uid.ilike.${cleanUid},client_uid_sent.ilike.${cleanUid}`)
                .in('status', ['in_progress', 'started', 'click'])
                .or(`project_code.eq.${finalPid},client_pid.eq.${finalPid}`) // Add OR condition for PID matching

            if (fallbackError) {
                console.error('[status] Fallback update failed:', fallbackError)
            }
        }

        // ─── STEP 8: CHECK SUPPLIER REDIRECT ────────────────────────────────────────
        let supplierRedirectUrl: string | null = null

        if (targetId) {
            const { data: responseRecord } = await supabase
                .from('responses')
                .select('supplier_token, supplier_uid, uid')
                .eq('id', targetId)
                .maybeSingle()

            if (responseRecord?.supplier_token) {
                const { data: supplierData } = await supabase
                    .from('suppliers')
                    .select('complete_redirect_url, terminate_redirect_url, quotafull_redirect_url')
                    .eq('supplier_token', responseRecord.supplier_token)
                    .eq('status', 'active')
                    .maybeSingle()

                if (supplierData) {
                    const rawSupplierUrl =
                        type === 'complete' ? supplierData.complete_redirect_url :
                            (type === 'terminate' || type === 'terminated') ? supplierData.terminate_redirect_url :
                                (type === 'quota' || type === 'quota_full') ? supplierData.quotafull_redirect_url :
                                    null

                    if (rawSupplierUrl) {
                        const supplierUid = responseRecord.supplier_uid || responseRecord.uid || finalUid || ''
                        try {
                            const url = new URL(rawSupplierUrl)
                            if (!url.searchParams.has('uid')) {
                                url.searchParams.set('uid', supplierUid)
                            }
                            supplierRedirectUrl = url.toString()
                            console.log(`[status] Supplier redirect → ${supplierRedirectUrl}`)
                        } catch {
                            console.error('[status] Invalid supplier redirect URL:', rawSupplierUrl)
                        }
                    }
                }
            }
        }

        // If supplier redirect exists, forward respondent there
        // Otherwise fall through to default landing page
        if (supplierRedirectUrl) {
            return NextResponse.redirect(supplierRedirectUrl)
        }

        // ─── STEP 9: FINAL REDIRECT ─────────────────────────────────────────
        const landingUrl = new URL(config.route, request.url)
        landingUrl.searchParams.set('pid', project.project_code)

        // Recover UID from record if available, otherwise fallback to finalUid or N/A
        let displayUid = finalUid || 'N/A'
        if (targetId) {
            const { data: recUid } = await supabase
                .from('responses')
                .select('supplier_uid, uid')
                .eq('id', targetId)
                .maybeSingle()
            if (recUid) {
                displayUid = recUid.supplier_uid || recUid.uid || displayUid
            }
        }
        landingUrl.searchParams.set('uid', displayUid)

        if (targetId) {
            const { data: cidData } = await supabase.from('responses').select('clickid').eq('id', targetId).maybeSingle();
            if (cidData?.clickid) {
                landingUrl.searchParams.set('cid', cidData.clickid)
            }
        }

        landingUrl.searchParams.set('session_token', sessionToken || '')

        if (request.nextUrl.searchParams.has('desc')) {
            landingUrl.searchParams.set('desc', request.nextUrl.searchParams.get('desc')!)
        }

        console.log(`[status] Redirecting to landing: ${config.route} (pid=${project.project_code})`)
        return NextResponse.redirect(landingUrl)

    } catch (error) {
        console.error('[status] Unhandled exception:', error)
        const fatalUrl = new URL('/paused', request.url)
        fatalUrl.searchParams.set('title', 'SYSTEM ERROR')
        fatalUrl.searchParams.set('desc', 'An unexpected error occurred.')
        return NextResponse.redirect(fatalUrl)
    }
}
