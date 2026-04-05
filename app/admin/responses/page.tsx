import { dashboardService } from '@/lib/dashboardService'
import ExportResponsesButton from '@/components/ExportResponsesButton'
import ResponseMaintenance from '@/components/ResponseMaintenance'
import AdminResponsesTable from '@/components/AdminResponsesTable'
import PageHeader from '@/components/ui/PageHeader'
import ActionCard from '@/components/ui/ActionCard'
import { BarChart3, Filter, X } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminResponsesPage({
    searchParams,
}: {
    searchParams: Promise<{ ip?: string; status?: string; device_type?: string; date_from?: string; date_to?: string; project_id?: string }>
}) {
    const filters = await searchParams
    const responses = await dashboardService.getResponses(filters)
    const projects = await dashboardService.getProjects()

    const hasActiveFilters = filters.ip || (filters.status && filters.status !== 'all') ||
        (filters.device_type && filters.device_type !== 'all') || filters.project_id ||
        filters.date_from || filters.date_to

    return (
        <div className="space-y-6">
            <PageHeader
                title="Responses"
                description="View and analyze survey response data"
                actions={<ExportResponsesButton />}
            />

            {/* Filter Bar */}
            <ActionCard title="Filters" description="Narrow down response logs">
                <form>
                    <div className="flex flex-wrap gap-2 items-end">
                        <div className="flex-1 min-w-[120px]">
                            <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">IP Address</label>
                            <input
                                type="text"
                                name="ip"
                                placeholder="Filter IP..."
                                defaultValue={filters.ip}
                                className="input-field w-full"
                            />
                        </div>
                        <div className="w-32">
                            <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">Status</label>
                            <select
                                name="status"
                                defaultValue={filters.status || 'all'}
                                className="input-field w-full"
                            >
                                <option value="all">All Status</option>
                                <option value="started">Started</option>
                                <option value="complete">Complete</option>
                                <option value="terminate">Terminate</option>
                                <option value="quota">Quota</option>
                            </select>
                        </div>
                        <div className="w-32">
                            <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">Device</label>
                            <select
                                name="device_type"
                                defaultValue={filters.device_type || 'all'}
                                className="input-field w-full"
                            >
                                <option value="all">All Devices</option>
                                <option value="Desktop">Desktop</option>
                                <option value="Mobile">Mobile</option>
                                <option value="Tablet">Tablet</option>
                            </select>
                        </div>
                        <div className="w-36">
                            <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">Project</label>
                            <select
                                name="project_id"
                                defaultValue={filters.project_id || ''}
                                className="input-field w-full"
                            >
                                <option value="">All Projects</option>
                                {projects.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.project_code}</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-32">
                            <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">From</label>
                            <input
                                type="date"
                                name="date_from"
                                defaultValue={filters.date_from}
                                className="input-field w-full"
                            />
                        </div>
                        <div className="w-32">
                            <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">To</label>
                            <input
                                type="date"
                                name="date_to"
                                defaultValue={filters.date_to}
                                className="input-field w-full"
                            />
                        </div>
                        <button type="submit" className="btn-primary flex items-center gap-1.5">
                            <Filter className="h-3.5 w-3.5" />
                            Filter
                        </button>
                        {hasActiveFilters && (
                            <a href="/admin/responses" className="btn-ghost flex items-center gap-1.5">
                                <X className="h-3.5 w-3.5" />
                                Clear
                            </a>
                        )}
                    </div>
                </form>
            </ActionCard>

            {/* Response Table */}
            <AdminResponsesTable initialResponses={responses} />

            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-info-soft border border-info-border rounded-2xl">
                <svg className="w-5 h-5 text-info mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-info leading-relaxed">
                    <strong>Real-time Monitoring:</strong> This table updates instantly when new data arrives. High Activity badge indicates IPs with more than 3 hits today.
                </div>
            </div>

            {/* Response Maintenance */}
            <ActionCard
                title="Response Maintenance"
                description="Manage and clean up survey responses"
            >
                <ResponseMaintenance />
            </ActionCard>
        </div>
    )
}
