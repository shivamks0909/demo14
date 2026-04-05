import { createClient } from '@insforge/sdk'

// InsForge Cloud Database Layer
const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://jezv8m6h.us-east.insforge.app'
const INSFORGE_KEY = process.env.INSFORGE_API_KEY || 'ik_bb6cc5593f8309b8efa7790df62e501a'

let cloudClient: ReturnType<typeof createClient> | null = null

function getCloudClient() {
  if (!cloudClient) {
    cloudClient = createClient({
      baseUrl: INSFORGE_URL,
      anonKey: INSFORGE_KEY
    })
  }
  return cloudClient
}

export async function getUnifiedDb() {
  const client = getCloudClient()
  const db = client.database

  return {
    source: 'cloud' as const,
    database: {
      from: (table: string) => {
        let _where: Array<{ col: string; op: string; val: any }> = []
        let _limit: number | null = null
        let _offset: number | null = null
        let _columns = '*'
        let _updates: Record<string, any> | null = null
        let _inserts: any[] | null = null
        let _order: { col: string, ascending: boolean } | null = null

        const builder: any = {
          select(columns: string = '*', opts?: any) {
            _columns = columns
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
          is(col: string, val: any) {
            _where.push({ col, op: val === null ? 'is_null' : 'is_not_null', val })
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
          range(from: number, to: number) {
            _limit = to - from + 1
            _offset = from
            return this
          },
          order(col: string, opts?: any) {
            _order = { col, ascending: opts?.ascending !== false }
            return this
          },
          insert(rows: any[]) {
            _inserts = rows
            return {
              select: () => ({
                single: async () => {
                  try {
                    const { data, error } = await db.from(table).insert(rows).select().single()
                    return { data, error }
                  } catch (err: any) {
                    return { data: null, error: { message: err.message } }
                  }
                },
                maybeSingle: async () => {
                  try {
                    const { data, error } = await db.from(table).insert(rows).select().maybeSingle()
                    return { data, error }
                  } catch (err: any) {
                    return { data: null, error: { message: err.message } }
                  }
                },
              }),
              then: async (cb: any) => {
                try {
                  const { data, error } = await db.from(table).insert(rows).select()
                  return cb({ data, error })
                } catch (err: any) {
                  return cb({ data: null, error: { message: err.message } })
                }
              }
            }
          },
          update(updates: Record<string, any>) {
            _updates = updates
            return this
          },
          delete() {
            return this
          },
          maybeSingle: async function() {
            try {
              let query = db.from(table).select(_columns)
              for (const w of _where) {
                if (w.op === 'eq') query = query.eq(w.col, w.val)
                else if (w.op === 'neq') query = query.neq(w.col, w.val)
                else if (w.op === 'gt') query = query.gt(w.col, w.val)
                else if (w.op === 'gte') query = query.gte(w.col, w.val)
                else if (w.op === 'lt') query = query.lt(w.col, w.val)
                else if (w.op === 'lte') query = query.lte(w.col, w.val)
                else if (w.op === 'in') query = query.in(w.col, w.val)
                else if (w.op === 'ilike') query = query.ilike(w.col, w.val)
                else if (w.op === 'is_null') query = query.is(w.col, null)
                else if (w.op === 'is_not_null') query = query.not(w.col, 'is', null)
              }
              if (_order) query = query.order(_order.col, { ascending: _order.ascending })
              if (_limit !== null) query = query.limit(_limit)
              if (_offset !== null) query = query.range(_offset, _offset + (_limit || 1) - 1)

              if (_updates) {
                let updateQuery = db.from(table).update(_updates)
                for (const w of _where) {
                  if (w.op === 'eq') updateQuery = updateQuery.eq(w.col, w.val)
                  else if (w.op === 'neq') updateQuery = updateQuery.neq(w.col, w.val)
                  else if (w.op === 'gt') updateQuery = updateQuery.gt(w.col, w.val)
                  else if (w.op === 'gte') updateQuery = updateQuery.gte(w.col, w.val)
                  else if (w.op === 'lt') updateQuery = updateQuery.lt(w.col, w.val)
                  else if (w.op === 'lte') updateQuery = updateQuery.lte(w.col, w.val)
                  else if (w.op === 'in') updateQuery = updateQuery.in(w.col, w.val)
                  else if (w.op === 'ilike') updateQuery = updateQuery.ilike(w.col, w.val)
                  else if (w.op === 'is_null') updateQuery = updateQuery.is(w.col, null)
                  else if (w.op === 'is_not_null') updateQuery = updateQuery.not(w.col, 'is', null)
                }
                const { data, error } = await updateQuery.select(_columns)
                return { data: data ? data[0] || null : null, error }
              }
              const { data, error } = await query
              return { data: data ? data[0] || null : null, error }
            } catch (err: any) {
              return { data: null, error: { message: err.message } }
            }
          },
          single: async function() {
            try {
              let query = db.from(table).select(_columns)
              for (const w of _where) {
                if (w.op === 'eq') query = query.eq(w.col, w.val)
                else if (w.op === 'neq') query = query.neq(w.col, w.val)
                else if (w.op === 'gt') query = query.gt(w.col, w.val)
                else if (w.op === 'gte') query = query.gte(w.col, w.val)
                else if (w.op === 'lt') query = query.lt(w.col, w.val)
                else if (w.op === 'lte') query = query.lte(w.col, w.val)
                else if (w.op === 'in') query = query.in(w.col, w.val)
                else if (w.op === 'ilike') query = query.ilike(w.col, w.val)
                else if (w.op === 'is_null') query = query.is(w.col, null)
                else if (w.op === 'is_not_null') query = query.not(w.col, 'is', null)
              }
              if (_order) query = query.order(_order.col, { ascending: _order.ascending })
              if (_limit !== null) query = query.limit(_limit)

              if (_updates) {
                let updateQuery = db.from(table).update(_updates)
                for (const w of _where) {
                  if (w.op === 'eq') updateQuery = updateQuery.eq(w.col, w.val)
                  else if (w.op === 'neq') updateQuery = updateQuery.neq(w.col, w.val)
                  else if (w.op === 'gt') updateQuery = updateQuery.gt(w.col, w.val)
                  else if (w.op === 'gte') updateQuery = updateQuery.gte(w.col, w.val)
                  else if (w.op === 'lt') updateQuery = updateQuery.lt(w.col, w.val)
                  else if (w.op === 'lte') updateQuery = updateQuery.lte(w.col, w.val)
                  else if (w.op === 'in') updateQuery = updateQuery.in(w.col, w.val)
                  else if (w.op === 'ilike') updateQuery = updateQuery.ilike(w.col, w.val)
                  else if (w.op === 'is_null') updateQuery = updateQuery.is(w.col, null)
                  else if (w.op === 'is_not_null') updateQuery = updateQuery.not(w.col, 'is', null)
                }
                const { data, error } = await updateQuery.select(_columns)
                return { data: data ? data[0] || null : null, error }
              }
              const { data, error } = await query
              const row = data ? data[0] || null : null
              return { data: row, error: row ? null : { message: 'Not found' } }
            } catch (err: any) {
              return { data: null, error: { message: err.message } }
            }
          },
          then: async function(cb: any) {
            try {
              let query = db.from(table).select(_columns)
              for (const w of _where) {
                if (w.op === 'eq') query = query.eq(w.col, w.val)
                else if (w.op === 'neq') query = query.neq(w.col, w.val)
                else if (w.op === 'gt') query = query.gt(w.col, w.val)
                else if (w.op === 'gte') query = query.gte(w.col, w.val)
                else if (w.op === 'lt') query = query.lt(w.col, w.val)
                else if (w.op === 'lte') query = query.lte(w.col, w.val)
                else if (w.op === 'in') query = query.in(w.col, w.val)
                else if (w.op === 'ilike') query = query.ilike(w.col, w.val)
                else if (w.op === 'is_null') query = query.is(w.col, null)
                else if (w.op === 'is_not_null') query = query.not(w.col, 'is', null)
              }
              if (_order) query = query.order(_order.col, { ascending: _order.ascending })
              if (_limit !== null) query = query.limit(_limit)
              if (_offset !== null) query = query.range(_offset, _offset + (_limit || 1) - 1)

              if (_updates) {
                let updateQuery = db.from(table).update(_updates)
                for (const w of _where) {
                  if (w.op === 'eq') updateQuery = updateQuery.eq(w.col, w.val)
                  else if (w.op === 'neq') updateQuery = updateQuery.neq(w.col, w.val)
                  else if (w.op === 'gt') updateQuery = updateQuery.gt(w.col, w.val)
                  else if (w.op === 'gte') updateQuery = updateQuery.gte(w.col, w.val)
                  else if (w.op === 'lt') updateQuery = updateQuery.lt(w.col, w.val)
                  else if (w.op === 'lte') updateQuery = updateQuery.lte(w.col, w.val)
                  else if (w.op === 'in') updateQuery = updateQuery.in(w.col, w.val)
                  else if (w.op === 'ilike') updateQuery = updateQuery.ilike(w.col, w.val)
                  else if (w.op === 'is_null') updateQuery = updateQuery.is(w.col, null)
                  else if (w.op === 'is_not_null') updateQuery = updateQuery.not(w.col, 'is', null)
                }
                const { data, error } = await updateQuery.select(_columns)
                return cb({ data, error })
              }
              const { data, error } = await query
              return cb({ data, error })
            } catch (err: any) {
              return cb({ data: null, error: { message: err.message } })
            }
          }
        }

        builder[Symbol.toStringTag] = 'Promise'
        return builder
      },
      rpc: async (fn: string, params: any) => {
        if (fn === 'increment_quota') {
          const { project_id, p_project_id, p_supplier_id } = params
          const pid = project_id || p_project_id
          const sid = p_supplier_id
          try {
            const { data: link } = await db
              .from('supplier_project_links')
              .select('quota_used, quota_allocated')
              .eq('project_id', pid)
              .eq('supplier_id', sid)
              .eq('status', 'active')
              .maybeSingle()

            if (link) {
              if (link.quota_used < link.quota_allocated) {
                await db
                  .from('supplier_project_links')
                  .update({ quota_used: link.quota_used + 1 })
                  .eq('project_id', pid)
                  .eq('supplier_id', sid)
                return { data: true, error: null }
              }
              return { data: false, error: null }
            }

            const { data: project } = await db
              .from('projects')
              .select('status, complete_target')
              .eq('id', pid)
              .maybeSingle()

            const { data: supplier } = await db
              .from('suppliers')
              .select('status')
              .eq('id', sid)
              .maybeSingle()

            if (project?.status === 'active' && supplier?.status === 'active') {
              const quota = Math.max(project.complete_target || 10000, 100)
              await db.from('supplier_project_links').insert([{
                project_id: pid,
                supplier_id: sid,
                quota_allocated: quota,
                quota_used: 1,
                status: 'active'
              }])
              return { data: true, error: null }
            }

            return { data: false, error: null }
          } catch (err: any) {
            return { data: null, error: { message: err.message } }
          }
        }
        return { data: null, error: { message: `RPC ${fn} not implemented` } }
      }
    }
  }
}
