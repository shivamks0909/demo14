import { Suspense } from 'react'
import { dashboardService } from '@/lib/dashboardService'
import DashboardStats from '@/components/DashboardStats'
import TrafficChart from '@/components/TrafficChart'
import DashboardFilters from '@/components/DashboardFilters'
import RedirectCenter from '@/components/RedirectCenter'
import LiveActivityFeed from '@/components/LiveActivityFeed'
import RedirectShortcut from '@/components/RedirectShortcut'
import AutoRefresh from '@/components/AutoRefresh'
import MetricCard from '@/components/ui/MetricCard'
import ActionCard from '@/components/ui/ActionCard'
import StatusBadge from '@/components/ui/StatusBadge'
import {
    MousePointerClick,
    CheckCircle2,
    Clock,
    TrendingUp,
    AlertTriangle,
    Copy,
    Shield,
    FolderKanban,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard({
    searchParams,
}: {
    searchParams: Promise<{ clientId?: string }>
}) {
    const { clientId } = await searchParams
    const [kpis, healthMetrics, responses, clients, projects] = await Promise.all([
        dashboardService.getKPIs(),
        dashboardService.getProjectHealthMetrics(),
        dashboardService.getResponses(),
        dashboardService.getClients(),
        dashboardService.getProjects()
    ])

    const conversionRate = kpis?.clicks_today > 0
        ? ((kpis.completes_today / kpis.clicks_today) * 100).toFixed(1)
        : '0'

    return (
        <div className="space-y-6">
            <AutoRefresh interval={5000} />

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
                <MetricCard
                    title="Clicks"
                    value={kpis?.total_clicks_today || kpis?.clicks_today || 0}
                    icon={<MousePointerClick className="h-4 w-4" />}
                    color="primary"
                    delay={0}
                />
                <MetricCard
                    title="Completes"
                    value={kpis?.total_completes_today || kpis?.completes_today || 0}
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    color="success"
                    delay={0.05}
                />
                <MetricCard
                    title="In Progress"
                    value={kpis?.in_progress_today || 0}
                    icon={<Clock className="h-4 w-4" />}
                    color="info"
                    delay={0.1}
                />
                <MetricCard
                    title="Conversion"
                    value={`${conversionRate}%`}
                    icon={<TrendingUp className="h-4 w-4" />}
                    color="warning"
                    delay={0.15}
                />
                <MetricCard
                    title="Quota Full"
                    value={kpis?.quotafull_today || 0}
                    icon={<AlertTriangle className="h-4 w-4" />}
                    color="warning"
                    delay={0.2}
                />
                <MetricCard
                    title="Duplicates"
                    value={kpis?.duplicates_today || 0}
                    icon={<Copy className="h-4 w-4" />}
                    color="error"
                    delay={0.25}
                />
                <MetricCard
                    title="Security"
                    value={kpis?.security_terminates_today || 0}
                    icon={<Shield className="h-4 w-4" />}
                    color="neutral"
                    delay={0.3}
                />
                <MetricCard
                    title="Projects"
                    value={kpis?.active_projects || 0}
                    icon={<FolderKanban className="h-4 w-4" />}
                    color="primary"
                    delay={0.35}
                />
            </div>

            {/* Filters */}
            <Suspense fallback={<div className="h-12 bg-bg-subtle rounded-2xl animate-pulse" />}>
                <DashboardFilters clients={clients} />
            </Suspense>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column - Chart & Table */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Traffic Chart */}
                    <ActionCard
                        title="Traffic Overview"
                        description="Response volume over time"
                    >
                        <TrafficChart />
                    </ActionCard>

                    {/* Project Performance Table */}
                    <ActionCard
                        title="Project Performance"
                        description="Real-time health metrics"
                        action={
                            <button className="btn-ghost text-xs">
                                View All
                                <ArrowUpRight className="h-3 w-3" />
                            </button>
                        }
                    >
                        {healthMetrics.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-10 h-10 rounded-xl bg-bg-subtle flex items-center justify-center mb-3">
                                    <TrendingUp className="h-5 w-5 text-text-muted" />
                                </div>
                                <p className="text-sm text-text-muted">No project activity yet</p>
                                <p className="text-xs text-text-muted/70 mt-1">Projects will appear here once traffic starts flowing</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto -mx-5">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Project</th>
                                            <th className="text-center">Clicks</th>
                                            <th className="text-center">Active</th>
                                            <th className="text-center">Completes</th>
                                            <th>Conversion</th>
                                            <th className="text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {healthMetrics.slice(0, 8).map((m: any, idx: number) => {
                                            const rate = m.conversion_rate || 0
                                            const status = rate > 15 ? 'active' : rate > 5 ? 'running' : 'paused'
                                            return (
                                                <tr key={m.project_id}>
                                                    <td>
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-lg bg-bg-subtle flex items-center justify-center text-[10px] font-semibold text-text-muted">
                                                                {idx + 1}
                                                            </div>
                                                            <span className="text-sm font-medium text-text-primary">{m.project_code}</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center font-mono text-sm">{m.clicks_today}</td>
                                                    <td className="text-center font-mono text-sm text-info">{m.in_progress_today}</td>
                                                    <td className="text-center font-mono text-sm text-success">{m.completes_today}</td>
                                                    <td>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 w-20 h-1.5 bg-bg-subtle rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                                        rate > 15 ? 'bg-success' :
                                                                        rate > 5 ? 'bg-info' : 'bg-warning'
                                                                    }`}
                                                                    style={{ width: `${Math.min(rate, 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-medium text-text-secondary w-8">{Math.round(rate)}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-right">
                                                        <StatusBadge status={status} />
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </ActionCard>
                </div>

                {/* Right Column - Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Redirect Shortcut */}
                    <RedirectShortcut />

                    {/* Live Activity Feed */}
                    <ActionCard
                        title="Live Activity"
                        description="Recent survey responses"
                    >
                        <LiveActivityFeed responses={responses} />
                    </ActionCard>
                </div>
            </div>

            {/* Redirect Center */}
            <ActionCard
                title="Redirect Registry"
                description="Manage survey redirect URLs and postback configurations"
            >
                <RedirectCenter projects={projects} />
            </ActionCard>
        </div>
    )
}
