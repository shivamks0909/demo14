// SQLite-only dashboard service
// All cloud database connections (InsForge, Supabase) have been removed

// Lazy-load local service
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
        const local = await getLocalService()
        return await local.getProjectAnalytics(clientId)
    },

    async getClients() {
        const local = await getLocalService()
        return await local.getClients()
    },

    async createClient(name: string) {
        const local = await getLocalService()
        return await local.createClient(name)
    },

    async deleteClient(id: string) {
        const local = await getLocalService()
        return await local.deleteClient(id)
    },

    async getProjects() {
        const local = await getLocalService()
        return await local.getProjects()
    },

    async createProject(project: any) {
        const local = await getLocalService()
        return await local.createProject(project)
    },

    async updateProjectStatus(id: string, status: 'active' | 'paused') {
        const local = await getLocalService()
        return await local.updateProjectStatus(id, status)
    },

    async deleteProject(id: string) {
        const local = await getLocalService()
        return await local.deleteProject(id)
    },

    async getKPIs() {
        const local = await getLocalService()
        return await local.getKPIs()
    },

    async getProjectHealthMetrics() {
        const local = await getLocalService()
        return await local.getProjectHealthMetrics()
    },

    async getProjectById(id: string) {
        const local = await getLocalService()
        return await local.getProjectById(id)
    },

    async updateProject(id: string, project: any) {
        const local = await getLocalService()
        return await local.updateProject(id, project)
    },

    async getResponses(filters?: { ip?: string; status?: string; device_type?: string }) {
        const local = await getLocalService()
        return await local.getResponses(filters)
    },

    async createResponse(response: any) {
        return { data: null, error: { message: 'Not implemented locally' } }
    },

    async updateResponse(id: string, updates: any) {
        return { error: { message: 'Not implemented locally' } }
    },

    async deleteResponse(id: string) {
        return { error: { message: 'Not implemented locally' } }
    },

    async flushResponses() {
        const local = await getLocalService()
        return await local.flushResponses()
    },

    async getSuppliers() {
        const local = await getLocalService()
        return await local.getSuppliers()
    },

    async getSupplierByToken(token: string) {
        const local = await getLocalService()
        return await local.getSupplierByToken(token)
    },

    async createSupplier(supplier: any) {
        const local = await getLocalService()
        return await local.createSupplier(supplier)
    },

    async updateSupplier(id: string, supplier: any) {
        const local = await getLocalService()
        return await local.updateSupplier(id, supplier)
    },

    async deleteSupplier(id: string) {
        const local = await getLocalService()
        return await local.deleteSupplier(id)
    },

    async getSupplierProjectLinks(projectId: string) {
        const local = await getLocalService()
        return await local.getSupplierProjectLinks(projectId)
    },

    async linkSupplierToProject(supplierId: string, projectId: string, quotaAllocated = 0) {
        const local = await getLocalService()
        return await local.linkSupplierToProject(supplierId, projectId, quotaAllocated)
    },

    async unlinkSupplierFromProject(supplierId: string, projectId: string) {
        const local = await getLocalService()
        return await local.unlinkSupplierFromProject(supplierId, projectId)
    }
}
