export default function LiveActivityFeed({ responses }: { responses: any[] }) {
    return (
        <div className="bg-white shadow rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Live Activity</h3>
                <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-white">
                        <tr>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">UID</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Project</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Time</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                        {responses.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-xs text-gray-400 italic">
                                    Waiting for incoming traffic...
                                </td>
                            </tr>
                        ) : (
                            responses.slice(0, 10).map((r) => (
                                <tr key={r.id} className="hover:bg-slate-50/30 transition-colors">
                                    <td className="px-6 py-3 whitespace-nowrap">
                                        <div className="text-[11px] font-mono text-gray-600 truncate max-w-[80px]" title={r.uid || 'N/A'}>
                                            {r.uid || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 whitespace-nowrap">
                                        <span className="text-[11px] font-bold text-gray-900">{r.project_code}</span>
                                    </td>
                                    <td className="px-6 py-3 whitespace-nowrap text-center">
                                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${r.status === 'started' ? 'bg-indigo-50 text-indigo-600' :
                                            r.status === 'complete' ? 'bg-emerald-50 text-emerald-600' :
                                                r.status === 'terminate' ? 'bg-rose-50 text-rose-600' :
                                                    'bg-gray-100 text-gray-500'
                                            }`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 whitespace-nowrap text-right">
                                        <span className="text-[10px] text-gray-400">
                                            {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <div className="px-6 py-3 bg-gray-50/30 border-t border-gray-50 text-center">
                <a href="/admin/responses" className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:text-indigo-800">
                    View Full Logs &rarr;
                </a>
            </div>
        </div>
    );
}
