import { dashboardService } from '@/lib/dashboardService'
import type { Client } from '@/lib/types'
import ClientForm from '@/components/ClientForm'
import DeleteClientButton from '@/components/DeleteClientButton'
import EditClientButton from '@/components/EditClientButton'
import ExportClientsButton from '@/components/ExportClientsButton'
import PageHeader from '@/components/ui/PageHeader'
import ActionCard from '@/components/ui/ActionCard'
import DataTable from '@/components/ui/DataTable'
import { Users, Download, Pencil, Trash2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminClientsPage() {
    const clients = (await dashboardService.getClients()) as Client[]

    return (
        <div className="space-y-6">
            <PageHeader
                title="Clients"
                description="Manage client accounts and configurations"
                actions={<ExportClientsButton clients={clients} />}
            />

            <ActionCard title="Add Client" description="Create a new client account">
                <ClientForm />
            </ActionCard>

            <ActionCard
                title="Client Directory"
                description={`${clients.length} registered clients`}
            >
                {clients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-bg-subtle flex items-center justify-center mb-4">
                            <Users className="h-6 w-6 text-text-muted" />
                        </div>
                        <p className="text-sm text-text-muted">No clients found</p>
                        <p className="text-xs text-text-muted/70 mt-1">Add your first client using the form above</p>
                    </div>
                ) : (
                    <DataTable
                        columns={[
                            {
                                key: 'name',
                                header: 'Client Name',
                                render: (client: Client) => (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary-soft border border-primary-border flex items-center justify-center">
                                            <span className="text-xs font-semibold text-primary">
                                                {client.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-text-primary">{client.name}</p>
                                            <p className="text-xs text-text-muted">
                                                Created {new Date(client.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ),
                            },
                            {
                                key: 'actions',
                                header: 'Actions',
                                render: (client: Client) => (
                                    <div className="flex items-center gap-1">
                                        <EditClientButton id={client.id} name={client.name} />
                                        <DeleteClientButton id={client.id} name={client.name} />
                                    </div>
                                ),
                            },
                        ]}
                        data={clients}
                        emptyMessage="No clients found"
                    />
                )}
            </ActionCard>
        </div>
    )
}
