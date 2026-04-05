import { dashboardService } from '@/lib/dashboardService'
import RedirectCenter from '@/components/RedirectCenter'
import PageHeader from '@/components/ui/PageHeader'
import ActionCard from '@/components/ui/ActionCard'
import { Link2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminRedirectsPage() {
    const projects = await dashboardService.getProjects()

    return (
        <div className="space-y-6">
            <PageHeader
                title="Redirects"
                description="Configure survey redirect URLs and postback configurations"
            />

            <ActionCard
                title="Redirect Registry"
                description="Unified routing links for all active projects"
            >
                <RedirectCenter projects={projects} />
            </ActionCard>
        </div>
    )
}
