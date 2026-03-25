/**
 * Security-enhanced wrapper for dashboard service
 * Provides additional security layers for all dashboard operations
 */
import { dashboardService } from '@/lib/dashboardService'
import { VALIDATION_RULES } from '@/lib/security-config'

// Enhanced version with additional security checks
export const secureDashboardService = {
    ...dashboardService,

    async createClient(name: string) {
        // Input validation
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw new Error('Invalid client name')
        }

        if (name.length > VALIDATION_RULES.CLIENT_NAME_MAX_LENGTH) {
            throw new Error('Client name too long')
        }

        return await dashboardService.createClient(name)
    },

    async createProject(project: any) {
        // Input validation
        if (!project || typeof project !== 'object') {
            throw new Error('Invalid project data')
        }

        if (!project.project_code || typeof project.project_code !== 'string') {
            throw new Error('Project code is required')
        }

        if (!project.client_id || typeof project.client_id !== 'string') {
            throw new Error('Client ID is required')
        }

        if (project.project_code.length > VALIDATION_RULES.PROJECT_CODE_MAX_LENGTH) {
            throw new Error('Project code too long')
        }

        return await dashboardService.createProject(project)
    },

    async updateProject(id: string, project: any) {
        // Input validation
        if (!id || typeof id !== 'string') {
            throw new Error('Invalid project ID')
        }

        if (!project || typeof project !== 'object') {
            throw new Error('Invalid project data')
        }

        return await dashboardService.updateProject(id, project)
    },

    async getProjectById(id: string) {
        // Input validation
        if (!id || typeof id !== 'string') {
            throw new Error('Invalid project ID')
        }

        return await dashboardService.getProjectById(id)
    },

    async getResponses(filters?: { ip?: string; status?: string; device_type?: string }) {
        // Input validation for filters
        if (filters) {
            if (filters.ip && typeof filters.ip !== 'string') {
                throw new Error('Invalid IP filter')
            }
            if (filters.status && typeof filters.status !== 'string') {
                throw new Error('Invalid status filter')
            }
            if (filters.device_type && typeof filters.device_type !== 'string') {
                throw new Error('Invalid device type filter')
            }
        }

        return await dashboardService.getResponses(filters)
    }
}