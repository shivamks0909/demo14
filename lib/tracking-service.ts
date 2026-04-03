import { getUnifiedDb } from './unified-db'
import { auditService } from './audit-service'
import * as crypto from 'crypto'

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

      // 1.1 Normalized UID (Handle placeholder string from user)
      let validatedUid = (ctx.rid && ctx.rid.trim() !== '' && !ctx.rid.includes('[UID]') && !ctx.rid.includes('{uid}') && ctx.rid !== 'N/A')
        ? ctx.rid
        : crypto.randomUUID()

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
      if (validatedUid) {
        const { data: existing } = await db
            .from('responses')
            .select('id')
            .eq('project_id', project.id)
            .eq('uid', validatedUid)
            .maybeSingle()

        if (existing) {
          await auditService.log({
            event_type: 'SECURITY_DUPLICATE',
            payload: { project_id: project.id, rid: validatedUid, ip: ctx.ip },
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
        let countryUrlsArray: any[] = []
        try {
          if (typeof project.country_urls === 'string') {
            countryUrlsArray = JSON.parse(project.country_urls)
          } else if (Array.isArray(project.country_urls)) {
            countryUrlsArray = project.country_urls
          }
        } catch (e) {
          console.warn('[TrackingService] Failed to parse country_urls:', e)
        }

        const countryConfig = countryUrlsArray.find((c: any) => c.country_code === ctx.queryParams.country && c.active !== false)
        if (countryConfig) {
          countryTargetUrl = countryConfig.target_url || null
        }

        allowedCountries = countryUrlsArray.filter((c: any) => c.active !== false).map((c: any) => c.country_code)

        if (allowedCountries.length > 0 && !allowedCountries.includes(ctx.queryParams.country)) {
          return { success: false, errorType: 'COUNTRY_UNAVAILABLE', errorMessage: `Country ${ctx.queryParams.country} not available for this project.`, error: 'Country unavailable' }
        }
      }

      // 6. Supplier Identification
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

      // Determine final destination URL
      const finalBaseUrl = countryTargetUrl || project.base_url

      // 7. Device Detection
      const deviceType = this.detectDevice(ctx.userAgent)

      // 7.1 PID Generation
      let clientPid: string | null = null
      if (project.pid_prefix) {
        const { data: updatedProject, error: pidError } = await db
          .from('projects')
          .update({ pid_counter: (project.pid_counter || 0) + 1 })
          .eq('id', project.id)
          .select('pid_counter')
          .single()

        if (!pidError && updatedProject) {
          const prefix = project.pid_prefix || ''
          const padding = project.pid_padding || 2
          const counter = updatedProject.pid_counter
          const countryPart = (ctx.queryParams.country || '').toUpperCase()
          clientPid = `${prefix}${countryPart}${String(counter).padStart(padding, '0')}`
        }
      }

      // 8. Build Redirect URL (Smart Injection)
      const sessionToken = crypto.randomUUID()
      const hashId = crypto.randomUUID().substring(0, 8)
      
      const redirectUrl = this.buildUrl(
        finalBaseUrl,
        sessionToken,
        validatedUid,
        hashId,
        project.oi_prefix || 'oi_',
        project.client_pid_param,
        project.client_uid_param,
        project.uid_params,
        clientPid
      )

      // 9. Atomic Quota Increment
      let quotaOk = true
      if (ctx.supplierToken && supplierId) {
        try {
          const { data: incrementSuccess, error: quotaError } = await db.rpc('increment_quota', {
            p_project_id: project.id,
            p_supplier_id: supplierId
          })

          if (quotaError || incrementSuccess === false) {
            quotaOk = false
          }
        } catch (err) {
          console.error('[TrackingService] Quota check failed:', err)
          quotaOk = false
        }
      }

      if (!quotaOk) {
        return { success: false, errorType: 'QUOTA_FULL', errorMessage: 'Quota exceeded for this supplier.', error: 'Quota full' }
      }

      // 10. Create Response Record
       const { data: response, error: rError } = await db
         .from('responses')
         .insert([{
           project_id: project.id,
           project_code: project.project_code,
           project_name: project.project_name,
           uid: validatedUid,
           clickid: sessionToken,
           oi_session: sessionToken,
           session_token: sessionToken,
           status: 'in_progress',
           ip: ctx.ip,
           user_agent: ctx.userAgent,
           device_type: deviceType,
           supplier_uid: ctx.supplierToken,
           created_at: new Date().toISOString()
         }])
         .select()
         .single()

      if (rError) throw rError

      // 11. Audit Log 
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
   * Update response status
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
   * Logic to ensure project exists for tests
   */
  async ensureProject(projectCode: string, baseUrl: string) {
    const { database: db } = await getUnifiedDb()
    const { data: existing } = await db.from('projects').select('id, project_code').eq('project_code', projectCode).maybeSingle()
    if (existing) return { project_id: existing.id, project_code: existing.project_code }

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
   * Legacy trackEntry method
   */
  async trackEntry(payload: any) {
    const { database: db } = await getUnifiedDb()
    let projectId = payload.project_id
    if (!projectId && payload.project_code) {
        const { data: p } = await db.from('projects').select('id').eq('project_code', payload.project_code).maybeSingle()
        if (p) projectId = p.id
    }
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
      queryParams: {},
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
    uidParams?: any[] | null,
    clientPid?: string | null
  ): string {
    let finalUrlStr = baseUrl

    // 1. Placeholder expansion (Universal IDs)
    const pidToUse = clientPid || rid || 'N/A'
    const uidToUse = rid || session || 'N/A'

    const placeholders = {
        uid: ['[UID]', '{uid}', '{UID}', '[uid]', '{ResID}', '{rid}', '{ID}', '[ID]', '{id}'],
        pid: ['[PID]', '{pid}', '{PID}', '[pid]', '{PID_CODE}'],
        sessionId: ['[SESSION_ID]', '{session_id}', '{oi_session}', '[TRANSACTION_ID]', '{transactionId}', '[TRANSACTIONID]']
    }

    placeholders.uid.forEach(p => {
        if (finalUrlStr.includes(p)) {
            finalUrlStr = finalUrlStr.replaceAll(p, encodeURIComponent(uidToUse))
        }
    })
    placeholders.pid.forEach(p => {
        if (finalUrlStr.includes(p)) {
            finalUrlStr = finalUrlStr.replaceAll(p, encodeURIComponent(pidToUse))
        }
    })

    const url = new URL(finalUrlStr)
    
    // FORCE OVERRIDE: Always set transactionId to the session token
    // This ensures callback clickid matches stored oi_session
    url.searchParams.set('transactionId', session)
    url.searchParams.set('transactionid', session)
    
    // Core parameters (Standard prefixes)
    url.searchParams.set(`${prefix}session`, session)
    if (rid) url.searchParams.set(`${prefix}uid`, rid)
    url.searchParams.set(`${prefix}hash`, hash)

    // Vendor-specific parameter mapping (PID)
    const actualPidParam = pidParam || 'pid'
    const existingPid = url.searchParams.get(actualPidParam)
    if (!existingPid || existingPid === '' || existingPid === '[PID]' || existingPid === '{pid}') {
        url.searchParams.set(actualPidParam, pidToUse)
    }

    // Vendor-specific parameter mapping (UID)
    const actualUidParam = uidParam || 'uid'
    const existingUid = url.searchParams.get(actualUidParam)
    if (!existingUid || existingUid === '' || existingUid === '[UID]' || existingUid === '{uid}') {
        url.searchParams.set(actualUidParam, uidToUse)
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
    // Always add standard 'uid' parameter for landing page compatibility
    url.searchParams.set('uid', uidToUse);
    
    return url.toString();
  }
}

export const trackingService = new TrackingService();
