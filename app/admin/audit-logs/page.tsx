'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { FileText, RefreshCw, Download } from 'lucide-react'
import ExportAuditLogsButton from '@/components/ExportAuditLogsButton'
import PageHeader from '@/components/ui/PageHeader'
import ActionCard from '@/components/ui/ActionCard'
import StatusBadge from '@/components/ui/StatusBadge'

interface AuditLog {
  id: string
  event_type: string
  payload: Record<string, any>
  ip: string
  user_agent: string
  created_at: string
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('')
  const [limit, setLimit] = useState(100)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchLogs = async (type?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', limit.toString())
      if (type) params.set('event_type', type)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        setLogs(data.logs)
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch logs')
      }
    } catch (err) {
      setError('Network error while fetching logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(eventTypeFilter || undefined)
  }, [eventTypeFilter, limit, dateFrom, dateTo])

  const uniqueEventTypes = Array.from(new Set(logs.map(l => l.event_type)))

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  const getEventTypeColor = (type: string) => {
    const lower = type.toLowerCase()
    if (lower.includes('error') || lower.includes('fail')) return 'error'
    if (lower.includes('complete') || lower.includes('success')) return 'success'
    if (lower.includes('warn')) return 'warning'
    return 'info'
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="System-wide event tracking and forensic trail"
        actions={
          <div className="flex items-center gap-2">
            <ExportAuditLogsButton logs={logs} />
            <button
              onClick={() => fetchLogs(eventTypeFilter || undefined)}
              disabled={loading}
              className="btn-ghost flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        }
      />

      {/* Filters */}
      <ActionCard title="Filters" description="Narrow down audit events">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">Event Type</label>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="input-field w-full"
            >
              <option value="">All Events</option>
              {uniqueEventTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">Limit</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="input-field w-full"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>500</option>
            </select>
          </div>
          <div className="w-36">
            <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-field w-full"
            />
          </div>
          <div className="w-36">
            <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-field w-full"
            />
          </div>
        </div>
      </ActionCard>

      {/* Error */}
      {error && (
        <div className="p-4 bg-error-soft border border-error-border rounded-2xl">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Logs Table */}
      <ActionCard
        title="Event Log"
        description={`${logs.length} events recorded`}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            <p className="mt-3 text-sm text-text-muted">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-bg-subtle flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-text-muted" />
            </div>
            <p className="text-sm text-text-muted">No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Event Type</th>
                  <th>IP Address</th>
                  <th>User Agent</th>
                  <th>Payload</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-sm text-text-muted whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td>
                      <StatusBadge status={getEventTypeColor(log.event_type)} variant="dot" />
                    </td>
                    <td className="text-sm font-mono text-text-secondary">
                      {log.ip || '-'}
                    </td>
                    <td className="text-xs text-text-muted max-w-[200px] truncate">
                      {log.user_agent || '-'}
                    </td>
                    <td>
                      <details className="group">
                        <summary className="cursor-pointer text-xs text-primary hover:text-primary-dark transition-colors">
                          View payload
                        </summary>
                        <pre className="mt-2 text-[10px] bg-bg-subtle p-3 rounded-xl overflow-auto max-w-md">
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ActionCard>
    </div>
  )
}
