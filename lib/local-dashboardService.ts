import { getDb } from '@/lib/db'

function ensureProjectColumns(db: ReturnType<typeof getDb>) {
    const columns = db.pragma('table_info(projects)') as any[]
    const colNames = columns.map((c: any) => c.name)
    const extraCols = [
        { name: 'client_id', type: 'TEXT DEFAULT ""' },
        { name: 'country', type: "TEXT DEFAULT 'Global'" },
        { name: 'is_multi_country', type: 'INTEGER DEFAULT 0' },
        { name: 'has_prescreener', type: 'INTEGER DEFAULT 0' },
        { name: 'prescreener_url', type: 'TEXT DEFAULT ""' },
        { name: 'complete_target', type: 'INTEGER' },
        { name: 'country_urls', type: 'TEXT DEFAULT "[]"' },
        { name: 'pid_prefix', type: 'TEXT DEFAULT ""' },
        { name: 'pid_counter', type: 'INTEGER DEFAULT 1' },
        { name: 'pid_padding', type: 'INTEGER DEFAULT 2' },
        { name: 'force_pid_as_uid', type: 'INTEGER DEFAULT 0' },
        { name: 'target_uid', type: 'TEXT DEFAULT ""' },
        { name: 'client_pid_param', type: 'TEXT DEFAULT ""' },
        { name: 'client_uid_param', type: 'TEXT DEFAULT ""' },
        { name: 'oi_prefix', type: "TEXT DEFAULT 'oi_'" },
        { name: 'uid_params', type: 'TEXT' },
    ]
    for (const col of extraCols) {
        if (!colNames.includes(col.name)) {
            try {
                db.exec(`ALTER TABLE projects ADD COLUMN ${col.name} ${col.type}`)
            } catch (_) {}
        }
    }
}

function parseProject(p: any) {
    return {
        ...p,
        client_id: p.client_id || '',
        country: p.country || 'Global',
        is_multi_country: p.is_multi_country ? true : false,
        has_prescreener: p.has_prescreener ? true : false,
        country_urls: (() => {
            try { return p.country_urls ? JSON.parse(p.country_urls) : [] } catch { return [] }
        })(),
        uid_params: (() => {
            try { return p.uid_params ? JSON.parse(p.uid_params) : null } catch { return null }
        })(),
    }
}

export const dashboardService = {
    async getProjectAnalytics(clientId?: string): Promise<any[]> {
        const db = getDb()
        const today = new Date().toISOString().split('T')[0]

        // Build WHERE clause for client filtering if provided
        let clientFilter = ''
        const params: any[] = []
        if (clientId) {
            clientFilter = 'WHERE p.client_id = ?'
            params.push(clientId)
        }

        // Use a single query with conditional aggregation
        const query = `
            SELECT
                p.id as project_id,
                p.project_code,
                p.project_name,
                p.status as project_status,
                COUNT(r.id) as total_clicks,
                COUNT(CASE WHEN r.status = 'complete' THEN 1 END) as total_completes,
                COUNT(CASE WHEN DATE(r.created_at) = ? THEN 1 END) as clicks_today,
                COUNT(CASE WHEN r.status = 'in_progress' AND DATE(r.created_at) = ? THEN 1 END) as in_progress_today,
                COUNT(CASE WHEN r.status = 'complete' AND DATE(r.created_at) = ? THEN 1 END) as completes_today,
                COUNT(CASE WHEN r.status = 'terminate' AND DATE(r.created_at) = ? THEN 1 END) as terminates_today,
                COUNT(CASE WHEN r.status = 'quota_full' AND DATE(r.created_at) = ? THEN 1 END) as quotafull_today,
                COUNT(CASE WHEN (r.status = 'duplicate_ip' OR r.status = 'duplicate_string') AND DATE(r.created_at) = ? THEN 1 END) as duplicates_today,
                COUNT(CASE WHEN r.status = 'security_terminate' AND DATE(r.created_at) = ? THEN 1 END) as security_terminates_today
            FROM projects p
            LEFT JOIN responses r ON p.id = r.project_id
            ${clientFilter}
            GROUP BY p.id, p.project_code, p.project_name, p.status
            ORDER BY total_clicks DESC
        `

        const results = db.prepare(query).all(today, today, today, today, today, today, today, ...params) as any[]

        return results.map(r => ({
            project_id: r.project_id,
            project_code: r.project_code,
            project_name: r.project_name,
            status: r.project_status,
            clicks_total: r.total_clicks || 0,
            completes_total: r.total_completes || 0,
            clicks_today: r.clicks_today || 0,
            in_progress_today: r.in_progress_today || 0,
            completes_today: r.completes_today || 0,
            terminates_today: r.terminates_today || 0,
            quotafull_today: r.quotafull_today || 0,
            duplicates_today: r.duplicates_today || 0,
            security_terminates_today: r.security_terminates_today || 0,
        }))
    },

    async getClients(): Promise<any[]> {
        const db = getDb()
        let clients = db.prepare('SELECT * FROM clients').all() as any[]
        
        if (clients.length === 0) {
            const id = `cli_${Date.now()}`
            db.prepare('INSERT INTO clients (id, name) VALUES (?, ?)').run(id, 'Default Client')
            clients = db.prepare('SELECT * FROM clients').all() as any[]
        }
        
        return clients
    },

    async createClient(name: string): Promise<{ data: any; error: any }> {
        const db = getDb()
        try {
            const id = `cli_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            db.prepare('INSERT INTO clients (id, name, created_at) VALUES (?, ?, ?)').run(
                id, name, new Date().toISOString()
            )
            const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id)
            return { data: client, error: null }
        } catch (error: any) {
            return { data: null, error: { message: error.message } }
        }
    },

    async deleteClient(id: string): Promise<{ error: any }> {
        const db = getDb()
        try {
            db.prepare('DELETE FROM clients WHERE id = ?').run(id)
            return { error: null }
        } catch (error: any) {
            return { error }
        }
    },

    async getProjects(): Promise<any[]> {
        const db = getDb()
        ensureProjectColumns(db)
        const today = new Date().toISOString().split('T')[0]

        // Get projects with today's analytics
        const query = `
            SELECT
                p.*,
                c.name as client_name,
                COUNT(r.id) as total_clicks,
                COUNT(CASE WHEN DATE(r.created_at) = ? THEN 1 END) as clicks_today,
                COUNT(CASE WHEN r.status = 'complete' AND DATE(r.created_at) = ? THEN 1 END) as completes_today
            FROM projects p
            LEFT JOIN clients c ON p.client_id = c.id
            LEFT JOIN responses r ON p.id = r.project_id
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `

        let projects = db.prepare(query).all(today, today) as any[]

        if (projects.length === 0) {
            // Seed with demo data if empty
            const clients = db.prepare('SELECT * FROM clients LIMIT 1').all() as any[]
            if (clients.length === 0) {
                const clientId = `cli_${Date.now()}`
                db.prepare('INSERT INTO clients (id, name, created_at) VALUES (?, ?, ?)').run(
                    clientId, 'Demo Client', new Date().toISOString()
                )
                db.prepare(`
                    INSERT INTO projects (id, project_code, project_name, base_url, status, client_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                    `proj_${Date.now()}`, 'DEMO-001', 'Nexus Intelligence Survey', 'https://survey.nexus.ai/s1', 'active', clientId, new Date().toISOString()
                )
            } else {
                const clientId = clients[0].id
                db.prepare(`
                    INSERT INTO projects (id, project_code, project_name, base_url, status, client_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                    `proj_${Date.now()}`, 'DEMO-001', 'Nexus Intelligence Survey', 'https://survey.nexus.ai/s1', 'active', clientId, new Date().toISOString()
                )
            }
            // Re-fetch after seeding
            projects = db.prepare(query).all(today, today) as any[]
        }

        // Add computed conversion rate
        return projects.map((p: any) => ({
            ...parseProject(p),
            clicks_today: p.clicks_today || 0,
            completes_today: p.completes_today || 0,
            conversion_rate: p.clicks_today > 0 ? Math.round((p.completes_today / p.clicks_today) * 100) : 0
        }))
    },

    async getProjectById(id: string): Promise<any | null> {
        const db = getDb()
        ensureProjectColumns(db)
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any
        if (!project) return null
        return parseProject(project)
    },

    async createProject(formData: any): Promise<{ data: any; error: any }> {
        const db = getDb()
        try {
            ensureProjectColumns(db)
            const id = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            const stmt = db.prepare(`
                INSERT INTO projects (
                    id, project_code, project_name, base_url, status, created_at,
                    client_id, country, is_multi_country, has_prescreener, prescreener_url,
                    complete_target, country_urls, pid_prefix, pid_counter, pid_padding,
                    force_pid_as_uid, target_uid, client_pid_param, client_uid_param, oi_prefix, uid_params
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            stmt.run(
                id,
                formData.project_code,
                formData.project_name || formData.project_code,
                formData.base_url || '',
                'active',
                new Date().toISOString(),
                formData.client_id || '',
                formData.country || 'Global',
                formData.is_multi_country ? 1 : 0,
                formData.has_prescreener ? 1 : 0,
                formData.prescreener_url || '',
                formData.complete_target || null,
                JSON.stringify(formData.country_urls || []),
                formData.pid_prefix || '',
                formData.pid_counter || 1,
                formData.pid_padding || 2,
                formData.force_pid_as_uid ? 1 : 0,
                formData.target_uid || '',
                formData.client_pid_param || '',
                formData.client_uid_param || '',
                formData.oi_prefix || 'oi_',
                formData.uid_params ? JSON.stringify(formData.uid_params) : null,
            )
            const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id)
            return { data: project, error: null }
        } catch (error: any) {
            console.error('[createProject] error:', error)
            return { data: null, error: { message: error.message || 'Failed to create project' } }
        }
    },

    async updateProject(id: string, data: any): Promise<{ error: any }> {
        const db = getDb()
        try {
            ensureProjectColumns(db)
            const stmt = db.prepare(`
                UPDATE projects SET
                    project_name = ?,
                    project_code = ?,
                    base_url = ?,
                    client_id = ?,
                    country = ?,
                    is_multi_country = ?,
                    has_prescreener = ?,
                    prescreener_url = ?,
                    complete_target = ?,
                    country_urls = ?,
                    pid_prefix = ?,
                    pid_counter = ?,
                    pid_padding = ?,
                    force_pid_as_uid = ?,
                    target_uid = ?,
                    client_pid_param = ?,
                    client_uid_param = ?,
                    oi_prefix = ?,
                    uid_params = ?
                WHERE id = ?
            `)
            stmt.run(
                data.project_name,
                data.project_code,
                data.base_url || '',
                data.client_id || '',
                data.country || 'Global',
                data.is_multi_country ? 1 : 0,
                data.has_prescreener ? 1 : 0,
                data.prescreener_url || '',
                data.complete_target || null,
                JSON.stringify(data.country_urls || []),
                data.pid_prefix || '',
                data.pid_counter || 1,
                data.pid_padding || 2,
                data.force_pid_as_uid ? 1 : 0,
                data.target_uid || '',
                data.client_pid_param || '',
                data.client_uid_param || '',
                data.oi_prefix || 'oi_',
                data.uid_params ? JSON.stringify(data.uid_params) : null,
                id,
            )
            return { error: null }
        } catch (error: any) {
            console.error('[updateProject] error:', error)
            return { error: { message: error.message || 'Failed to update project' } }
        }
    },

    async updateProjectStatus(id: string, status: 'active' | 'paused'): Promise<{ error: any }> {
        const db = getDb()
        try {
            db.prepare('UPDATE projects SET status = ? WHERE id = ?').run(status, id)
            return { error: null }
        } catch (error) {
            return { error }
        }
    },

    async deleteProject(id: string): Promise<{ error: any }> {
        const db = getDb()
        try {
            db.prepare('DELETE FROM projects WHERE id = ?').run(id)
            return { error: null }
        } catch (error) {
            return { error }
        }
    },

    async getSuppliers(): Promise<any[]> {
        const db = getDb()
        // Check if suppliers table exists
        try {
            const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY created_at DESC').all()
            return suppliers as any[]
        } catch {
            return []
        }
    },

    async getSupplierByToken(token: string): Promise<any | null> {
        const db = getDb()
        try {
            const supplier = db.prepare('SELECT * FROM suppliers WHERE supplier_token = ? AND status = ?').get(token, 'active')
            return supplier as any || null
        } catch {
            return null
        }
    },

    async createSupplier(supplier: any): Promise<{ data: any; error: any }> {
        const db = getDb()
        try {
            const id = `sup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            const stmt = db.prepare(`
                INSERT INTO suppliers (
                    id, name, supplier_token, contact_email, platform_type,
                    uid_macro, complete_redirect_url, terminate_redirect_url,
                    quotafull_redirect_url, notes, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            stmt.run(
                id,
                supplier.name || 'Unnamed Supplier',
                supplier.supplier_token || `token_${id}`,
                supplier.contact_email || '',
                supplier.platform_type || 'custom',
                supplier.uid_macro || 'uid',
                supplier.complete_redirect_url || '',
                supplier.terminate_redirect_url || '',
                supplier.quotafull_redirect_url || '',
                supplier.notes || '',
                supplier.status || 'active',
                new Date().toISOString()
            )
            const created = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id)
            return { data: created, error: null }
        } catch (error: any) {
            return { data: null, error: { message: error.message } }
        }
    },

    async updateSupplier(id: string, supplier: Partial<any>): Promise<{ error: any }> {
        const db = getDb()
        try {
            const sets = []
            const values = []
            for (const [key, value] of Object.entries(supplier)) {
                if (key !== 'id') {
                    sets.push(`${key} = ?`)
                    values.push(value)
                }
            }
            if (sets.length === 0) return { error: null }
            values.push(id)
            db.prepare(`UPDATE suppliers SET ${sets.join(', ')} WHERE id = ?`).run(...values)
            return { error: null }
        } catch (error: any) {
            return { error: { message: error.message } }
        }
    },

    async deleteSupplier(id: string): Promise<{ error: any }> {
        const db = getDb()
        try {
            // First delete project links
            db.prepare('DELETE FROM supplier_project_links WHERE supplier_id = ?').run(id)
            // Then delete supplier
            db.prepare('DELETE FROM suppliers WHERE id = ?').run(id)
            return { error: null }
        } catch (error: any) {
            return { error: { message: error.message } }
        }
    },

    async getSupplierProjectLinks(projectId: string): Promise<any[]> {
        const db = getDb()
        try {
            const links = db.prepare(`
                SELECT spl.*, s.name as supplier_name, s.supplier_token, s.status as supplier_status
                FROM supplier_project_links spl
                JOIN suppliers s ON spl.supplier_id = s.id
                WHERE spl.project_id = ?
            `).all(projectId) as any[]
            return links
        } catch {
            return []
        }
    },

    async linkSupplierToProject(supplierId: string, projectId: string, quotaAllocated = 0): Promise<{ error: any }> {
        const db = getDb()
        try {
            const id = `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            db.prepare(`
                INSERT INTO supplier_project_links (id, supplier_id, project_id, quota_allocated, quota_used, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(id, supplierId, projectId, quotaAllocated, 0, 'active', new Date().toISOString())
            return { error: null }
        } catch (error: any) {
            return { error: { message: error.message } }
        }
    },

    async unlinkSupplierFromProject(supplierId: string, projectId: string): Promise<{ error: any }> {
        const db = getDb()
        try {
            db.prepare('DELETE FROM supplier_project_links WHERE supplier_id = ? AND project_id = ?').run(supplierId, projectId)
            return { error: null }
        } catch (error: any) {
            return { error: { message: error.message } }
        }
    },

    async getKPIs(): Promise<any> {
        const db = getDb()
        const today = new Date().toISOString().split('T')[0]

        const totalProjects = (db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number }).count
        const activeProjects = (db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'active'").get() as { count: number }).count
        const clicksToday = (db.prepare('SELECT COUNT(*) as count FROM responses WHERE DATE(created_at) = ?').get(today) as { count: number }).count
        const totalResponses = (db.prepare('SELECT COUNT(*) as count FROM responses').get() as { count: number }).count
        const completesToday = (db.prepare("SELECT COUNT(*) as count FROM responses WHERE status = 'complete' AND DATE(created_at) = ?").get(today) as { count: number }).count
        const terminatesToday = (db.prepare("SELECT COUNT(*) as count FROM responses WHERE status = 'terminate' AND DATE(created_at) = ?").get(today) as { count: number }).count
        const quotafullToday = (db.prepare("SELECT COUNT(*) as count FROM responses WHERE (status = 'quota_full' OR status = 'quota') AND DATE(created_at) = ?").get(today) as { count: number }).count
        const inProgressToday = (db.prepare("SELECT COUNT(*) as count FROM responses WHERE status = 'in_progress' AND DATE(created_at) = ?").get(today) as { count: number }).count
        const duplicatesToday = (db.prepare("SELECT COUNT(*) as count FROM responses WHERE (status = 'duplicate_ip' OR status = 'duplicate_string') AND DATE(created_at) = ?").get(today) as { count: number }).count
        const securityTerminatesToday = (db.prepare("SELECT COUNT(*) as count FROM responses WHERE status = 'security_terminate' AND DATE(created_at) = ?").get(today) as { count: number }).count

        return {
            total_projects: totalProjects,
            active_projects: activeProjects,
            total_clicks_today: clicksToday,
            clicks_today: clicksToday,
            total_responses: totalResponses,
            total_completes_today: completesToday,
            completes_today: completesToday,
            terminates_today: terminatesToday,
            quotafull_today: quotafullToday,
            in_progress_today: inProgressToday,
            duplicates_today: duplicatesToday,
            security_terminates_today: securityTerminatesToday,
        }
    },

    async getResponses(filters?: { ip?: string; status?: string; device_type?: string }): Promise<any[]> {
        const db = getDb()

        const conditions: string[] = []
        const params: any[] = []

        if (filters && typeof filters === 'object') {
            if (filters.ip) {
                conditions.push('r.ip LIKE ?')
                params.push(`%${filters.ip}%`)
            }
            if (filters.status && filters.status !== 'all') {
                conditions.push('r.status = ?')
                params.push(filters.status)
            }
            if (filters.device_type && filters.device_type !== 'all') {
                conditions.push('r.device_type = ?')
                params.push(filters.device_type)
            }
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

        const responses = db.prepare(`
            SELECT
                r.*,
                p.project_code,
                p.project_name
            FROM responses r
            LEFT JOIN projects p ON r.project_id = p.id
            ${whereClause}
            ORDER BY r.created_at DESC
            LIMIT 200
        `).all(...params)

        return responses
    },

    async getProjectHealthMetrics(): Promise<any[]> {
        const db = getDb()
        const today = new Date().toISOString().split('T')[0]

        const metrics = db.prepare(`
            SELECT
                p.id as project_id,
                p.project_code,
                p.project_name,
                COUNT(CASE WHEN DATE(r.created_at) = ? THEN 1 END) as clicks_today,
                COUNT(CASE WHEN r.status = 'in_progress' AND DATE(r.created_at) = ? THEN 1 END) as in_progress_today,
                COUNT(CASE WHEN r.status = 'complete' AND DATE(r.created_at) = ? THEN 1 END) as completes_today,
                COUNT(CASE WHEN r.status = 'terminate' AND DATE(r.created_at) = ? THEN 1 END) as terminates_today,
                COUNT(CASE WHEN r.status = 'quota_full' AND DATE(r.created_at) = ? THEN 1 END) as quotafull_today,
                COUNT(CASE WHEN (r.status = 'duplicate_ip' OR r.status = 'duplicate_string') AND DATE(r.created_at) = ? THEN 1 END) as duplicates_today,
                COUNT(CASE WHEN r.status = 'security_terminate' AND DATE(r.created_at) = ? THEN 1 END) as security_terminates_today,
                ROUND(
                    CAST(COUNT(CASE WHEN r.status = 'complete' AND DATE(r.created_at) = ? THEN 1 END) AS FLOAT) * 100.0 /
                    NULLIF(COUNT(CASE WHEN DATE(r.created_at) = ? THEN 1 END), 0),
                    2
                ) as conversion_rate
            FROM projects p
            LEFT JOIN responses r ON p.id = r.project_id
            GROUP BY p.id, p.project_code, p.project_name
            ORDER BY clicks_today DESC
        `).all(today, today, today, today, today, today, today, today, today) as any[]

        const result = metrics.map(m => ({
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
        return result
    },
}
