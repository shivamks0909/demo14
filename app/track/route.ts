import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/insforge-server'
import { getClientIp } from '@/lib/getClientIp'
import { auditService } from '@/lib/audit-service'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = "nodejs";

/**
 * Smart URL Builder — GOLDEN RULE: never reuse vendor parameter names.
 *
 * Appends internal tracking params using the project's oi_prefix (default: "oi_").
 * NEVER overwrites parameters that already exist in the base URL.
 * The client's existing ?pid=, ?uid=, ?gid= etc. are untouched.
 */
function buildSurveyUrl(
    rawUrl: string,
    sessionToken: string,
    supplierUid: string,
    supplierName: string | null,
    prefix: string
): string {
    const url = new URL(rawUrl)
    const existingParams = new Set(url.searchParams.keys())

    const safeSet = (key: string, value: string) => {
        // Never overwrite an existing vendor param
        if (!existingParams.has(key)) {
            url.searchParams.set(key, value)
        }
    }

    // Internal tracking namespace — always safe
    safeSet(`${prefix}session`, sessionToken)
    safeSet(`${prefix}uid`, supplierUid)
    if (supplierName) safeSet(`${prefix}supplier`, supplierName)

    return url.toString()
}

export async function GET(request: NextRequest) {
    const ip = getClientIp(request);
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code') || searchParams.get('pid')
    const rawUid = searchParams.get('uid')
    const supplierName = searchParams.get('supplier') || searchParams.get('oi_supplier') || null
    const clickid = searchParams.get('clickid') || searchParams.get('cid')

    // 1. UID Validation & Normalization
    let validatedUid = (rawUid && rawUid.trim() !== '' && rawUid !== '[UID]' && rawUid !== 'N/A')
        ? rawUid
        : crypto.randomUUID()

    if (!code) {
        const errorUrl = new URL('/paused', request.url)
        errorUrl.searchParams.set('title', 'INVALID LINK')
        errorUrl.searchParams.set('desc', 'The project code is missing or invalid.')
        errorUrl.searchParams.set('status', 'error')
        return NextResponse.redirect(errorUrl)
    }

    const insforge = await createAdminClient()
    if (!insforge) {
        const fatalUrl = new URL('/paused', request.url)
        fatalUrl.searchParams.set('title', 'SYSTEM OFFLINE')
        fatalUrl.searchParams.set('desc', 'Database is not configured. Please try again later.')
        return NextResponse.redirect(fatalUrl)
    }

    try {
        // 2. Fetch project details
        let { data: project, error: fetchError } = await insforge.database
            .from('projects')
            .select('*')
            .eq('project_code', code)
            .maybeSingle()

        // Fallback for dynamic project if explicit code not found
        if (!project) {
            const { data: dynamicP } = await insforge.database.from('projects').select('*').eq('project_code', 'DYNAMIC_ENTRY').maybeSingle()
            if (dynamicP) project = dynamicP
        }

        // 3. VALIDATION (Rule: Only valid project codes can create records)
        if (!project) {
            const testTarget = searchParams.get('target') || 'https://www.google.com'
            if (searchParams.has('target')) return NextResponse.redirect(new URL(testTarget))

            const errorUrl = new URL('/paused', request.url)
            errorUrl.searchParams.set('title', 'PROJECT NOT FOUND')
            errorUrl.searchParams.set('desc', 'The project code does not exist in our system.')
            return NextResponse.redirect(errorUrl)
        }

        // Project status check
        if (project.status === 'paused') {
            const pauseUrl = new URL('/paused', request.url)
            pauseUrl.searchParams.set('pid', code)
            pauseUrl.searchParams.set('ip', ip)
            pauseUrl.searchParams.set('title', 'PROJECT PAUSED')
            pauseUrl.searchParams.set('desc', 'This project is currently paused by admin.')
            return NextResponse.redirect(pauseUrl)
        }

        const userAgent = request.headers.get('user-agent') || 'Unknown'
        const countryParam = searchParams.get('country') || searchParams.get('c')
        const sessionToken = crypto.randomUUID() // Secure internal session token

        // --- Device Type Detection ---
        let deviceType = 'Desktop'
        const ua = userAgent.toLowerCase()
        if (ua.includes('tablet') || ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile'))) {
            deviceType = 'Tablet'
        } else if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) {
            deviceType = 'Mobile'
        }

        // --- Geo IP detection & Mismatch Check ---
        let geoCountry = 'Unknown'
        if (ip !== '127.0.0.1' && ip !== '::1') {
            try {
                const vercelCountry = request.headers.get('x-vercel-ip-country')
                if (vercelCountry) {
                    geoCountry = vercelCountry
                } else {
                    // Use production GeoIP service with caching
                    const { getCountryFromIp } = await import('@/lib/geoip-service')
                    geoCountry = await getCountryFromIp(request, ip)
                }

                // Rule: GeoIP Mismatch
                if (countryParam && countryParam !== geoCountry) {
                    console.log(`Geo Mismatch: Param=${countryParam}, Geo=${geoCountry}`);
                    await auditService.log({
                        event_type: 'entry_denied',
                        payload: { reason: 'geo_mismatch', project_code: code, uid: validatedUid, country_param: countryParam, geo_country: geoCountry },
                        ip,
                        user_agent: userAgent
                    });
                    const mismatchUrl = new URL('/paused', request.url);
                    mismatchUrl.searchParams.set('pid', code);
                    mismatchUrl.searchParams.set('title', 'GEO MISMATCH');
                    mismatchUrl.searchParams.set('desc', `Your current location (${geoCountry}) does not match the target country (${countryParam}).`);
                    return NextResponse.redirect(mismatchUrl);
                }
            } catch (err) {
                console.error('Geo IP detection failed:', err)
            }
        }

        // --- IP Abuse Check (Throttle: > 3 per min per project) ---
        if (ip !== '127.0.0.1' && ip !== '::1') {
            const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
            const { count: ipCount } = await insforge.database
                .from('responses')
                .select('*', { count: 'exact', head: true })
                .eq('ip', ip)
                .eq('project_id', project.id)
                .gt('created_at', oneMinuteAgo);

            if (ipCount && ipCount >= 3) {
                return NextResponse.redirect(new URL('/security-terminate', request.url));
            }
        }

        // --- Duplicate Check (Same UID + Project) ---
        const { data: existingResponses, error: dupeError } = await insforge.database
            .from('responses')
            .select('id')
            .eq('uid', validatedUid)
            .eq('project_id', project.id)
            .limit(1);

        if (dupeError) {
            console.error('Duplicate check error:', dupeError);
        }

        if (existingResponses && existingResponses.length > 0) {
            return NextResponse.redirect(new URL('/duplicate-string', request.url));
        }

        // Check for country-specific active toggle
        if (project.is_multi_country && countryParam) {
            const countryConfig = (project.country_urls as any[] || []).find(c => c.country_code === countryParam)
            if (countryConfig && countryConfig.active === false) {
                const pauseUrl = new URL('/paused', request.url)
                pauseUrl.searchParams.set('pid', code)
                pauseUrl.searchParams.set('country', countryParam)
                pauseUrl.searchParams.set('ip', ip)
                pauseUrl.searchParams.set('title', 'COUNTRY UNAVAILABLE')
                pauseUrl.searchParams.set('desc', `Target country ${countryParam} is currently not active.`)
                return NextResponse.redirect(pauseUrl)
            }
        }

        // 4. Supplier token & Name resolution
        const supplierToken = searchParams.get('supplier') || searchParams.get('oi_supplier') || null
        let supplierNameRecord: string | null = null

        if (supplierToken) {
            const { data: sData } = await insforge.database
                .from('suppliers')
                .select('name')
                .eq('supplier_token', supplierToken)
                .eq('status', 'active')
                .maybeSingle()
            if (sData) supplierNameRecord = sData.name
        }

        // 5. Generate Client PID if tool is configured
        let clientPid: string | null = null
        if (project.pid_prefix) {
            const { data: updatedProject, error: pidError } = await insforge.database
                .from('projects')
                .update({ pid_counter: (project.pid_counter || 0) + 1 })
                .eq('id', project.id)
                .select('pid_counter')
                .single()

            if (!pidError && updatedProject) {
                const prefix = project.pid_prefix || ''
                const padding = project.pid_padding || 2
                const counter = updatedProject.pid_counter
                const countryPart = countryParam ? countryParam.toUpperCase() : ''
                clientPid = `${prefix}${countryPart}${String(counter).padStart(padding, '0')}`
            } else {
                console.error('PID Generation failed:', pidError)
            }
        }

        // 4. Generate Hash Identifier (8 chars)
        const hashBase = `${validatedUid}-${Date.now()}`
        const hashIdentifier = crypto.randomUUID().substring(0, 8)

        // 6. Initial Response Entry (status: in_progress)
        const { error: insertError } = await insforge.database
            .from('responses')
            .insert([{
                project_id: project.id,
                project_code: project.project_code,
                project_name: project.project_name || project.project_code,
                supplier_uid: validatedUid,
                client_uid_sent: project.target_uid || (project.force_pid_as_uid ? clientPid : validatedUid),
                uid: validatedUid,
                client_pid: clientPid,          // NEW: Store the generated PID
                hash_identifier: hashIdentifier,
                supplier_token: supplierToken,   // which supplier sent this respondent
                supplier_name: supplierNameRecord, // denormalized name for quick display
                supplier: supplierToken,         // legacy compat
                session_token: sessionToken,
                oi_session: sessionToken,       // Primary match key for callbacks
                status: 'in_progress',
                start_time: new Date().toISOString(),
                ip: ip,
                user_agent: userAgent,
                device_type: deviceType,
                country_code: countryParam || geoCountry,
                clickid: validatedUid,
                hash: validatedUid,
                last_landing_page: 'track_entry'
            }])

        if (insertError) {
            console.error('CRITICAL: Tracking session initialization failed:', insertError)
            const fatalUrl = new URL('/paused', request.url)
            fatalUrl.searchParams.set('title', 'TRACKING ERROR')
            fatalUrl.searchParams.set('desc', 'Failed to initialize tracking session. Please try again or contact support.')
            return NextResponse.redirect(fatalUrl)
        }

        // 7. Pre-Screener Redirection
        if (project.has_prescreener) {
            return NextResponse.redirect(new URL(`/prescreener?oi_session=${sessionToken}`, request.url))
        }

        // 7. Determine destination URL
        // 7. Determine destination URL
        let finalUrl = project.base_url
        const countryParamFinal = searchParams.get('country') || searchParams.get('c')

        if (project.is_multi_country) {
            const countryConfig = (project.country_urls as any[] || []).find(c => c.country_code === countryParamFinal && c.active !== false)
            if (countryConfig) {
                finalUrl = countryConfig.target_url
            }
        }

        // Force Generated PID as Client UID if enabled
        let tokenToUse = project.target_uid || supplierToken || validatedUid
        if (project.force_pid_as_uid && clientPid) {
            tokenToUse = clientPid
        }

        // Apply high-priority target_uid override if configured
        if (project.target_uid) {
            tokenToUse = project.target_uid
        }

        // --- HMAC SIGNATURE GENERATION (per-project secret from s2s_config) ---
        let signature = '';
        let s2sConfigForSig = null;

        try {
            const { data: s2sConfig } = await insforge.database
                .from('s2s_config')
                .select('secret_key')
                .eq('project_id', project.id)
                .maybeSingle();

            s2sConfigForSig = s2sConfig;

            if (s2sConfigForSig && s2sConfigForSig.secret_key) {
                // Build canonical string: sorted keys alphabetically
                // The callback will verify with (pid, cid, type)
                const paramsForSig: Record<string, string> = {
                    pid: project.project_code,
                    cid: sessionToken,
                    type: 'complete' // Default type - can be parameterized if needed
                };
                const canonical = Object.keys(paramsForSig)
                    .sort()
                    .map(k => `${k}=${paramsForSig[k]}`)
                    .join('&');

                signature = crypto
                    .createHmac('sha256', s2sConfigForSig.secret_key)
                    .update(canonical)
                    .digest('hex');
            }
        } catch (err) {
            console.warn('[Track] S2S config fetch failed, signature not generated:', err);
        }

        // 8. Replace PID & UID placeholders if client URL uses them
        const clientPidParam = (project as any).client_pid_param || null
        const clientUidParam = (project as any).client_uid_param || null

        // Handle PID injection
        // Use generated PID if available, else fallback to the incoming UID (Custom String), else Project Code
        const pidToUse = (clientPid && clientPid.trim() !== '')
            ? clientPid
            : (validatedUid && validatedUid !== 'N/A' ? validatedUid : (project.project_code || 'N/A'))
        console.log(`[Redirect Debug] clientPid='${clientPid}', project_code='${project.project_code}', pidToUse='${pidToUse}', tokenToUse='${tokenToUse}'`)

        if (pidToUse) {
            const pidPlaceholders = ['[PID]', '{pid}', '{PID}', '[pid]', '{PID_CODE}'] // Expanded list
            pidPlaceholders.forEach(p => {
                if (finalUrl.includes(p)) {
                    finalUrl = finalUrl.replaceAll(p, encodeURIComponent(pidToUse))
                }
            })

            // Handle PID injection via parameter or placeholder
            const pidParamName = clientPidParam || 'pid'
            const tmpUrl = new URL(finalUrl)
            const existingPidVal = tmpUrl.searchParams.get(pidParamName)

            // If the param is missing OR it is empty/placeholder/generic, set it to our PID
            if (!existingPidVal ||
                existingPidVal.trim() === '' ||
                existingPidVal === 'xxx' ||
                existingPidVal === 'N/A' ||
                existingPidVal === '[PID]' ||
                existingPidVal === '{pid}') {
                tmpUrl.searchParams.set(pidParamName, pidToUse)
                finalUrl = tmpUrl.toString()
            }
        }
        if (tokenToUse) {
            const placeholders = ['[UID]', '[identifier]', '{uid}', '{UID}', '{ResID}', '{rid}', '{ID}', '[ID]', '{id}'] // Structured only
            placeholders.forEach(p => {
                if (finalUrl.includes(p)) {
                    finalUrl = finalUrl.replaceAll(p, encodeURIComponent(tokenToUse))
                }
            })

            // Only inject uid if the client URL doesn't already have it (or it's an empty param)
            if (finalUrl.includes('[UID]') || finalUrl.includes('{uid}')) {
                // Placeholders already replaced above
            } else {
                const tmpUrl = new URL(finalUrl)
                const uidParamName = clientUidParam || 'uid'
                const existingVal = tmpUrl.searchParams.get(uidParamName)

                // If the param is missing OR it is empty/placeholder, set the token
                if (!existingVal || existingVal.trim() === '' || existingVal === 'N/A' || existingVal === 'xxx' || existingVal === '[UID]') {
                    tmpUrl.searchParams.set(uidParamName, tokenToUse)
                    finalUrl = tmpUrl.toString()
                }
            }
        }

        // ============================================================
        // 9. SMART URL BUILDER — GOLDEN RULE: Never reuse vendor params
        //    Uses oi_ prefix — completely isolated namespace
        // ============================================================
        const oiPrefix: string = (project as any).oi_prefix || 'oi_'
        const builtUrl = buildSurveyUrl(finalUrl, sessionToken, tokenToUse, supplierName, oiPrefix)

        const finalUrlObj = new URL(builtUrl)

        // Append HMAC signature if generated
        if (signature) {
            finalUrlObj.searchParams.set(`${oiPrefix}sig`, signature)
        }

        console.log(`[Track] uid=${validatedUid} session=${sessionToken} → ${finalUrlObj.toString()}`)

        const response = NextResponse.redirect(new URL(finalUrlObj.toString()))

        // Set cookies for session recovery (expires in 24 hours)
        response.cookies.set('last_uid', validatedUid, { maxAge: 86400, path: '/' })
        response.cookies.set('last_sid', sessionToken, { maxAge: 86400, path: '/' })
        response.cookies.set('last_pid', project.project_code, { maxAge: 86400, path: '/' })

        return response

    } catch (error) {
        console.error('Track route exception:', error)
        const fatalUrl = new URL('/paused', request.url)
        fatalUrl.searchParams.set('title', 'SYSTEM ERROR')
        fatalUrl.searchParams.set('desc', 'An unexpected error occurred while starting your session.')
        return NextResponse.redirect(fatalUrl)
    }
}
