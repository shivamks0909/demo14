import { dashboardService } from '@/lib/dashboardService'
import SupplierManager from '@/components/SupplierManager'
import ExportSuppliersButton from '@/components/ExportSuppliersButton'
import PageHeader from '@/components/ui/PageHeader'
import ActionCard from '@/components/ui/ActionCard'
import { Truck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminSuppliersPage() {
    const [suppliers, projects] = await Promise.all([
        dashboardService.getSuppliers(),
        dashboardService.getProjects()
    ])

    return (
        <div className="space-y-6">
            <PageHeader
                title="Suppliers"
                description="Manage traffic suppliers and performance"
                actions={
                    <div className="flex items-center gap-3">
                        <ExportSuppliersButton suppliers={suppliers} />
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-soft border border-primary-border rounded-xl">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                            <span className="text-xs font-medium text-primary">{suppliers.length} Suppliers</span>
                        </div>
                    </div>
                }
            />

            <ActionCard
                title="Supplier Management"
                description="Configure redirect URLs and link suppliers to projects"
            >
                <SupplierManager suppliers={suppliers} projects={projects} />
            </ActionCard>
        </div>
    )
}
