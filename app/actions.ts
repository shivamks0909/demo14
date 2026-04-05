'use server'

import { dashboardService } from '@/lib/dashboardService'
import { revalidatePath } from 'next/cache'

// Supplier Actions
export async function createSupplierAction(data: any): Promise<{ data: any | null; error: any }> {
    try {
        const result = await dashboardService.createSupplier(data)
        revalidatePath('/admin/suppliers')
        return result
    } catch (error) {
        return { data: null, error }
    }
}

export async function updateSupplierAction(id: string, data: any): Promise<{ error: any }> {
    try {
        const result = await dashboardService.updateSupplier(id, data)
        revalidatePath('/admin/suppliers')
        return result
    } catch (error) {
        return { error }
    }
}

export async function deleteSupplierAction(id: string): Promise<{ error: any }> {
    try {
        const result = await dashboardService.deleteSupplier(id)
        revalidatePath('/admin/suppliers')
        return result
    } catch (error) {
        return { error }
    }
}

export async function linkSupplierToProjectAction(supplierId: string, projectId: string, quota = 0): Promise<{ error: any }> {
    try {
        const result = await dashboardService.linkSupplierToProject(supplierId, projectId, quota)
        revalidatePath(`/admin/projects/${projectId}`)
        return result
    } catch (error) {
        return { error }
    }
}

export async function unlinkSupplierFromProjectAction(supplierId: string, projectId: string): Promise<{ error: any }> {
    try {
        const result = await dashboardService.unlinkSupplierFromProject(supplierId, projectId)
        revalidatePath(`/admin/projects/${projectId}`)
        return result
    } catch (error) {
        return { error }
    }
}

// Client Actions
export async function createClientAction(name: string): Promise<{ data: any | null; error: any }> {
    try {
        const result = await dashboardService.createClient(name)
        revalidatePath('/admin/clients')
        revalidatePath('/admin/projects')
        return result
    } catch (error) {
        return { data: null, error }
    }
}

export async function deleteClientAction(id: string): Promise<{ error: any }> {
    try {
        const result = await dashboardService.deleteClient(id)
        revalidatePath('/admin/clients')
        revalidatePath('/admin/projects')
        return result
    } catch (error) {
        return { error }
    }
}

export async function updateClientAction(id: string, name: string): Promise<{ error: any }> {
    try {
        const local = await import('@/lib/local-dashboardService')
        const result = await local.dashboardService.updateClient(id, name)
        revalidatePath('/admin/clients')
        revalidatePath('/admin/projects')
        return result
    } catch (error) {
        return { error }
    }
}

// Response Actions
export async function flushResponsesAction(): Promise<{ success: boolean; error: any }> {
    try {
        const result = await dashboardService.flushResponses()
        if (result.error) return { success: false, error: result.error }
        revalidatePath('/admin/responses')
        return { success: true, error: null }
    } catch (error) {
        return { success: false, error }
    }
}

// Project Actions
export async function createProjectAction(formData: any, countryUrls: any[] = []): Promise<{ data: any | null; error: any }> {
    try {
        const result = await dashboardService.createProject(formData)
        if (result.error) return { data: null, error: result.error }
        revalidatePath('/admin/projects')
        return { data: result.data, error: null }
    } catch (error) {
        return { data: null, error }
    }
}

export async function updateProjectStatusAction(id: string, status: 'active' | 'paused'): Promise<{ error: any }> {
    try {
        const result = await dashboardService.updateProjectStatus(id, status)
        revalidatePath('/admin/projects')
        revalidatePath('/admin/dashboard')
        return { error: result.error }
    } catch (error) {
        return { error }
    }
}

export async function updateProjectAction(id: string, data: any): Promise<{ error: any }> {
    try {
        const result = await dashboardService.updateProject(id, data)
        revalidatePath('/admin/projects')
        return { error: result.error }
    } catch (error) {
        return { error }
    }
}

export async function updateCountryActiveAction(
    projectId: string,
    countryCode: string,
    active: boolean
): Promise<{ error: any }> {
    return { error: { message: 'Multi-country not available in local mode' } }
}

export async function deleteProjectAction(id: string): Promise<{ error: any }> {
    try {
        const result = await dashboardService.deleteProject(id)
        revalidatePath('/admin/projects')
        revalidatePath('/admin/dashboard')
        return { error: result.error }
    } catch (error) {
        return { error }
    }
}
