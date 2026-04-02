'use client'

import { motion } from 'framer-motion'

export default function DashboardStats({ stats }: { stats: any }) {
    if (!stats) return null;

    const cards = [
        {
            name: 'Total Clicks',
            value: stats.total_clicks_today || stats.clicks_today || 0,
            icon: (
                <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            ),
            color: 'indigo',
            label: 'Total entries today'
        },
        {
            name: 'Completes',
            value: stats.total_completes_today || stats.completes_today || 0,
            icon: (
                <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: 'emerald',
            label: 'Successful conversions'
        },
        {
            name: 'In Progress',
            value: stats.in_progress_today || 0,
            icon: (
                <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: 'blue',
            label: 'Active survey sessions'
        },
        {
            name: 'Conversion',
            value: stats.clicks_today > 0
                ? `${((stats.completes_today / stats.clicks_today) * 100).toFixed(1)}%`
                : '0%',
            icon: (
                <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
            ),
            color: 'amber',
            label: 'Success rate index'
        },
        {
            name: 'Quota Full',
            value: stats.quotafull_today || 0,
            icon: (
                <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
            color: 'purple',
            label: 'Full quota redirects'
        },
        {
            name: 'Duplicates',
            value: stats.duplicates_today || 0,
            icon: (
                <svg className="h-5 w-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
            ),
            color: 'rose',
            label: 'Fraud attempts blocked'
        },
        {
            name: 'Security',
            value: stats.security_terminates_today || 0,
            icon: (
                <svg className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            ),
            color: 'slate',
            label: 'Abuse/Bot detection'
        },
        {
            name: 'Projects',
            value: stats.active_projects || 0,
            icon: (
                <svg className="h-5 w-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            ),
            color: 'cyan',
            label: `Live out of ${stats.total_projects || 0}`
        }
    ];

    const colorMap: Record<string, string> = {
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100',
        rose: 'bg-rose-50 text-rose-600 border-rose-100',
        slate: 'bg-slate-50 text-slate-600 border-slate-100',
        cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100'
    };

    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4 xxl:grid-cols-8">
            {cards.map((card, idx) => (
                <motion.div
                    key={card.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group relative bg-white backdrop-blur-xl border border-slate-100 rounded-[1.5rem] p-5 shadow-sm shadow-slate-100/50 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-100 transition-all duration-300"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className={`p-2.5 rounded-xl border ${colorMap[card.color]} transition-transform duration-500 group-hover:rotate-[10deg] group-hover:scale-110`}>
                            {card.icon}
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-300 group-hover:text-slate-500 transition-colors">
                            {card.name.split(' ')[0]}
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        <div className="text-2xl font-black text-slate-900 tracking-tight">
                            {card.value}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                            {card.name}
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                        <p className="text-[10px] text-slate-400 font-medium italic truncate pr-2">
                            {card.label}
                        </p>
                        <div className={`w-1.5 h-1.5 rounded-full ${card.color === 'rose' || card.color === 'slate' ? 'bg-slate-200' : 'bg-emerald-400 animate-pulse'}`}></div>
                    </div>
                </motion.div>
            ))}
        </div>
    )
}
