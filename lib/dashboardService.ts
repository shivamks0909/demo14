import { createAdminClient } from './insforge-server'

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL
const apiKey = process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_ANON_KEY

// Determine if we should use local fallback (no InsForge configured)
function getUseLocal() {
    const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || process.env.NEXT_PUBLIC_APP_URL
    const apiKey = process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_ANON_KEY 
    return !baseUrl || !apiKey
}

// Lazy-load local service to avoid loading SQLite in production/serverless unnecessarily
let localService: any = null

async function getLocalService() {
    if (!localService) {
        const module = await import('./local-dashboardService')
        localService = module.dashboardService
    }
    return localService
}

export const dashboardService = {
    async getProjectAnalytics(clientId?: string): Promise<any[]> {
        if (getUseLocal()) {
            const local = await getLocalService()
            return await local.getProjectAnalytics(clientId)
        }
        const insforge = await createAdminClient()
        if (!insforge) return []
        const { data, error } = await insforge.database.rpc('get_project_analytics')
        if (error) return []
        return data as any[]
    },

    async getClients() {
        if (getUseLocal()) {
            const local = await getLocalService()
            return await local.getClients()
        }
        const insforge = await createAdminClient()
        if (!insforge) return []
        const { data, error } = await insforge.database.from('clients').select('*').order('created_at', { ascending: false })
        if (error) return []
        return data as any[]
    },

    async createClient(name: string) {
        if (getUseLocal()) {
            const local = await getLocalService()
            return await local.createClient(name)
        }
        const insforge = await createAdminClient()
        if (!insforge) return { data: null, error: { message: 'InsForge not configured' } }
        const { data, error } = await insforge.database
            .from('clients')
            .insert([{ name }])
            .select()
            .single()
        return { data, error }
    },

    async deleteClient(id: string) {
        if (getUseLocal()) {
            const local = await getLocalService()
            return await local.deleteClient(id)
        }
        const insforge = await createAdminClient()
        if (!insforge) return { error: { message: 'InsForge not configured' } }
        const { error } = await insforge.database
            .from('clients')
            .delete()
            .eq('id', id)
        return { error }
    },

    async getProjects() {
        if (getUseLocal()) {
            const local = await getLocalService()
            return await local.getProjects()
        }
        const insforge = await createAdminClient()
        if (!insforge) return []
        const { data, error } = await insforge.database
            .from('projects')
            .select(`
                *,
                clients (
                    name
                )
            `)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching projects:', error)
            return []
        }

        return (data as any[]).map((p: any) => ({
            ...p,
            client_name: p.clients?.name || 'Unknown Client'
        }))
    },

    async createProject(project: any) {
        if (getUseLocal()) {
            const local = await getLocalService()
            return await local.createProject(project)
        }
        const insforge = await createAdminClient()
        if (!insforge) return { data: null, error: { message: 'InsForge not configured' } }
        const { data, error } = await insforge.database
            .from('projects')
            .insert([{ ...project, status: 'active' }])
            .select()
            .single()
        return { data, error }
    },

    async updateProjectStatus(id: string, status: 'active' | 'paused') {
        if (getUseLocal()) {
            const local = await getLocalService()
            return await local.updateProjectStatus(id, status)
        }
        const insforge = await createAdminClient()
        if (!insforge) return { error: { message: 'InsForge not configured' } }
        const { error } = await insforge.database
            .from('projects')
            .update({ status })
            .eq('id', id)
        return { error }
    },

    async deleteProject(id: string) {
        if (getUseLocal()) {
            const local = await getLocalService()
            return await local.deleteProject(id)
        }
        const insforge = await createAdminClient()
        if (!insforge) return { error: { message: 'InsForge not configured' } }
        const { error } = await insforge.database
            .from('projects')
            .update({
                deleted_at: new Date().toISOString(),
                status: 'deleted'
            })
            .eq('id', id)
        return { error }
    },

    async getKPIs() {
        if (getUseLocal()) {
            const local = await getLocalService()
            return await local.getKPIs()
        }
        const insforge = await createAdminClient()
        if (!insforge) {
            return {
                total_projects: 0, active_projects: 0, total_clicks_today: 0, clicks_today: 0,
                total_responses: 0, total_completes_today: 0, completes_today: 0, terminates_today: 0,
                quotafull_today: 0, in_progress_today: 0, duplicates_today: 0, security_terminates_today: 0
            }
        }
        const { data, error } = await insforge.database.rpc('get_kpis')
        if (error) return {
            total_projects: 0, active_projects: 0, total_clicks_today: 0, clicks_today: 0,
            total_responses: 0, total_completes_today: 0, completes_today: 0, terminates_today: 0,
            quotafull_today: 0, in_progress_today: 0, duplicates_today: 0, security_terminates_today: 0
        }
        return data as any
    },

    async getProjectHealthMetrics() {
        if (getUseLocal()) {
            const local = await getLocalService()
            return await local.getProjectHealthMetrics()
        }
        const insforge = await createAdminClient()
        if (!insforge) return []
        const { data, error } = await insforge.database.rpc('get_project_health_metrics')
        if (error) return []
        return (data as any[]).map((m: any) => ({
            ...m,
            project_code: m.project_code || 'Unknown',
            project_name: m.project_name || 'Unknown',
            clicks_today: m.clicks_today || 0,
            in_progress_today: m.in_progress_today || 0,
            completes_today: m.completes_today || 0,
            terminates_today: m.terminates_today || 0,
            quotafull_today: m.quotafull_today || 0,
            duplicates_today: m.duplicates_today || 0,
            security_terminates_today: m.security_terminates_today || 0,
        }))
    },

    async getProjectById(id: string) {
        if (getUseLocal()) {
            const local = await getLocalService()
            return await local.getProjectById(id)
        }
        const insforge = await createAdminClient()
        if (!insforge) return null
        const { data, error } = await insforge.database.from('projects').select('*').eq('id', id).maybeSingle()
        if (error) return null
        return data as any || null
    },

    async updateProject(id: string, project: any) {
        if (getUseLocal()) {
            const local = await getLocalService()
            return await local.updateProject(id, project)
        }
        const insforge = await createAdminClient()
        if (!insforge) return { error: { message: 'InsForge not configured' } }
        const { error } = await insforge.database.from('projects').update(project).eq('id', id)
        return { error }
    },

    async getResponses(filters?: { ip?: string; status?: string; device_type?: string }) {
        if (getUseLocal()) {
            const local = await getLocalService()
            return await local.getResponses(filters)
        }
        const insforge = await createAdminClient()
        if (!insforge) return []
        let query = insforge.database.from('responses').select('*, projects(project_code, project_name)')
        
        if (filters?.ip) query = query.ilike('ip', `%${filters.ip}%`)
        if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status)
        if (filters?.device_type && filters.device_type !== 'all') query = query.eq('device_type', filters.device_type)
        
        const { data, error } = await query.order('created_at', { ascending: false }).limit(200)
        if (error) {
            console.error('[getResponses] Error:', error)
            return []
        }
        return (data as any[]).map(r => ({
            ...r,
            project_code: r.projects?.project_code || 'Unknown',
            project_name: r.projects?.project_name || 'Unknown'
        }))
    },

    async createResponse(response: any) {
        if (getUseLocal()) {
            // Local fallback doesn't have createResponse, but we don't usually create manually there
            return { data: null, error: { message: 'Not implemented locally' } }
        }
        const insforge = await createAdminClient()
        if (!insforge) return { data: null, error: { message: 'InsForge not configured' } }
        const { data, error } = await insforge.database
            .from('responses')
            .insert([response])
            .select()
            .single()
        return { data, error }
    },

    async updateResponse(id: string, updates: any) {
        if (getUseLocal()) {
            return { error: { message: 'Not implemented locally' } }
        }
        const insforge = await createAdminClient()
        if (!insforge) return { error: { message: 'InsForge not configured' } }
        const { error } = await insforge.database
            .from('responses')
            .update(updates)
            .eq('id', id)
        return { error }
    },

    async deleteResponse(id: string) {
        if (getUseLocal()) {
            return { error: { message: 'Not implemented locally' } }
        }
        const insforge = await createAdminClient()
        if (!insforge) return { error: { message: 'InsForge not configured' } }
        const { error } = await insforge.database
            .from('responses')
            .delete()
            .eq('id', id)
        return { error }
    },

    async flushResponses() {
        if (getUseLocal()) {
            const local = await getLocalService()
            return await local.flushResponses()
        }
        const insforge = await createAdminClient()
        if (!insforge) return { error: { message: 'InsForge not configured' } }
        const { error } = await insforge.database
            .from('responses')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000')
        return { error }
    },

    async getSuppliers() {
        if (getUseLocal()) {
            const local = await getLocalService()
            return await local.getSuppliers()
        }
        const insforge = await createAdminClient()
        if (!insforge) return []
        const { data, error } = await insforge.database.from('suppliers').select('*').order('created_at', { ascending: false })
        if (error) return []
        return data as any[]
    },

    async getSupplierByToken(token: string) {
        if (getUseLocal()) {
            const local = await getLocalService()
            return await local.getSupplierByToken(token)
        }
        const insforge = await createAdminClient()
        if (!insforge) return null
        const { data } = await insforge.database.from('suppliers').select('*').eq('supplier_token', token).eq('status', 'active').maybeSingle()
        return data as any || null
    },

    async createSupplier(supplier: any) {
        if (getUseLocal()) {
            const local = await getLocalService()
            return await local.createSupplier(supplier)
        }
        const insforge = await createAdminClient()
        if (!insforge) return { data: null, error: { message: 'InsForge not configured' } }
        const { data, error } = await insforge.database.from('suppliers').insert([supplier]).select().single()
        return { data, error }
    },

    async updateSupplier(id: string, supplier: any) {
        if (getUseLocal()) {
            const local = await getLocalService()
            return await local.updateSupplier(id, supplier)
        }
        const insforge = await createAdminClient()
        if (!insforge) return { error: { message: 'InsForge not configured' } }
        const { error } = await insforge.database.from('suppliers').update(supplier).eq('id', id)
        return { error }
    },

    async deleteSupplier(id: string) {
        if (getUseLocal()) {
            const local = await getLocalService()
            return await local.deleteSupplier(id)
        }
        const insforge = await createAdminClient()
        if (!insforge) return { error: { message: 'InsForge not configured' } }

        // 1. Remove project links first to avoid FK constraint errors
        const { error: unlinkError } = await insforge.database.from('supplier_project_links').delete().eq('supplier_id', id)
        if (unlinkError) {
            console.error('[deleteSupplier] Unlink Error:', unlinkError)
        }

        // 2. Perform deletion of the supplier
        const { error } = await insforge.database.from('suppliers').delete().eq('id', id)

        if (error) {
            console.error('[deleteSupplier] Error:', error)
            // If it's a constraint violation, fallback to pausing the supplier
            if (error.code === '23503') {
                const { error: fallbackError } = await insforge.database
                    .from('suppliers')
                    .update({ status: 'paused' })
                    .eq('id', id)
                if (fallbackError) return { error: fallbackError }
                return { error: null }
            }
            return { error }
        }

        return { error: null }
    },

    async getSupplierProjectLinks(projectId: string) {
        if (getUseLocal()) {
            const local = await getLocalService()
            return await local.getSupplierProjectLinks(projectId)
        }
        const insforge = await createAdminClient()
        if (!insforge) return []
        const { data, error } = await insforge.database
            .from('supplier_project_links')
            .select('*, supplier:suppliers(*)')
            .eq('project_id', projectId)
        if (error || !data) return []
        return data as any[]
    },

    async linkSupplierToProject(supplierId: string, projectId: string, quotaAllocated = 0) {
        if (getUseLocal()) {
            const local = await getLocalService()
            return await local.linkSupplierToProject(supplierId, projectId, quotaAllocated)
        }
        const insforge = await createAdminClient()
        if (!insforge) return { error: { message: 'InsForge not configured' } }
        const { error } = await insforge.database.from('supplier_project_links')
            .upsert([{ supplier_id: supplierId, project_id: projectId, quota_allocated: quotaAllocated, status: 'active' }],
                { onConflict: 'supplier_id,project_id' })
        return { error }
    },

    async unlinkSupplierFromProject(supplierId: string, projectId: string) {
        if (getUseLocal()) {
            const local = await getLocalService()
            return await local.unlinkSupplierFromProject(supplierId, projectId)
        }
        const insforge = await createAdminClient()
        if (!insforge) return { error: { message: 'InsForge not configured' } }
        const { error } = await insforge.database.from('supplier_project_links')
            .delete().eq('supplier_id', supplierId).eq('project_id', projectId)
        return { error }
    }
}
