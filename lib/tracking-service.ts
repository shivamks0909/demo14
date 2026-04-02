import { getUnifiedDb } from './unified-db'
import { auditService } from './audit-service'
import crypto from 'crypto'

export type TrackingResult = {
  success: boolean
  errorType?: 'PROJECT_NOT_FOUND' | 'PROJECT_PAUSED' | 'THROTTLED' | 'DUPLICATE' | 'GEO_MISMATCH' | 'QUOTA_FULL' | 'UNAUTHORIZED' | 'SERVER_ERROR' | 'COUNTRY_UNAVAILABLE'
  errorMessage?: string
  error?: string // Legacy alias
  redirectUrl?: string
  responseData?: any
}

export type EntryContext = {
  projectId: string
  transactionId?: string
  rid?: string
  supplierToken?: string
  userAgent: string
  ip: string
  geoData?: any
  queryParams: Record<string, string>
}

export class TrackingService {
  /**
   * Universal entry point for all survey entries (Standard & Custom Init)
   */
  static async processEntry(ctx: EntryContext): Promise<TrackingResult> {
    const { database: db } = await getUnifiedDb()
    const start = Date.now()

    try {
      // 1. Fetch Project & Unified Settings
      const { data: project, error: pError } = await db
        .from('projects')
        .select('*')
        .eq('id', ctx.projectId)
        .is('deleted_at', null)
        .maybeSingle()

      if (pError || !project) return { success: false, errorType: 'PROJECT_NOT_FOUND' }
      if (project.status !== 'active') return { success: false, errorType: 'PROJECT_PAUSED' }

      // 2. IP Throttling (3 requests per minute per project)
      if (ctx.ip !== '127.0.0.1' && ctx.ip !== '::1') {
        const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString()
        const { count: throttleCount } = await db
          .from('responses')
          .select('*', { count: 'exact', head: true })
          .eq('ip', ctx.ip)
          .eq('project_id', project.id)
          .gt('created_at', oneMinAgo)

        if ((throttleCount || 0) >= 3) {
          await auditService.log({
            event_type: 'SECURITY_THROTTLE',
            payload: { project_id: project.id, ip: ctx.ip, message: 'Rate limit exceeded' },
            ip: ctx.ip,
            user_agent: ctx.userAgent
          })
          return { success: false, errorType: 'THROTTLED', errorMessage: 'Too many requests. Please wait a minute.', error: 'Too many requests' }
        }
      }

      // 3. Duplicate UID Check
      if (ctx.rid) {
        const { data: existing } = await db
            .from('responses')
            .select('id')
            .eq('project_id', project.id)
            .eq('uid', ctx.rid)
            .maybeSingle()

        if (existing) {
          await auditService.log({
            event_type: 'SECURITY_DUPLICATE',
            payload: { project_id: project.id, rid: ctx.rid, ip: ctx.ip },
            ip: ctx.ip,
            user_agent: ctx.userAgent
          })
          return { success: false, errorType: 'DUPLICATE', errorMessage: 'Duplicate entry detected.', error: 'Duplicate entry' }
        }
      }

      // 4. GeoIP Validation (Strict Mode if requested)
      if (ctx.geoData && ctx.queryParams.country) {
        if (ctx.geoData.country !== ctx.queryParams.country) {
          await auditService.log({
            event_type: 'SECURITY_GEO_MISMATCH',
            payload: { 
              project_id: project.id,
              ip: ctx.ip, 
              expected: ctx.queryParams.country, 
              actual: ctx.geoData.country 
            },
            ip: ctx.ip,
            user_agent: ctx.userAgent
          })
          return { success: false, errorType: 'GEO_MISMATCH', errorMessage: `Location mismatch: ${ctx.geoData.country}`, error: 'Geo mismatch' }
        }
      }

      // 5. Multi-Country Country Validation
      let allowedCountries: string[] = []
      let countryTargetUrl: string | null = null
      if (project.is_multi_country && ctx.queryParams.country) {
        let countryUrlsArray: Array<{country_code: string; target_url: string; active?: boolean}> = []
        try {
          if (typeof project.country_urls === 'string') {
            countryUrlsArray = JSON.parse(project.country_urls)
          } else if (Array.isArray(project.country_urls)) {
            countryUrlsArray = project.country_urls
          } else if (project.country_urls !== null && project.country_urls !== undefined) {
            try {
              const normalized = String(project.country_urls)
              if (normalized.trim().startsWith('[') || normalized.trim().startsWith('{')) {
                countryUrlsArray = JSON.parse(normalized)
              } else {
                console.warn('[TrackingService] Unrecognized country_urls format:', typeof project.country_urls)
                countryUrlsArray = []
              }
            } catch (e2) {
              console.warn('[TrackingService] Failed to parse country_urls after string conversion:', e2)
              countryUrlsArray = []
            }
          } else {
            countryUrlsArray = []
          }
        } catch (e) {
          console.warn('[TrackingService] Failed to parse country_urls:', e)
          countryUrlsArray = []
        }

        // Validate and sanitize each entry
        const validatedCountries: Array<{country_code: string; target_url: string; active?: boolean}> = []
        for (const entry of countryUrlsArray) {
          try {
            if (!entry) continue
            if (typeof entry !== 'object' || Array.isArray(entry)) continue
            const rawCountry = entry.country_code
            const countryCode = typeof rawCountry === 'string' ? rawCountry.trim().toUpperCase() : null
            if (!countryCode || countryCode.length < 2 || countryCode.length > 3) continue
            const rawUrl = entry.target_url
            const targetUrl = typeof rawUrl === 'string' ? rawUrl.trim() : null
            if (!targetUrl || !targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) continue
            const active = entry.active !== false
            validatedCountries.push({ country_code: countryCode, target_url: targetUrl, active })
          } catch (err) {
            console.warn('[TrackingService] Error validating country_urls entry:', err, entry)
          }
        }

        // Get list of active allowed countries
        allowedCountries = validatedCountries
          .filter(c => c.active)
          .map(c => c.country_code)

        // Find target URL for the requested country
        const countryConfig = validatedCountries.find(c => c.country_code === ctx.queryParams.country && c.active)
        if (countryConfig) {
          countryTargetUrl = countryConfig.target_url || null
        }

        if (allowedCountries.length > 0 && !allowedCountries.includes(ctx.queryParams.country)) {
          await auditService.log({
            event_type: 'SECURITY_COUNTRY_UNAVAILABLE',
            payload: { 
              project_id: project.id,
              ip: ctx.ip, 
              requested_country: ctx.queryParams.country,
              available_countries: allowedCountries
            },
            ip: ctx.ip,
            user_agent: ctx.userAgent
          })
          return { success: false, errorType: 'COUNTRY_UNAVAILABLE', errorMessage: `Country ${ctx.queryParams.country} not available for this project.`, error: 'Country unavailable' }
        }
      }

      // 6. Supplier Project Link Validation (Quota Management)
      // Only fetch supplierId; atomic quota check happens in RPC call
      let supplierId: string | null = null
      if (ctx.supplierToken) {
        const { data: supplier } = await db
          .from('suppliers')
          .select('id, name')
          .eq('supplier_token', ctx.supplierToken)
          .eq('status', 'active')
          .maybeSingle()

        if (supplier) {
          supplierId = supplier.id
        }
      }

      // Determine final destination URL (country-specific if available)
      const finalBaseUrl = countryTargetUrl || project.base_url

      // 7. Device Detection
      const deviceType = this.detectDevice(ctx.userAgent)

      // 8. Build Redirect URL (Smart Injection)
      const sessionToken = crypto.randomUUID()
      const hashId = crypto.createHash('md5').update(`${ctx.rid || sessionToken}-${project.id}`).digest('hex').substring(0, 8)
      
      const redirectUrl = this.buildUrl(
        finalBaseUrl,
        sessionToken,
        ctx.rid || '',
        hashId,
        project.oi_prefix || 'oi_',
        project.client_pid_param,
        project.client_uid_param,
        project.uid_params
      )

      // 9. Atomic Quota Increment (if supplier) - MUST happen before response creation
      let quotaOk = true
      if (ctx.supplierToken && supplierId) {
        try {
          const { data: incrementSuccess, error: quotaError } = await db.rpc('increment_quota', {
            p_project_id: project.id,
            p_supplier_id: supplierId
          })

          if (quotaError) {
            console.error('[TrackingService] Quota increment RPC error:', quotaError)
            await auditService.log({
              event_type: 'QUOTA_INCREMENT_ERROR',
              payload: {
                supplier_id: supplierId,
                project_id: project.id,
                error: quotaError.message || 'RPC execution failed',
                level: 'error'
              },
              ip: ctx.ip,
              user_agent: ctx.userAgent
            })
            quotaOk = false
          } else if (incrementSuccess === false) {
            console.warn('[TrackingService] Quota exceeded for supplier')
            await auditService.log({
              event_type: 'QUOTA_EXCEEDED',
              payload: {
                supplier_id: supplierId,
                project_id: project.id
              },
              ip: ctx.ip,
              user_agent: ctx.userAgent
            })
            quotaOk = false
          }
        } catch (err: any) {
          console.error('[TrackingService] Critical Quota Error:', err)
          await auditService.log({
            event_type: 'QUOTA_INCREMENT_ERROR',
            payload: {
              supplier_id: supplierId,
              project_id: project.id,
              error: err?.message || 'Unknown exception',
              level: 'critical'
            },
            ip: ctx.ip,
            user_agent: ctx.userAgent
          })
          quotaOk = false
        }
      }

      // If quota check failed, return early without creating response
      if (!quotaOk) {
        return { success: false, errorType: 'QUOTA_FULL', errorMessage: 'Quota exceeded for this supplier.', error: 'Quota full' }
      }

      // 10. Create Response Record (only after quota is confirmed)
      const { data: response, error: rError } = await db
        .from('responses')
        .insert([{
          project_id: project.id,
          project_code: project.project_code,
          project_name: project.project_name,
          uid: ctx.rid || sessionToken,
          clickid: sessionToken,
          oi_session: sessionToken,
          session_token: sessionToken,
          status: 'in_progress',
          ip: ctx.ip,
          user_agent: ctx.userAgent,
          device_type: deviceType,
          supplier_token: ctx.supplierToken,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (rError) throw rError

      // 11. Audit Log for Success
      await auditService.log({
        event_type: 'ROUTING_ENTRY',
        payload: { 
            project_id: project.id,
            response_id: response.id, 
            device: deviceType, 
            ip: ctx.ip,
            latency: Date.now() - start
        },
        ip: ctx.ip,
        user_agent: ctx.userAgent
      })

      return { success: true, redirectUrl, responseData: response }

    } catch (error: any) {
      console.error('[TrackingService] Error:', error)
      return { success: false, errorType: 'SERVER_ERROR', errorMessage: error.message, error: error.message }
    }
  }

  /**
   * Compatibility method for status pages
   */
  async getResponseByClickId(clickid: string) {
    const { database: db } = await getUnifiedDb()
    const { data } = await db
      .from('responses')
      .select('*')
      .eq('clickid', clickid)
      .maybeSingle()
    return data
  }

  /**
   * Compatibility method for callbacks
   */
  async updateStatus({ clickid, status }: { clickid: string, status: string }) {
    const { database: db } = await getUnifiedDb()
    const { error } = await db
      .from('responses')
      .update({ 
        status, 
        completion_time: status === 'complete' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('clickid', clickid)

    return { success: !error, error }
  }

  /**
   * Compatibility method for tests
   */
  async ensureProject(projectCode: string, baseUrl: string) {
    const { database: db } = await getUnifiedDb()
    
    // Check existing
    const { data: existing } = await db
        .from('projects')
        .select('id, project_code')
        .eq('project_code', projectCode)
        .maybeSingle()

    if (existing) return { project_id: existing.id, project_code: existing.project_code }

    // Create new
    const id = `proj_auto_${Date.now()}`
    await db.from('projects').insert([{
        id,
        project_code: projectCode,
        project_name: `Auto: ${projectCode}`,
        base_url: baseUrl,
        source: 'auto',
        status: 'active'
    }])

    return { project_id: id, project_code: projectCode }
  }

  /**
   * Compatibility method for tests (delegates to processEntry)
   */
  async trackEntry(payload: any) {
    // Attempt to find project id from code
    const { database: db } = await getUnifiedDb()
    let projectId = payload.project_id

    if (!projectId && payload.project_code) {
        const { data: p } = await db.from('projects').select('id').eq('project_code', payload.project_code).maybeSingle()
        if (p) projectId = p.id
    }

    // Default to fallback if still missing
    if (!projectId) {
        const { data: fb } = await db.from('projects').select('id').eq('project_code', 'external_traffic').maybeSingle()
        projectId = fb?.id
    }

    return await TrackingService.processEntry({
      projectId: projectId || 'unknown',
      rid: payload.uid || payload.rid,
      ip: payload.ip || '0.0.0.0',
      userAgent: payload.user_agent || 'unknown',
      supplierToken: payload.supplier_token,
      queryParams: {}, // Not used in this simplified trackEntry
    })
  }

  private static detectDevice(ua: string): string {
    const lowerUA = ua.toLowerCase()
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(lowerUA)) return 'Tablet'
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'Mobile'
    return 'Desktop'
  }

  private static buildUrl(
    baseUrl: string,
    session: string,
    rid: string,
    hash: string,
    prefix: string,
    pidParam?: string | null,
    uidParam?: string | null,
    uidParams?: any[] | null
  ): string {
    let finalUrlStr = baseUrl

    // 1. Placeholder expansion
    if (rid) {
      const placeholders = ['[UID]', '[identifier]', '{uid}', '{UID}', '{ResID}', '{rid}', '{ID}', '[ID]', '{id}']
      placeholders.forEach(p => {
        if (finalUrlStr.includes(p)) {
          finalUrlStr = finalUrlStr.replaceAll(p, encodeURIComponent(rid))
        }
      })
    }

    const url = new URL(finalUrlStr)
    
    // Core parameters (Standard prefixes)
    url.searchParams.set(`${prefix}session`, session)
    if (rid) url.searchParams.set(`${prefix}rid`, rid)
    url.searchParams.set(`${prefix}hash`, hash)

    // Vendor-specific parameter mapping
    if (pidParam && rid) url.searchParams.set(pidParam, rid)
    
    // BUG FIX: Add uid if neither configured param nor placeholder was used
    const actualUidParam = uidParam || 'uid'
    // check if it was replaced in URL or already in searchParams
    if (!url.searchParams.has(actualUidParam) && !baseUrl.includes('[UID]') && !baseUrl.includes('{uid}')) {
        url.searchParams.set(actualUidParam, rid)
    } else if (uidParam && rid) {
        url.searchParams.set(uidParam, rid)
    }

    // Complex multi-parameter mapping
    if (uidParams && Array.isArray(uidParams)) {
      uidParams.forEach(p => {
        if (p.param && p.value) {
            let finalVal = p.value
            if (p.value === 'client_rid') finalVal = rid
            if (p.value === 'session' || p.value === 'uid') finalVal = session
            if (p.value === 'hash') finalVal = hash
            url.searchParams.set(p.param, finalVal)
        }
      })
    }

    return url.toString()
  }
}

export const trackingService = new TrackingService();
