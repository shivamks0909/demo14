'use client'

import { useState } from 'react'

export default function ExportAuditLogsButton({ logs }: { logs: any[] }) {
    const [loading, setLoading] = useState(false)

    const handleExport = async (format: 'csv' | 'json') => {
        setLoading(true)
        try {
            let content: string
            let filename: string
            let mimeType: string

            if (format === 'csv') {
                const headers = ['Timestamp', 'Event Type', 'IP Address', 'Payload']
                const rows = logs.map(l => [l.timestamp, l.event_type, l.ip_address || '', JSON.stringify(l.payload || {})])
                content = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
                filename = `audit-logs-export-${new Date().toISOString().split('T')[0]}.csv`
                mimeType = 'text/csv'
            } else {
                content = JSON.stringify(logs, null, 2)
                filename = `audit-logs-export-${new Date().toISOString().split('T')[0]}.json`
                mimeType = 'application/json'
            }

            const blob = new Blob([content], { type: mimeType })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', filename)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (error: any) {
            console.error('Export error:', error)
            alert('Export failed: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex gap-2">
            <button
                onClick={() => handleExport('csv')}
                disabled={loading || logs.length === 0}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
            </button>
            <button
                onClick={() => handleExport('json')}
                disabled={loading || logs.length === 0}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export JSON
            </button>
        </div>
    )
}
