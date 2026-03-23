'use server'

import { createAdminClient } from '@/lib/insforge-server'
import { Project, Client } from '@/lib/types'
import { dashboardService } from '@/lib/dashboardService'
import { Supplier } from '@/lib/types'

export async function createSupplierAction(data: Omit<Supplier, 'id' | 'created_at'>): Promise<{ data: Supplier | null; error: any }> {
    return dashboardService.createSupplier(data)
}

export async function updateSupplierAction(id: string, data: Partial<Supplier>): Promise<{ error: any }> {
    return dashboardService.updateSupplier(id, data)
}

export async function deleteSupplierAction(id: string): Promise<{ error: any }> {
    return dashboardService.deleteSupplier(id)
}

export async function linkSupplierToProjectAction(supplierId: string, projectId: string, quota = 0): Promise<{ error: any }> {
    return dashboardService.linkSupplierToProject(supplierId, projectId, quota)
}

export async function unlinkSupplierFromProjectAction(supplierId: string, projectId: string): Promise<{ error: any }> {
    return dashboardService.unlinkSupplierFromProject(supplierId, projectId)
}

const notConfiguredError = { message: 'InsForge not configured' }

export async function createClientAction(name: string): Promise<{ data: Client | null; error: any }> {
    const db = await createAdminClient()
    if (!db) return { data: null, error: notConfiguredError }
    const { data, error } = await db.database
        .from('clients')
        .insert([{ name }])
        .select()
        .single()
    return { data, error }
}

export async function flushResponsesAction(): Promise<{ success: boolean; error: any }> {
    const { error } = await dashboardService.flushResponses()
    if (error) return { success: false, error }
    return { success: true, error: null }
}

export async function deleteClientAction(id: string): Promise<{ error: any }> {
    const db = await createAdminClient()
    if (!db) return { error: notConfiguredError }

    // 1. Unlink associated projects (Handle Foreign Key Constraint)
    // We set client_id to null so the projects are 'orphaned' but not lost,
    // which allows the client to be deleted from the database.
    const { error: unlinkError } = await db.database
        .from('projects')
        .update({ client_id: null })
        .eq('client_id', id)

    if (unlinkError) {
        console.error('[deleteClientAction] Unlink Error:', unlinkError)
        return { error: unlinkError }
    }

    // 2. Perform deletion of the client
    const { error } = await db.database
        .from('clients')
        .delete()
        .eq('id', id)

    return { error }
}

export async function createProjectAction(formData: any, countryUrls: any[] = []): Promise<{ data: Project | null; error: any }> {
    const db = await createAdminClient()
    if (!db) return { data: null, error: notConfiguredError }
    const { data, error } = await db.database
        .from('projects')
        .insert([{
            ...formData,
            project_name: formData.project_name || formData.project_code,
            target_uid: formData.target_uid || null,
            pid_prefix: formData.pid_prefix || null,
            pid_counter: formData.pid_counter || 1,
            pid_padding: formData.pid_padding || 2,
            force_pid_as_uid: formData.force_pid_as_uid || false,
            uid_params: formData.uid_params || null,
            is_multi_country: countryUrls.length > 0,
            country_urls: countryUrls,
            status: 'active'
        }])
        .select()
        .single()
    return { data, error }
}

export async function updateProjectStatusAction(id: string, status: 'active' | 'paused'): Promise<{ error: any }> {
    const db = await createAdminClient()
    if (!db) return { error: notConfiguredError }
    const { error } = await db.database
        .from('projects')
        .update({ status })
        .eq('id', id)
    return { error }
}

export async function updateProjectAction(id: string, data: any): Promise<{ error: any }> {
    const db = await createAdminClient()
    if (!db) return { error: notConfiguredError }
    const { error } = await db.database
        .from('projects')
        .update({
            ...data,
            project_name: data.project_name || data.project_code,
            target_uid: data.target_uid !== undefined ? data.target_uid : undefined,
            pid_prefix: data.pid_prefix !== undefined ? data.pid_prefix : undefined,
            pid_counter: data.pid_counter !== undefined ? data.pid_counter : undefined,
            pid_padding: data.pid_padding !== undefined ? data.pid_padding : undefined,
            force_pid_as_uid: data.force_pid_as_uid !== undefined ? data.force_pid_as_uid : undefined,
            uid_params: data.uid_params !== undefined ? data.uid_params : undefined,
        })
        .eq('id', id)
    return { error }
}

export async function updateCountryActiveAction(
    projectId: string,
    countryCode: string,
    active: boolean
): Promise<{ error: any }> {
    const db = await createAdminClient()
    if (!db) return { error: notConfiguredError }

    // Fetch current country_urls
    const { data: project, error: fetchError } = await db.database
        .from('projects')
        .select('country_urls')
        .eq('id', projectId)
        .single()

    if (fetchError || !project) return { error: fetchError || 'Project not found' }

    const updatedUrls = (project.country_urls as any[]).map((c: any) =>
        c.country_code === countryCode ? { ...c, active } : c
    )

    const { error } = await db.database
        .from('projects')
        .update({ country_urls: updatedUrls })
        .eq('id', projectId)

    return { error }
}

export async function deleteProjectAction(id: string): Promise<{ error: any }> {
    const db = await createAdminClient()
    if (!db) return { error: { message: 'InsForge not configured' } }

    console.log(`[deleteProjectAction] Deleting project id=${id}`)

    const { error } = await db.database
        .from('projects')
        .update({
            deleted_at: new Date().toISOString(),
            status: 'deleted'
        })
        .eq('id', id)

    if (error) {
        console.error('[deleteProjectAction] Error:', error)
        // If it's a constraint violation for 'deleted' status, try falling back to 'paused'
        if (error.code === '23514') {
            const { error: fallbackError } = await db.database
                .from('projects')
                .update({
                    deleted_at: new Date().toISOString(),
                    status: 'paused'
                })
                .eq('id', id)
            if (fallbackError) return { error: fallbackError }
        } else {
            return { error }
        }
    }

    return { error: null }
}
