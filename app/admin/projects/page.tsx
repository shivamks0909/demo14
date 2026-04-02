export const dynamic = 'force-dynamic'

import { dashboardService } from '@/lib/dashboardService'
import ProjectForm from '@/components/ProjectForm'
import ProjectList from '@/components/ProjectList'
import ResponseMaintenance from '@/components/ResponseMaintenance'

export default async function AdminProjectsPage() {
    const [projectsRaw, clientsRaw] = await Promise.all([
        dashboardService.getProjects(),
        dashboardService.getClients()
    ])
    const projects = projectsRaw ?? []
    const clients = clientsRaw ?? []

    return (
        <div className="space-y-12 pb-24 bg-slate-50/50 min-h-screen">
            <div className="relative">
                <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Project Management</h1>
                            <p className="text-slate-500 mt-2 font-medium">Configure enterprise-grade survey routes and country targeting.</p>
                        </div>
                    </div>

                    <ProjectForm clients={clients} />

                    <div className="mt-16">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Routing Inventory</h2>
                                <p className="text-sm text-slate-500 mt-1 font-medium">Manage survey routes and monitor traffic velocity.</p>
                            </div>
                            <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 flex items-center shadow-sm">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-2"></div>
                                <span className="text-[11px] font-black uppercase tracking-widest">{projects.length} Projects Active</span>
                            </div>
                        </div>

                        <ProjectList projects={projects as any[]} />
                    </div>

                    <div className="mt-24">
                        <ResponseMaintenance />
                    </div>
                </div>
            </div>
        </div>
    )
}
