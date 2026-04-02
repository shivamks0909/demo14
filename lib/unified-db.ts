import { createAdminClient as createInsForgeAdminClient } from './insforge-server.ts'

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
                        params.push(w.val); return `${w.col} = ?`
                    })
                    sql += ` WHERE ${conditions.join(' AND ')}`
                }
                sql += ` ORDER BY rowid DESC`
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
                    // Filter out undefined and convert Date objects to ISO strings
                    const keys = Object.keys(row).filter(k => row[k] !== undefined)
                    const values = keys.map(k => {
                        const val = row[k]
                        // Convert Date objects to ISO strings for SQLite
                        if (val instanceof Date) return val.toISOString()
                        // Convert boolean to number for SQLite (0/1)
                        if (typeof val === 'boolean') return val ? 1 : 0
                        // Ensure value is a primitive (string, number, bigint, Buffer, null)
                        if (val && typeof val === 'object') {
                            // For any remaining objects (like {}), stringify
                            console.warn(`[LocalDB] Converting object to string for key ${k}:`, val)
                            return JSON.stringify(val)
                        }
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

        const execUpdate = (updates: Record<string, any>, where: Array<{ col: string; op: string; val: any }>) => {
            try {
                const keys = Object.keys(updates).filter(k => updates[k] !== undefined)
                const setVals = keys.map(k => {
                    const val = updates[k]
                    // Convert Date objects to ISO strings
                    if (val instanceof Date) return val.toISOString()
                    // Convert boolean to number
                    if (typeof val === 'boolean') return val ? 1 : 0
                    // Convert objects to JSON strings
                    if (val && typeof val === 'object') {
                        console.warn(`[LocalDB] Converting object to string for update key ${k}:`, val)
                        return JSON.stringify(val)
                    }
                    return val
                })
                const params: any[] = [...setVals]
                let sql = `UPDATE ${table} SET ${keys.map(k => `${k} = ?`).join(', ')} `
                if (where.length) {
                    const conds = where.map(w => { params.push(w.val); return `${w.col} = ?` })
                    sql += ` WHERE ${conds.join(' AND ')}`
                }
                db.prepare(sql).run(...params)
                return { error: null }
            } catch (error: any) {
                console.error(`[LocalDB] UPDATE error on ${table}:`, error)
                return { error: { message: error.message } }
            }
        }

        // Chainable query builder
        const q: any = {
            _where, _limit, _columns,

            select(columns: string = '*', opts?: any) {
                _columns = columns
                _countMode = opts?.count === 'exact'
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

            limit(n: number) {
                _limit = n
                return this
            },

            offset(n: number) {
                _offset = n
                return this
            },

            order(col: string, opts?: any) {
                // Already handles DESC in execSelect
                return this
            },

            // INSERT chainable
            insert(rows: any[]) {
                _inserts = rows
                const insertResult = execInsert(rows)
                // Return chainable with then/select
                return {
                    select: () => ({
                        single: async () => ({ data: rows[0] || null, error: insertResult.error }),
                        maybeSingle: async () => ({ data: rows[0] || null, error: insertResult.error }),
                    }),
                    then: (cb: any) => Promise.resolve(cb(insertResult)),
                    ...insertResult
                }
            },

            // UPDATE chainable
            update(updates: Record<string, any>) {
                _updates = updates
                const outerWhere = _where
                return {
                    eq(col: string, val: any) {
                        outerWhere.push({ col, op: 'eq', val })
                        const result = execUpdate(updates, outerWhere)
                        return {
                            select: (cols = '*') => ({
                                single: async () => {
                                    const row = db.prepare(`SELECT ${cols} FROM ${table} WHERE ${col} = ?`).get(val)
                                    return { data: row || null, error: null }
                                },
                                maybeSingle: async () => {
                                    const row = db.prepare(`SELECT ${cols} FROM ${table} WHERE ${col} = ?`).get(val)
                                    return { data: row || null, error: null }
                                },
                            }),
                            ...result,
                            then: (cb: any) => Promise.resolve(cb(result)),
                        }
                    },
                    then: (cb: any) => Promise.resolve(cb(execUpdate(updates, outerWhere))),
                }
            },

            // DELETE chainable
            delete() {
                return {
                    eq(col: string, val: any) {
                        try {
                            db.prepare(`DELETE FROM ${table} WHERE ${col} = ?`).run(val)
                            return { error: null, then: (cb: any) => Promise.resolve(cb({ error: null })) }
                        } catch (error: any) {
                            return { error: { message: error.message }, then: (cb: any) => Promise.resolve(cb({ error: { message: error.message } })) }
                        }
                    }
                }
            },

            // Terminal: maybeSingle
            maybeSingle: async () => {
                const res = execSelect()
                const rows = (res.data || []) as any[]
                return { data: rows[0] || null, error: res.error }
            },

            // Terminal: single
            single: async () => {
                const res = execSelect()
                const rows = (res.data || []) as any[]
                return { data: rows[0] || null, error: rows[0] ? null : { message: 'Not found' } }
            },

            // Terminal: then (allows await on query builder directly)
            then: (cb: any) => {
                const res = execSelect()
                return Promise.resolve(cb(res))
            },
        }

        // Make the whole builder thenable (so `await db.from(t).select(...)` works)
        q[Symbol.toStringTag] = 'Promise'

        return q
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
                        const link = db.prepare('SELECT quota_used, quota_allocated FROM supplier_project_links WHERE project_id = ? AND supplier_id = ? AND status = "active"').get(pid, sid) as { quota_used: number, quota_allocated: number } | undefined
                        if (link && link.quota_used < link.quota_allocated) {
                            db.prepare('UPDATE supplier_project_links SET quota_used = quota_used + 1 WHERE project_id = ? AND supplier_id = ?').run(pid, sid)
                            return { data: true, error: null }
                        }
                        return { data: false, error: null }
                    } catch (err: any) {
                        return { data: null, error: err }
                    }
                }
                return { data: null, error: { message: `RPC ${fn} not implemented in local mock` } }
            }
        }
    } as any
}
