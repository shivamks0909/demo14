import { createAdminClient as createInsForgeAdminClient } from './insforge-server'
import * as crypto from 'crypto'

// Detect if we're on Vercel (production) - avoid loading SQLite in serverless
const isVercel = process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL === '1'

export async function getUnifiedDb() {
    const insforge = await createInsForgeAdminClient()

    if (insforge) {
        return {
            source: 'insforge' as const,
            database: insforge.database
        }
    }

    // SQLite Fallback - skip on Vercel (cloud DB should always be available)
    if (isVercel) {
        throw new Error('Database unavailable: InsForge connection failed and local SQLite is not available on Vercel')
    }

    // Only load better-sqlite3 when actually needed (local dev only)
    const { getDb } = await import('./db')
    const db = getDb()

    // Build a query object that supports fluent chaining and final await
    function buildQuery(table: string) {
        let _where: Array<{ col: string; op: string; val: any }> = []
        let _limit: number | null = null
        let _offset: number | null = null
        let _columns = '*'
        let _updates: Record<string, any> | null = null
        let _inserts: any[] | null = null
        let _countMode = false
        let _order: { col: string, ascending: boolean } | null = null

        const execSelect = () => {
            try {
                let sql = `SELECT ${_columns === '*' || !_columns ? '*' : _columns} FROM ${table}`
                const params: any[] = []
                if (_where.length) {
                    const conditions = _where.map(w => {
                        if (w.op === 'eq') { params.push(w.val); return `${w.col} = ?` }
                        if (w.op === 'neq') { params.push(w.val); return `${w.col} != ?` }
                        if (w.op === 'gt') { params.push(w.val); return `${w.col} > ?` }
                        if (w.op === 'gte') { params.push(w.val); return `${w.col} >= ?` }
                        if (w.op === 'lt') { params.push(w.val); return `${w.col} < ?` }
                        if (w.op === 'lte') { params.push(w.val); return `${w.col} <= ?` }
                        if (w.op === 'in') {
                            const placeholders = Array.isArray(w.val) ? w.val.map(() => '?').join(', ') : '?'
                            if (Array.isArray(w.val)) params.push(...w.val)
                            else params.push(w.val)
                            return `${w.col} IN (${placeholders})`
                        }
                        if (w.op === 'ilike') { params.push(`%${w.val}%`); return `${w.col} LIKE ?` }
                        params.push(w.val); return `${w.col} = ?`
                    })
                    sql += ` WHERE ${conditions.join(' AND ')}`
                }
                if (_order) {
                    sql += ` ORDER BY ${_order.col} ${_order.ascending ? 'ASC' : 'DESC'}`
                } else {
                    sql += ` ORDER BY rowid DESC`
                }
                if (_limit !== null) sql += ` LIMIT ${_limit}`
                if (_offset !== null) sql += ` OFFSET ${_offset}`
                const rows = db.prepare(sql).all(...params)
                return { data: rows, error: null, count: rows.length }
            } catch (error: any) {
                console.error(`[LocalDB] SELECT error on ${table}:`, error)
                return { data: null, error: { message: error.message }, count: 0 }
            }
        }

        const execInsert = (rows: any[]) => {
            try {
                for (const row of rows) {
                    const keys = Object.keys(row).filter(k => row[k] !== undefined)
                    const values = keys.map(k => {
                        const val = row[k]
                        if (val instanceof Date) return val.toISOString()
                        if (typeof val === 'boolean') return val ? 1 : 0
                        if (val && typeof val === 'object') return JSON.stringify(val)
                        return val
                    })
                    const placeholders = values.map(() => '?').join(', ')
                    db.prepare(`INSERT OR IGNORE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`).run(...values)
                }
                return { data: rows, error: null }
            } catch (error: any) {
                console.error(`[LocalDB] INSERT error on ${table}:`, error)
                return { data: null, error: { message: error.message } }
            }
        }

        const execUpdate = () => {
            if (!_updates) return { error: { message: 'No updates provided' } }
            try {
                const keys = Object.keys(_updates).filter(k => _updates![k] !== undefined)
                const setVals = keys.map(k => {
                    const val = _updates![k]
                    if (val instanceof Date) return val.toISOString()
                    if (typeof val === 'boolean') return val ? 1 : 0
                    if (val && typeof val === 'object') return JSON.stringify(val)
                    return val
                })
                const params: any[] = [...setVals]
                let sql = `UPDATE ${table} SET ${keys.map(k => `${k} = ?`).join(', ')} `
                if (_where.length) {
                    const conditions = _where.map(w => {
                        if (w.op === 'in') {
                            const placeholders = Array.isArray(w.val) ? w.val.map(() => '?').join(', ') : '?'
                            if (Array.isArray(w.val)) params.push(...w.val)
                            else params.push(w.val)
                            return `${w.col} IN (${placeholders})`
                        }
                        params.push(w.val)
                        return `${w.col} = ?`
                    })
                    sql += ` WHERE ${conditions.join(' AND ')}`
                }
                db.prepare(sql).run(...params)
                return { error: null }
            } catch (error: any) {
                console.error(`[LocalDB] UPDATE error on ${table}:`, error)
                return { error: { message: error.message } }
            }
        }

        // Chainable query builder
        const builder: any = {
            select(columns: string = '*', opts?: any) {
                _columns = columns
                if (opts?.count === 'exact') _countMode = true
                return this
            },
            eq(col: string, val: any) {
                _where.push({ col, op: 'eq', val })
                return this
            },
            neq(col: string, val: any) {
                _where.push({ col, op: 'neq', val })
                return this
            },
            gt(col: string, val: any) {
                _where.push({ col, op: 'gt', val })
                return this
            },
            gte(col: string, val: any) {
                _where.push({ col, op: 'gte', val })
                return this
            },
            lt(col: string, val: any) {
                _where.push({ col, op: 'lt', val })
                return this
            },
            lte(col: string, val: any) {
                _where.push({ col, op: 'lte', val })
                return this
            },
            in(col: string, vals: any[]) {
                _where.push({ col, op: 'in', val: vals })
                return this
            },
            ilike(col: string, val: any) {
                _where.push({ col, op: 'ilike', val })
                return this
            },
            limit(n: number) {
                _limit = n
                return this
            },
            offset(n: number) {
                _offset = n
                return this
            },
            order(col: string, opts?: any) {
                _order = { col, ascending: opts?.ascending !== false }
                return this
            },
            insert(rows: any[]) {
                _inserts = rows
                const res = execInsert(rows)
                return {
                    select: () => ({
                        single: async () => ({ data: rows[0] || null, error: res.error }),
                        maybeSingle: async () => ({ data: rows[0] || null, error: res.error }),
                    }),
                    then: (cb: any) => Promise.resolve(cb(res)),
                    ...res
                }
            },
            update(updates: Record<string, any>) {
                _updates = updates
                return this
            },
            delete() {
                // Delete is just update but different SQL
                return this // Simplification for mock
            },
            maybeSingle: async function() {
                if (_updates) return { ...execUpdate(), data: null }
                const res = execSelect()
                return { data: res.data ? res.data[0] || null : null, error: res.error }
            },
            single: async function() {
                if (_updates) {
                    const res = execUpdate()
                    return { data: _updates, error: res.error }
                }
                const res = execSelect()
                const data = res.data ? res.data[0] || null : null
                return { data, error: data ? null : { message: 'Not found' } }
            },
            then: function(cb: any) {
                if (_updates) return Promise.resolve(cb(execUpdate()))
                return Promise.resolve(cb(execSelect()))
            }
        }

        builder[Symbol.toStringTag] = 'Promise'
        return builder
    }

    return {
        source: 'local' as const,
        database: {
            from: (table: string) => buildQuery(table),
            rpc: async (fn: string, params: any) => {
                if (fn === 'increment_quota') {
                    const { project_id, p_project_id, p_supplier_id } = params
                    const pid = project_id || p_project_id
                    const sid = p_supplier_id
                    try {
                        // 1. Try existing
                        const link = db.prepare('SELECT quota_used, quota_allocated FROM supplier_project_links WHERE project_id = ? AND supplier_id = ? AND status = "active"').get(pid, sid) as { quota_used: number, quota_allocated: number } | undefined
                        if (link) {
                            if (link.quota_used < link.quota_allocated) {
                                db.prepare('UPDATE supplier_project_links SET quota_used = quota_used + 1 WHERE project_id = ? AND supplier_id = ?').run(pid, sid)
                                return { data: true, error: null }
                            }
                            return { data: false, error: null }
                        }

                        // 2. Check if it's missing (auto-create)
                        const project = db.prepare('SELECT status, complete_target FROM projects WHERE id = ?').get(pid) as { status: string, complete_target: number } | undefined
                        const supplier = db.prepare('SELECT status FROM suppliers WHERE id = ?').get(sid) as { status: string } | undefined

                        if (project?.status === 'active' && supplier?.status === 'active') {
                            const quota = Math.max(project.complete_target || 10000, 100)
                            db.prepare('INSERT INTO supplier_project_links (id, project_id, supplier_id, quota_allocated, quota_used, status) VALUES (?, ?, ?, ?, ?, ?)').run(
                                crypto.randomUUID ? crypto.randomUUID() : `link_${Date.now()}`,
                                pid,
                                sid,
                                quota,
                                1,
                                'active'
                            )
                            return { data: true, error: null }
                        }
                        
                        return { data: false, error: null }
                    } catch (err: any) {
                        return { data: null, error: { message: err.message } }
                    }
                }
                return { data: null, error: { message: `RPC ${fn} not implemented in local mock` } }
            }
        }
    } as any
}
