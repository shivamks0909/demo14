import { dashboardService } from '@/lib/dashboardService'
import ExportResponsesButton from '@/components/ExportResponsesButton'
import ResponseMaintenance from '@/components/ResponseMaintenance'
import AdminResponsesTable from '@/components/AdminResponsesTable'

export const dynamic = 'force-dynamic'

export default async function AdminResponsesPage({
    searchParams,
}: {
    searchParams: Promise<{ ip?: string; status?: string; device_type?: string }>
}) {
    const filters = await searchParams
    const responses = await dashboardService.getResponses(filters)

    // IP Activity Logic for badges - calculate once
    const today = new Date().toDateString()
    const ipCountsToday = responses.reduce((acc: Record<string, number>, r: { created_at: string; ip?: string }) => {
        const isToday = new Date(r.created_at).toDateString() === today
        if (isToday && r.ip) {
            acc[r.ip] = (acc[r.ip] || 0) + 1
        }
        return acc
    }, {})

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Response Tracking</h1>
                    <p className="text-sm text-slate-500 font-medium">Live logs of all activity across projects.</p>
                </div>
                <div className="flex items-center space-x-3 w-full md:w-auto">
                    <form className="flex flex-1 md:flex-none gap-2">
                        <input
                            type="text"
                            name="ip"
                            placeholder="Filter IP..."
                            defaultValue={filters.ip}
                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all w-32"
                        />
                        <select
                            name="status"
                            defaultValue={filters.status || 'all'}
                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        >
                            <option value="all">All Status</option>
                            <option value="started">Started</option>
                            <option value="complete">Complete</option>
                            <option value="terminate">Terminate</option>
                            <option value="quota">Quota</option>
                        </select>
                        <select
                            name="device_type"
                            defaultValue={filters.device_type || 'all'}
                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        >
                            <option value="all">All Devices</option>
                            <option value="Desktop">Desktop</option>
                            <option value="Mobile">Mobile</option>
                            <option value="Tablet">Tablet</option>
                        </select>
                        <button type="submit" className="px-4 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-all">
                            Filter
                        </button>
                        {(filters.ip || (filters.status && filters.status !== 'all') || (filters.device_type && filters.device_type !== 'all')) && (
                            <a href="/admin/responses" className="px-4 py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition-all flex items-center">
                                Clear
                            </a>
                        )}
                    </form>
                    <ExportResponsesButton />
                </div>
            </header>

            <AdminResponsesTable initialResponses={responses} />

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start space-x-3">
                <svg className="w-5 h-5 text-indigo-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-indigo-700 leading-relaxed">
                    <strong>Advanced Real-time Monitoring:</strong> This table updates instantly when new data arrives. High Activity badge indicates IPs with more than 3 hits today.
                </div>
            </div>

            <ResponseMaintenance />
        </div>
    )
}
