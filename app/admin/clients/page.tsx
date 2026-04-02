import { dashboardService } from '@/lib/dashboardService'
import type { Client } from '@/lib/types'
import ClientForm from '@/components/ClientForm'
import DeleteClientButton from '@/components/DeleteClientButton'

export const dynamic = 'force-dynamic'

export default async function AdminClientsPage() {
    const clients = (await dashboardService.getClients()) as Client[]

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-semibold text-gray-900">Client Management</h1>
            </div>

            <ClientForm />

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Active Clients</h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">List of all clients in the system.</p>
                    </div>
                    <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {clients.length} Total
                    </span>
                </div>
                <div className="border-t border-gray-200">
                    {clients.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No clients found. Add your first client above.
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {clients.map((client) => (
                                <li key={client.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <p className="text-sm font-semibold text-indigo-600 truncate">{client.name}</p>
                                            <p className="text-xs text-gray-400">Created: {new Date(client.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <div className="ml-2 flex-shrink-0 flex gap-4">
                                            <button className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">Edit</button>
                                            <DeleteClientButton id={client.id} name={client.name} />
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}
