export const dynamic = 'force-dynamic'

import { dashboardService } from '@/lib/dashboardService'
import ProjectForm from '@/components/ProjectForm'
import ProjectList from '@/components/ProjectList'
import ResponseMaintenance from '@/components/ResponseMaintenance'
import PageHeader from '@/components/ui/PageHeader'
import ActionCard from '@/components/ui/ActionCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { Layers, Activity } from 'lucide-react'

export default async function AdminProjectsPage() {
    const [projectsRaw, clientsRaw] = await Promise.all([
        dashboardService.getProjects(),
        dashboardService.getClients()
    ])
    const projects = projectsRaw ?? []
    const clients = clientsRaw ?? []

    const activeProjects = projects.filter((p: any) => p.status === 'active').length

    return (
        <div className="space-y-6">
            <PageHeader
                title="Projects"
                description="Configure survey routes and country targeting"
                actions={
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-success-soft border border-success-border rounded-xl">
                        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-success">{activeProjects} Active</span>
                    </div>
                }
            />

            <ActionCard title="Create Project" description="Add a new survey routing project">
                <ProjectForm clients={clients} />
            </ActionCard>

            <ActionCard
                title="Routing Inventory"
                description="Manage survey routes and monitor traffic velocity"
            >
                <ProjectList projects={projects as any[]} />
            </ActionCard>

            <ActionCard
                title="Response Maintenance"
                description="Manage and clean up survey responses"
            >
                <ResponseMaintenance />
            </ActionCard>
        </div>
    )
}
