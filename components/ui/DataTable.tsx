import { ReactNode } from 'react'

interface Column<T> {
    key: string
    header: string
    render?: (item: T) => ReactNode
    sortable?: boolean
    className?: string
}

interface DataTableProps<T> {
    columns: Column<T>[]
    data: T[]
    emptyMessage?: string
}

export default function DataTable<T extends Record<string, any>>({
    columns,
    data,
    emptyMessage = 'No data available',
}: DataTableProps<T>) {
    if (data.length === 0) {
        return (
            <div className="table-container">
                <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="w-12 h-12 rounded-2xl bg-bg-subtle flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                    </div>
                    <p className="text-sm text-text-muted">{emptyMessage}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="table-container">
            <div className="overflow-x-auto">
                <table className="table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th key={col.key} className={col.className}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item, idx) => (
                            <tr key={idx}>
                                {columns.map((col) => (
                                    <td key={col.key} className={col.className}>
                                        {col.render ? col.render(item) : item[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
