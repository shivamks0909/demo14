'use client'

import React from 'react'
import { SplineScene } from '@/components/ui/splite'
import { Spotlight } from '@/components/ui/spotlight'
import { CheckCircle2, XCircle, AlertTriangle, Info, Clock } from 'lucide-react'

interface LandingResultLayoutProps {
    title: string
    description: string
    type: 'success' | 'warning' | 'error' | 'info' | 'dark' | 'secondary'
    uid?: string
    code?: string
    status?: string
    ip?: string
    sessionToken?: string
    responseId?: string
    redirectUrl?: string
    redirectDelay?: number
}

/* ── Theme config per status type ──────────────────────────── */
const THEMES = {
    success: {
        badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        pill: 'border-emerald-500 text-emerald-600',
        glow: 'from-emerald-500/20 via-transparent to-transparent',
        icon: <CheckCircle2 className="w-8 h-8 text-emerald-400" />,
        accent: '#10b981',
        label: 'Complete',
    },
    warning: {
        badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        pill: 'border-amber-500 text-amber-600',
        glow: 'from-amber-500/20 via-transparent to-transparent',
        icon: <AlertTriangle className="w-8 h-8 text-amber-400" />,
        accent: '#f59e0b',
        label: 'Quota Full',
    },
    error: {
        badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        pill: 'border-rose-500 text-rose-600',
        glow: 'from-rose-500/20 via-transparent to-transparent',
        icon: <XCircle className="w-8 h-8 text-rose-400" />,
        accent: '#f43f5e',
        label: 'Terminated',
    },
    info: {
        badge: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
        pill: 'border-sky-500 text-sky-600',
        glow: 'from-sky-500/20 via-transparent to-transparent',
        icon: <Info className="w-8 h-8 text-sky-400" />,
        accent: '#0ea5e9',
        label: 'Info',
    },
    dark: {
        badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        pill: 'border-slate-500 text-slate-600',
        glow: 'from-slate-500/20 via-transparent to-transparent',
        icon: <Info className="w-8 h-8 text-slate-400" />,
        accent: '#64748b',
        label: 'Info',
    },
    secondary: {
        badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
        pill: 'border-indigo-500 text-indigo-600',
        glow: 'from-indigo-500/20 via-transparent to-transparent',
        icon: <Info className="w-8 h-8 text-indigo-400" />,
        accent: '#6366f1',
        label: 'Info',
    },
} as const

/* ── Badge helper (for table) ──────────────────────────────── */
const getTableBadge = (s: string) => {
    const sl = s.toLowerCase()
    if (sl.includes('complete')) return 'border-emerald-500 text-emerald-600 bg-emerald-50'
    if (sl.includes('terminat')) return 'border-rose-500 text-rose-600 bg-rose-50'
    if (sl.includes('quota')) return 'border-amber-500 text-amber-600 bg-amber-50'
    if (sl.includes('duplicate')) return 'border-indigo-500 text-indigo-600 bg-indigo-50'
    if (sl.includes('security')) return 'border-slate-800 text-slate-800 bg-slate-50'
    if (sl.includes('pause')) return 'border-slate-500 text-slate-500 bg-slate-50'
    return 'border-slate-400 text-slate-400 bg-slate-50'
}

export default function LandingResultLayout({
    title,
    description,
    type,
    uid = 'N/A',
    code = 'N/A',
    status = 'N/A',
    ip = 'N/A',
    sessionToken,
    responseId,
    redirectUrl,
    redirectDelay = 3000,
}: LandingResultLayoutProps) {
    const [countdown, setCountdown] = React.useState(redirectDelay / 1000)
    const theme = THEMES[type] ?? THEMES.info

    React.useEffect(() => {
        if (!redirectUrl) return
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    window.location.href = redirectUrl!
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [redirectUrl])

    return (
        <div className="min-h-screen bg-bg-alt font-sans text-text-dark overflow-x-hidden">



            {/* ── Main: 3D Robot + Text ──────────────────────── */}
            <div className="relative min-h-[90vh] flex items-center overflow-hidden bg-white">
                {/* Subtle light gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-alt via-transparent to-transparent pointer-events-none z-10" />

                {/* Spotlight effect */}
                <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

                <div className="relative z-20 max-w-6xl mx-auto px-6 w-full flex flex-col md:flex-row items-center gap-8 md:gap-0 py-12">

                    {/* Left: copy */}
                    <div className="flex-1 space-y-6 text-center md:text-left">
                        {/* Icon + type label */}
                        <div className="inline-flex items-center gap-3">
                            <div className={`p-2 rounded-xl border ${theme.badge}`}>
                                {theme.icon}
                            </div>
                            <span className={`text-xs font-black uppercase tracking-widest border-b ${theme.pill.split(' ')[0]} ${theme.pill.split(' ')[1]}`}>
                                Survey {theme.label}
                            </span>
                        </div>

                        {/* Big title */}
                        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none text-text-dark">
                            {title}
                        </h1>
                        <p className="text-text-body text-lg md:text-xl font-medium max-w-md mx-auto md:mx-0 leading-relaxed">
                            {description}
                        </p>

                        {/* Proceed button / redirect */}
                        {redirectUrl ? (
                            <a
                                href={redirectUrl}
                                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-[#0a0a0f] font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform active:scale-95"
                            >
                                Proceed Now →
                            </a>
                        ) : (
                            <a
                                href="https://opinioninsights.in/"
                                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border border-border-base bg-white text-text-dark font-bold text-sm uppercase tracking-widest hover:bg-bg-alt transition-colors shadow-sm"
                            >
                                Back to Home
                            </a>
                        )}

                        {/* Metadata pills */}
                        <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-2">
                            {[
                                ['Project', code],
                                ['User', uid],
                                ['IP', ip],
                            ].map(([label, val]) => (
                                <div key={label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-alt border border-border-base text-[10px] font-mono">
                                    <span className="text-text-muted uppercase tracking-widest">{label}</span>
                                    <span className="text-text-body">{val}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Spline 3D robot */}
                    <div className="flex-1 relative h-[420px] md:h-[560px] w-full">
                        <SplineScene
                            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                            className="w-full h-full"
                        />
                    </div>
                </div>
            </div>

            {/* ── Data table ─────────────────────────────────── */}
            <div className="max-w-6xl mx-auto px-6 pb-16">
                <div className="rounded-2xl border border-border-base overflow-hidden bg-white shadow-bento">
                    <div className="px-6 py-4 border-b border-border-base flex items-center justify-between">
                        <span className="text-[11px] font-black text-text-muted uppercase tracking-widest">Response Record</span>
                        <div className={`w-2 h-2 rounded-full animate-pulse`} style={{ background: theme.accent }} />
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5">
                                {['Project ID', 'User ID', 'IP Address', 'Status'].map(h => (
                                    <th key={h} className="px-6 py-3 text-[10px] font-black text-text-muted uppercase tracking-widest">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="hover:bg-bg-alt transition-colors">
                                <td className="px-6 py-4 text-sm font-mono text-text-body">{code}</td>
                                <td className="px-6 py-4 text-sm font-mono text-text-body">{uid}</td>
                                <td className="px-6 py-4 text-sm font-mono text-text-muted">{ip}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-block px-3 py-1 rounded-md border text-[10px] font-black uppercase tracking-wider ${getTableBadge(status)}`}>
                                        {status}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Debug panel */}
                {(sessionToken || responseId) && typeof window !== 'undefined' && window.location.search.includes('debug=true') && (
                    <div className="mt-6 p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-left w-full max-w-md">
                        <h4 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-3 border-b border-white/10 pb-2">Admin Debug Mode</h4>
                        <div className="space-y-2 font-mono text-[9px]">
                            <div className="flex justify-between"><span className="text-white/40">PID</span> <span className="text-white">{code}</span></div>
                            {sessionToken && <div className="flex justify-between"><span className="text-white/40">SESSION</span> <span className="text-white truncate ml-4">{sessionToken}</span></div>}
                            {responseId && <div className="flex justify-between"><span className="text-white/40">RES_ID</span> <span className="text-white truncate ml-4">{responseId}</span></div>}
                            <div className="flex justify-between"><span className="text-white/40">STATUS</span> <span className="text-white">{status}</span></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="border-t border-border-base py-6 text-center">
                <p className="text-[10px] text-text-muted font-medium uppercase tracking-[0.3em]">
                    Copyright © {new Date().getFullYear()} Opinion Insights Research Division. All rights reserved.
                </p>
            </div>
        </div>
    )
}
