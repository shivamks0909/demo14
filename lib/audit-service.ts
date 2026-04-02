import { getUnifiedDb } from './unified-db'

export type AuditEvent = {
  id?: string
  event_type: string
  payload: Record<string, any>
  ip?: string
  user_agent?: string
  created_at: string
}

export const auditService = {
  async log(event: Omit<AuditEvent, 'id' | 'created_at'>): Promise<void> {
    const { database: db } = await getUnifiedDb()
    if (!db) return

    try {
      await db
        .from('audit_logs')
        .insert([{
          ...event,
          created_at: new Date().toISOString()
        }])
    } catch (error) {
      console.error('[Audit] Failed to log event:', error)
    }
  },

  async getLogs(limit: number = 100, offset: number = 0): Promise<AuditEvent[]> {
    const { database: db } = await getUnifiedDb()
    if (!db) return []

    try {
      const { data } = await db
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
        .offset(offset)
      return data || []
    } catch (error) {
      console.error('[Audit] Failed to fetch logs:', error)
      return []
    }
  }
}
