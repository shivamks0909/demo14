'use client'

import React from 'react'
import { SplineScene } from '@/components/ui/splite'
import { Spotlight } from '@/components/ui/spotlight'
import { WebGLShader } from "@/components/ui/web-gl-shader"
import { LiquidButton } from '@/components/ui/liquid-glass-button'
import { CheckCircle2, XCircle, AlertTriangle, Info, Clock } from 'lucide-react'
import { WavyBackground } from '@/components/ui/wavy-background'

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
        badge: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        pill: 'border-emerald-500 text-emerald-600',
        glow: 'from-emerald-500/10 via-transparent to-transparent',
        icon: <CheckCircle2 className="w-8 h-8 text-emerald-600" />,
        accent: '#10b981',
        label: 'Complete',
    },
    warning: {
        badge: 'bg-amber-50 text-amber-600 border-amber-100',
        pill: 'border-amber-500 text-amber-600',
        glow: 'from-amber-500/10 via-transparent to-transparent',
        icon: <AlertTriangle className="w-8 h-8 text-amber-600" />,
        accent: '#f59e0b',
        label: 'Quota Full',
    },
    error: {
        badge: 'bg-rose-50 text-rose-600 border-rose-100',
        pill: 'border-rose-500 text-rose-600',
        glow: 'from-rose-500/10 via-transparent to-transparent',
        icon: <XCircle className="w-8 h-8 text-rose-600" />,
        accent: '#f43f5e',
        label: 'Terminated',
    },
    info: {
        badge: 'bg-sky-50 text-sky-600 border-sky-100',
        pill: 'border-sky-500 text-sky-600',
        glow: 'from-sky-500/10 via-transparent to-transparent',
        icon: <Info className="w-8 h-8 text-sky-600" />,
        accent: '#0ea5e9',
        label: 'Info',
    },
    dark: {
        badge: 'bg-slate-100 text-slate-600 border-slate-200',
        pill: 'border-slate-500 text-slate-600',
        glow: 'from-slate-500/10 via-transparent to-transparent',
        icon: <Info className="w-8 h-8 text-slate-600" />,
        accent: '#64748b',
        label: 'Info',
    },
    secondary: {
        badge: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        pill: 'border-indigo-500 text-indigo-600',
        glow: 'from-indigo-500/10 via-transparent to-transparent',
        icon: <Info className="w-8 h-8 text-indigo-600" />,
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
        <div style={{ width: '100%', height: '100vh', background: '#ffffff', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden' }}>

            {/* ── Spline Robot — centered ── */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                <div style={{ width: '100%', height: '100%', transform: 'scale(0.78)', transformOrigin: 'center center' }}>
                    <SplineScene
                        scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                        className="w-full h-full"
                    />
                </div>
            </div>

            {/* ── Top gradient so title text readable ── */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '200px', background: 'linear-gradient(to bottom, rgba(255,255,255,0.75) 0%, transparent 100%)', zIndex: 2, pointerEvents: 'none' }} />

            {/* ── Title overlay (top) ── */}
            <div style={{ position: 'absolute', top: '32px', left: 0, right: 0, zIndex: 3, textAlign: 'center', pointerEvents: 'none', padding: '0 24px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', borderRadius: '999px', background: `${theme.accent}11`, border: `1px solid ${theme.accent}33`, marginBottom: '12px' }}>
                    {theme.icon}
                    <span style={{ fontSize: '11px', fontWeight: 800, color: theme.accent, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{theme.label}</span>
                </div>
                <h1 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 900, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.03em' }}>
                    {title}
                </h1>
                <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6 }}>
                    {description}
                </p>
                {redirectUrl && (
                    <p style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                        Redirecting in {countdown}s…
                    </p>
                )}
            </div>

            {/* ── Bottom gradient so table floats nicely ── */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '220px', background: 'linear-gradient(to top, rgba(255,255,255,0.85) 0%, transparent 100%)', zIndex: 2, pointerEvents: 'none' }} />

            {/* ── Response Record Table — pinned to bottom ── */}
            <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 48px)', maxWidth: '860px', zIndex: 4 }}>
                <div style={{ borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden', background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)' }}>

                    {/* Header row */}
                    <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Response Record</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '9px', color: theme.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.accent, boxShadow: `0 0 8px ${theme.accent}`, display: 'inline-block' }} />
                            {theme.label}
                        </div>
                    </div>

                    {/* Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                {['Project ID', 'User ID', 'IP Address', 'Status'].map(h => (
                                    <th key={h} style={{ padding: '8px 20px', textAlign: 'left', fontSize: '9px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.14em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ padding: '11px 20px', fontSize: '12px', fontFamily: 'monospace', color: '#475569' }}>{code}</td>
                                <td style={{ padding: '11px 20px', fontSize: '12px', fontFamily: 'monospace', color: '#475569' }}>{uid}</td>
                                <td style={{ padding: '11px 20px', fontSize: '12px', fontFamily: 'monospace', color: '#94a3b8' }}>{ip}</td>
                                <td style={{ padding: '11px 20px' }}>
                                    <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: '8px', border: `1px solid ${theme.accent}44`, fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: theme.accent, background: `${theme.accent}08` }}>
                                        {status}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Debug panel */}
                {(sessionToken || responseId) && typeof window !== 'undefined' && window.location.search.includes('debug=true') && (
                    <div style={{ marginTop: '8px', padding: '12px 16px', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '9px', fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>Admin Debug</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div><span style={{ color: '#94a3b8' }}>PID: </span>{code}</div>
                            {sessionToken && <div><span style={{ color: '#94a3b8' }}>SESSION: </span>{sessionToken}</div>}
                            {responseId && <div><span style={{ color: '#94a3b8' }}>RES_ID: </span>{responseId}</div>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
