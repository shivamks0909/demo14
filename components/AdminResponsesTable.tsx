'use client'

import { useState, useEffect } from 'react'

interface Response {
    id: string
    supplier_uid?: string
    client_uid_sent?: string
    uid: string // legacy compat
    supplier_token?: string
    project_code: string
    project_name: string
    ip: string
    geo_country?: string
    device_type: string
    user_agent: string
    status: string
    created_at: string
}

export default function AdminResponsesTable({ initialResponses }: { initialResponses: Response[] }) {
    const [responses, setResponses] = useState<Response[]>(initialResponses)
    const [isLive, setIsLive] = useState(false)

    useEffect(() => {
        // Realtime updates disabled for local database
        // You can manually refresh the page to see new responses
        return () => {}
    }, [])


    // IP Activity Logic for badges
    const today = new Date().toDateString()
    const ipCountsToday = responses.reduce((acc: Record<string, number>, r) => {
        const isToday = new Date(r.created_at).toDateString() === today
        if (isToday && r.ip) {
            acc[r.ip] = (acc[r.ip] || 0) + 1
        }
        return acc
    }, {})

    return (
        <div className="bg-white shadow rounded-2xl border border-gray-100 overflow-hidden relative">
            {/* Live Indicator Overlay */}
            <div className="absolute top-2 right-6 z-10 flex items-center space-x-2">
                <span className={`h-2 w-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    {isLive ? 'Live Sync' : 'Connecting...'}
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest text-pretty">Supplier UID (Incoming)</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-violet-400 uppercase tracking-widest text-pretty">Supplier</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest text-pretty">Client UID Sent</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest text-pretty">Project</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest text-pretty">IP Address</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest text-pretty">Device</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest text-pretty">User Agent</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest text-pretty">Status</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest text-pretty">Timestamp</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {responses.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                                    No tracking data matching filters.
                                </td>
                            </tr>
                        ) : (
                            responses.map((r) => {
                                const isHighActivity = r.ip && ipCountsToday[r.ip] > 3;
                                const isPidGenerated = r.supplier_uid && r.client_uid_sent && r.supplier_uid !== r.client_uid_sent;
                                return (
                                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-xs font-mono text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                                {r.supplier_uid || r.uid || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {(r as any).supplier_token ? (
                                                <span className="text-[10px] font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100 uppercase tracking-wider">
                                                    {(r as any).supplier_name || (r as any).supplier_token}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col space-y-1">
                                                <span className={`text-xs font-bold leading-none ${isPidGenerated ? 'text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded' : 'text-slate-600'}`}>
                                                    {r.client_uid_sent || r.supplier_token || r.uid || 'N/A'}
                                                </span>
                                                {isPidGenerated && (
                                                    <span className="text-[8px] font-black uppercase text-indigo-500 tracking-tighter">PID Generated</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-900">{r.project_name}</span>
                                                <span className="text-[10px] text-gray-400 font-medium">{r.project_code}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap lowercase">
                                            <div className="flex flex-col space-y-1">
                                                <div className="flex items-center space-x-1">
                                                    <span className="text-[11px] text-gray-500 font-mono">{r.ip}</span>
                                                    {r.geo_country && (
                                                        <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1 rounded">{r.geo_country}</span>
                                                    )}
                                                </div>
                                                {isHighActivity && (
                                                    <span className="text-[8px] font-black uppercase text-rose-600 bg-rose-50 px-1 py-0.5 rounded w-fit border border-rose-100">
                                                        High Activity
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.device_type === 'Mobile' ? 'bg-orange-50 text-orange-600' :
                                                r.device_type === 'Tablet' ? 'bg-blue-50 text-blue-600' :
                                                    'bg-slate-50 text-slate-600'
                                                }`}>
                                                {r.device_type || 'Desktop'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className="text-[10px] text-gray-400 line-clamp-1 max-w-[150px] cursor-help"
                                                title={r.user_agent}
                                            >
                                                {(r.user_agent || 'Unknown').substring(0, 80)}
                                                {(r.user_agent?.length || 0) > 80 ? '...' : ''}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${r.status === 'started' ? 'bg-indigo-50 text-indigo-600' :
                                                r.status === 'complete' ? 'bg-emerald-50 text-emerald-600' :
                                                    r.status === 'terminate' ? 'bg-rose-50 text-rose-600' :
                                                        r.status === 'terminated' ? 'bg-rose-50 text-rose-600' :
                                                            r.status === 'quota' ? 'bg-rose-50 text-rose-600' :
                                                                r.status === 'quota_full' ? 'bg-rose-50 text-rose-600' :
                                                                    r.status === 'security_terminate' ? 'bg-red-600 text-white' :
                                                                        'bg-gray-100 text-gray-500'
                                                }`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-medium" suppressHydrationWarning>
                                            {new Date(r.created_at).toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
