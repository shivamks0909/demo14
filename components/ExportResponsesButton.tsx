'use client'

import { useState } from 'react'

export default function ExportResponsesButton() {
    const [loading, setLoading] = useState(false)

    const handleExport = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/admin/responses/export')

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to generate export')
            }

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)

            const contentDisposition = response.headers.get('Content-Disposition')
            let filename = `responses-export-${new Date().toISOString().split('T')[0]}.csv`

            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/)
                if (match && match[1]) filename = match[1]
            }

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
        <button
            onClick={handleExport}
            disabled={loading}
            className="inline-flex items-center px-6 py-2.5 border border-indigo-600 text-sm font-bold rounded-xl shadow-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all uppercase tracking-widest shadow-indigo-100 group"
        >
            <svg className="w-4 h-4 mr-2 group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {loading ? 'Preparing Report...' : 'Export Responses (CSV)'}
        </button>
    )
}
