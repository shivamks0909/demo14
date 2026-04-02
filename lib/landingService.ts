import { NextRequest } from "next/server";
import { createAdminClient } from "./insforge-server";
import { getClientIp } from "./getClientIp";
import { Response } from "./types";

export async function getLandingDataByClickId(clickid: string): Promise<Response | null> {
    const db = await createAdminClient()
    if (!db) return null

    const { data: response } = await db.database
        .from('responses')
        .select('*')
        .eq('clickid', clickid)
        .maybeSingle()

    return response as Response | null
}

/**
 * Simple redirect-based status updater.
 * Finds the exact record by clickid (or latest in_progress/started record for a given uid).
 * Safety rules:
 *   1. Never inserts a new row
 *   2. Never overwrites a status that is already finalized
 *   3. Returns null if no record found
 */
export async function updateResponseStatus(
    projectCode: string,
    userUid: string,
    newStatus: string,
    clickid?: string | null,
    lastLandingPage?: string | null
): Promise<{ id: string; status: string; uid: string; ip: string; supplier_uid?: string; project_code?: string; client_uid_sent?: string; hash_identifier?: string; clickid?: string } | null> {
    const db = await createAdminClient()
    if (!db) return null

    let existing: any = null

    // STEP 1a — Find by oi_session (preferred — zero vendor PID collision risk)
    if (clickid && clickid.includes('-') && clickid.length === 36) {
        const { data: bySession } = await db.database
            .from('responses')
            .select('id, status, uid, ip, project_code, start_time, supplier_uid, client_uid_sent, hash_identifier')
            .eq('oi_session', clickid)
            .in('status', ['in_progress', 'started', 'click'])
            .maybeSingle()
        existing = bySession
    }

    // STEP 1b — Find the record by clickid (Case-Insensitive)
    if (!existing && clickid) {
        const cleanCid = clickid.trim()
        const { data } = await db.database
            .from('responses')
            .select('id, status, uid, ip, project_code, start_time, supplier_uid, client_uid_sent, hash_identifier')
            .ilike('clickid', cleanCid)
            .in('status', ['in_progress', 'started', 'click'])
            .maybeSingle()
        existing = data
    }

    // Fallback: Try with project_code + uid
    if (!existing && projectCode) {
        const cleanUid = userUid.trim()
        const { data } = await db.database
            .from('responses')
            .select('id, status, uid, ip, project_code, start_time, supplier_uid, client_uid_sent, hash_identifier')
            .or(`uid.ilike.${cleanUid},client_uid_sent.ilike.${cleanUid},client_pid.ilike.${cleanUid}`)
            .eq('project_code', projectCode)
            .in('status', ['in_progress', 'started', 'click'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        existing = data
    }

    // NEW FALLBACK: Try with client_pid + uid
    if (!existing && projectCode) {
        const cleanUid = userUid.trim()
        const { data } = await db.database
            .from('responses')
            .select('id, status, uid, ip, project_code, start_time, supplier_uid, client_uid_sent, hash_identifier')
            .or(`uid.ilike.${cleanUid},client_uid_sent.ilike.${cleanUid},client_pid.ilike.${cleanUid}`)
            .eq('client_pid', projectCode)
            .in('status', ['in_progress', 'started', 'click'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        existing = data
    }

    // Fallback: try uid-only
    if (!existing) {
        const cleanUid = userUid.trim()
        const { data } = await db.database
            .from('responses')
            .select('id, status, uid, ip, project_code, start_time, supplier_uid, client_uid_sent, hash_identifier')
            .or(`uid.ilike.${cleanUid},client_uid_sent.ilike.${cleanUid},client_pid.ilike.${cleanUid}`)
            .in('status', ['in_progress', 'started'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        existing = data
    }

    if (!existing) {
        console.warn(`[updateResponseStatus] No record found for pid=${projectCode}, uid=${userUid}, clickid=${clickid}`);
        return null;
    }

    // Optional attributes to update
    const now = new Date()
    const updatePayload: any = {
        status: newStatus,
        updated_at: now.toISOString()
    }
    if (clickid) updatePayload.hash = clickid
    if (lastLandingPage) updatePayload.last_landing_page = lastLandingPage

    const terminalStatuses = ['complete', 'terminate', 'quota', 'security_terminate', 'duplicate_ip', 'duplicate_string', 'terminated', 'quota_full']
    if (terminalStatuses.includes(newStatus)) {
        updatePayload.completion_time = now.toISOString()

        if (existing.start_time) {
            const startTime = new Date(existing.start_time)
            const durationSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000)
            updatePayload.duration_seconds = Math.max(0, durationSeconds)
        }
    }

    // STEP 2 — Update by specific id
    console.log(`[updateResponseStatus] Attempting update for id=${existing.id} to ${newStatus}`);

    const { error, data } = await db.database
        .from('responses')
        .update(updatePayload)
        .eq('id', existing.id)
        .in('status', ['in_progress', 'started', 'click'])
        .select()
        .single()

    if (error) {
        console.error(`[updateResponseStatus] Update failed for id=${existing.id}:`, error);
        return null;
    }

    if (!data) {
        console.warn(`[updateResponseStatus] Update affected 0 rows for id=${existing.id}. Status might have changed.`);
        return null;
    }

    console.log(`[updateResponseStatus] Successfully updated id=${existing.id} to ${newStatus}`);
    return data as any;
}

export async function getLandingPageData(
    params: { [key: string]: string | string[] | undefined },
    request: NextRequest
) {
    const cookieUid = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('last_uid='))?.split('=')[1]
    const cookiePid = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('last_pid='))?.split('=')[1]
    const cookieSid = request.headers.get('cookie')?.split(';').find(c => c.trim().startsWith('last_sid='))?.split('=')[1]

    // Accept both pid and code — pid always wins
    const code = (params.pid as string) || (params.code as string) || cookiePid || "N/A";
    const uid = (params.uid as string) || cookieUid || "N/A";
    const clickid = (params.oi_session as string) || (params.session_token as string) || (params.clickid as string) || (params.cid as string) || cookieSid || null;
    const ip = (params.ip as string) || getClientIp(request);

    const result = {
        pid: code,
        uid,
        clickid,
        ip,
        response: null as any,
        project: null as any,
        supplier: null as any
    };

    const db = await createAdminClient()
    if (!db) return result

    if (clickid) {
        // ... (existing lookup logic remains similar but we ensure we get supplier token)
        const { data: respBySid } = await db.database
            .from('responses')
            .select('*, suppliers(*)')
            .eq('oi_session', clickid)
            .maybeSingle()

        const { data: respByCid } = !respBySid ? await db.database
            .from('responses')
            .select('*, suppliers(*)')
            .eq('clickid', clickid)
            .maybeSingle() : { data: null }

        const resp = respBySid || respByCid
        if (resp) {
            result.response = resp
            result.pid = resp.project_code || code
            result.uid = resp.uid || resp.user_uid || uid
            result.supplier = resp.suppliers

            // FALLBACK: If join failed but we have a token, fetch manually
            if (!result.supplier && resp.supplier_token) {
                const { data: s } = await db.database
                    .from('suppliers')
                    .select('*')
                    .eq('supplier_token', resp.supplier_token)
                    .maybeSingle()
                result.supplier = s
            }
        }
    }

    // Fallback: lookup by uid if no clickid response found
    if (!result.response && uid && uid !== 'N/A') {
        const { data: resp } = await db.database
            .from('responses')
            .select('*, suppliers(*)')
            .eq('uid', uid)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (resp) {
            result.response = resp
            result.pid = resp.project_code || code
            result.supplier = resp.suppliers
        }
    }

    // If supplier still missing, try to get from query params
    const sToken = (params.supplier as string);
    if (!result.supplier && sToken) {
        // Database is now live, always look there
        const { data: s } = await db.database
            .from('suppliers')
            .select('*')
            .eq('supplier_token', sToken)
            .maybeSingle();

        if (s) {
            result.supplier = s;
        }
    }

    if (result.pid && result.pid !== "N/A") {
        const { data: proj } = await db.database
            .from('projects')
            .select('*')
            .eq('project_code', result.pid)
            .maybeSingle()

        if (proj) result.project = proj
    }

    return result;
}
