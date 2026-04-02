import { Suspense } from 'react'
import { dashboardService } from '@/lib/dashboardService'
import DashboardStats from '@/components/DashboardStats'
import TrafficChart from '@/components/TrafficChart'
import DashboardFilters from '@/components/DashboardFilters'
import RedirectCenter from '@/components/RedirectCenter'
import LiveActivityFeed from '@/components/LiveActivityFeed'
import RedirectShortcut from '@/components/RedirectShortcut'
import AutoRefresh from '@/components/AutoRefresh'
import { FadeIn, StaggerContainer } from '@/components/Animations'

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

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-700">
            <AutoRefresh interval={5000} />
            
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/60 pb-6 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-inter flex items-center gap-3">
                        <span className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </span>
                        Intelligence Command
                    </h1>
                    <p className="text-slate-500 font-medium font-inter mt-1.5 flex items-center gap-2">
                        Nexus Monitoring Core v2.0
                        <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
                        {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center space-x-3 bg-white/70 backdrop-blur-md px-4 py-2 rounded-2xl border border-emerald-100 shadow-sm shadow-emerald-50">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                        Node Synchronized
                    </span>
                </div>
            </header>

            <FadeIn delay={0.1}>
                <DashboardStats stats={kpis} />
            </FadeIn>

            <div className="mt-10">
                <FadeIn delay={0.2} direction="right">
                    <Suspense fallback={<div className="h-16 bg-slate-100 animate-pulse rounded-2xl" />}>
                        <DashboardFilters clients={clients} />
                    </Suspense>
                </FadeIn>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
                <div className="lg:col-span-9 space-y-8">
                    <FadeIn delay={0.3}>
                        <TrafficChart />
                    </FadeIn>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-l-4 border-indigo-500 pl-4 py-1">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Project Performance</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Real-time health telemetry</p>
                            </div>
                            <button className="text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:text-indigo-700 transition-colors">
                                View Full Analytics →
                            </button>
                        </div>

                        <FadeIn delay={0.4}>
                            <div className="bg-white/80 backdrop-blur-sm shadow-xl shadow-slate-200/40 rounded-[2rem] border border-slate-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-100">
                                        <thead>
                                            <tr className="bg-slate-50/50">
                                                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Source Code</th>
                                                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-widest">Entry Volume</th>
                                                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-widest">Live Subs</th>
                                                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-widest">Conversions</th>
                                                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Success Index</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 bg-white">
                                            {healthMetrics.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-8 py-12 text-center text-sm text-slate-400 italic">Targeting zero activity vectors...</td>
                                                </tr>
                                            ) : (
                                                healthMetrics.slice(0, 5).map((m: any, idx: number) => (
                                                    <tr key={m.project_id} className="hover:bg-indigo-50/20 transition-all cursor-default">
                                                        <td className="px-8 py-5 whitespace-nowrap">
                                                            <div className="flex items-center gap-3">
                                                                <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                                                                    0{idx + 1}
                                                                </span>
                                                                <span className="text-sm font-bold text-slate-900 tracking-tight">{m.project_code}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5 whitespace-nowrap text-center text-sm text-slate-600 font-mono font-bold">{m.clicks_today}</td>
                                                        <td className="px-6 py-5 whitespace-nowrap text-center text-sm text-indigo-600 font-black font-mono">{m.in_progress_today}</td>
                                                        <td className="px-6 py-5 whitespace-nowrap text-center text-sm text-emerald-600 font-black font-mono">{m.completes_today}</td>
                                                        <td className="px-8 py-5 whitespace-nowrap">
                                                            <div className="flex items-center space-x-4">
                                                                <div className="flex-1 w-28 bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                                                                    <div
                                                                        className={`h-full transition-all duration-[1.5s] ease-out shadow-sm ${m.conversion_rate > 15 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                                                                            m.conversion_rate > 5 ? 'bg-gradient-to-r from-indigo-400 to-indigo-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'
                                                                            }`}
                                                                        style={{ width: `${Math.min(m.conversion_rate || 0, 100)}%` }}
                                                                    ></div>
                                                                </div>
                                                                <span className="text-xs font-black text-slate-700 w-10">{Math.round(m.conversion_rate || 0)}%</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </FadeIn>
                    </div>
                </div>

                <aside className="lg:col-span-3 space-y-8">
                    <FadeIn delay={0.5} direction="left">
                        <RedirectShortcut />
                    </FadeIn>
                    <FadeIn delay={0.6} direction="left">
                        <LiveActivityFeed responses={responses} />
                    </FadeIn>
                </aside>
            </div>

            <FadeIn delay={0.7} direction="up">
                <div id="redirect-center" className="pt-12 transition-all duration-500 scroll-mt-6">
                    <div className="flex items-center gap-4 mb-8">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Registry Terminal</h2>
                        <div className="h-px flex-1 bg-slate-200/60"></div>
                    </div>
                    <RedirectCenter projects={projects} />
                </div>
            </FadeIn>
        </div>
    )
}
