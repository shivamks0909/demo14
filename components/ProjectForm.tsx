'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createProjectAction } from '@/app/actions'
import { Client } from '@/lib/types'
import { ChevronDown, Plus, Trash2, Link as LinkIcon, AlertCircle, Save, Zap, MousePointerClick } from 'lucide-react'

// ── Smart URL Parameter Mapper ────────────────────────────────────────────
function SmartUrlMapper({ onApply }: { onApply: (baseUrl: string, uidParam: string, pidParam: string | null) => void }) {
    const [rawUrl, setRawUrl] = useState('')
    const [parsed, setParsed] = useState<{ key: string; value: string }[]>([])
    const [selectedParam, setSelectedParam] = useState<string | null>(null)
    const [parseError, setParseError] = useState('')

    const parseUrl = (url: string) => {
        setParseError('')
        setSelectedParam(null)
        if (!url.trim()) { setParsed([]); return }
        try {
            const u = new URL(url)
            const params = Array.from(u.searchParams.entries()).map(([key, value]) => ({ key, value }))
            if (params.length === 0) setParseError('No query parameters found in this URL.')
            setParsed(params)
        } catch {
            setParseError('Invalid URL — please include https:// and full address.')
            setParsed([])
        }
    }

    const applyMapping = () => {
        if (!selectedParam || !rawUrl) return
        try {
            const u = new URL(rawUrl)
            // Replace the selected param's value with the [UID] placeholder for cleanliness
            u.searchParams.set(selectedParam, '[UID]')

            // Auto-detect PID parameter if present in the URL
            const pidPatterns = ['pid', 'id', 'rid', 'gid', 'sid', 'vid', 'cid']
            const detectedPidParam = parsed.find(p =>
                pidPatterns.includes(p.key.toLowerCase()) && p.key !== selectedParam
            )

            onApply(u.toString(), selectedParam, detectedPidParam?.key || null)
        } catch {}
    }

    return (
        <div className="space-y-4 p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl">
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Smart URL Mapper</p>
                    <p className="text-[9px] text-amber-600">Paste client URL → click which param gets your Respondent ID</p>
                </div>
            </div>

            <textarea
                rows={2}
                placeholder={`Paste client survey URL here, e.g.\nhttps://insights.teamvizory.com/Navigate?tid=96PbHvAb&tzid=uid`}
                value={rawUrl}
                onChange={(e) => { setRawUrl(e.target.value); parseUrl(e.target.value) }}
                className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl text-xs font-mono text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-amber-300 outline-none resize-none"
            />

            {parseError && (
                <p className="text-[10px] text-rose-500 font-semibold">{parseError}</p>
            )}

            {parsed.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1">
                        <MousePointerClick className="w-3 h-3" />
                        Click on the value that should become your Respondent UID:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {parsed.map(({ key, value }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setSelectedParam(key)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono border-2 transition-all ${
                                    selectedParam === key
                                        ? 'bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-200'
                                        : 'bg-white border-amber-200 text-slate-600 hover:border-amber-400 hover:bg-amber-50'
                                }`}
                            >
                                <span className="text-[8px] font-bold opacity-60 uppercase">{key}</span>
                                <span className="text-[9px]">=</span>
                                <span className="font-bold">{value || <em className="opacity-40">empty</em>}</span>
                                {selectedParam === key && <span className="ml-1 text-[8px] bg-white/30 rounded px-1">✓ UID</span>}
                            </button>
                        ))}
                    </div>

                    {selectedParam && (
                        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <div>
                                <p className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">Mapping Preview</p>
                                <code className="text-[10px] text-emerald-800 font-mono">
                                    <span className="opacity-50">...?</span>
                                    <span className="font-black">{selectedParam}</span>
                                    <span className="text-emerald-500 font-black">=&#123;RESPONDENT_UID&#125;</span>
                                    {parsed.filter(p => p.key !== selectedParam).map(p => (
                                        <span key={p.key} className="opacity-40">&{p.key}={p.value}</span>
                                    ))}
                                </code>
                            </div>
                            <button
                                type="button"
                                onClick={applyMapping}
                                className="ml-4 flex-shrink-0 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors"
                            >
                                Apply →
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
// ─────────────────────────────────────────────────────────────────────────────

export default function ProjectForm({ clients }: { clients: Client[] }) {
    const [formData, setFormData] = useState({
        client_id: clients[0]?.id || '',
        project_name: '',
        project_code: '',
        country: 'Global',
        base_url: '',
        complete_target: null as number | null,
        has_prescreener: false,
        prescreener_url: '',
        is_multi_country: false,
        // PID Tool Configuration
        pid_prefix: '',             // e.g. "OPGH"
        pid_counter: 1,             // Starting number
        pid_padding: 2,             // e.g. 2 for "01"
        force_pid_as_uid: false,     // Force generated PID as client UID
        // UID Logic
        target_uid: '',             // NEW: Global UID Override
        // Parameter isolation fields
        client_pid_param: '',       // e.g. "pid" — vendor's PID param name
        client_uid_param: '',       // e.g. "uid" — vendor's UID param name
        oi_prefix: 'oi_',           // Internal tracking prefix (never reuse vendor names)
    })
    const [uidParamRows, setUidParamRows] = useState<{param: string; value: string}[]>([])
    const [links, setLinks] = useState<{ country_code: string; target_url: string; active: boolean }[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const addLink = () => {
        setLinks([...links, { country_code: '', target_url: '', active: true }])
    }

    const toggleActive = (index: number) => {
        const newLinks = [...links]
        newLinks[index].active = !newLinks[index].active
        setLinks(newLinks)
    }

    const updateLink = (index: number, field: 'country_code' | 'target_url', value: string) => {
        const newLinks = [...links]
        newLinks[index][field] = value
        setLinks(newLinks)
    }

    const removeLink = (index: number) => {
        setLinks(links.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const uid_params = uidParamRows.filter(r => r.param.trim()).length > 0
                ? uidParamRows.filter(r => r.param.trim())
                : null

            const { error: createError } = await createProjectAction({
                ...formData,
                is_multi_country: formData.is_multi_country,
                uid_params
            }, formData.is_multi_country ? links : [])

            if (createError) {
                setError(createError.message || 'Failed to create project')
            } else {
                setFormData({
                    client_id: clients[0]?.id || '',
                    project_name: '',
                    project_code: '',
                    country: 'Global',
                    base_url: '',
                    complete_target: null,
                    has_prescreener: false,
                    prescreener_url: '',
                    is_multi_country: false,
                    pid_prefix: '',
                    pid_counter: 1,
                    pid_padding: 2,
                    force_pid_as_uid: false,
                    target_uid: '',
                    client_pid_param: '',
                    client_uid_param: '',
                    oi_prefix: 'oi_',
                })
                setUidParamRows([])
                setLinks([])
                router.refresh()
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-slate-50/50 rounded-[2.5rem] p-1 border border-slate-100 shadow-sm max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.25rem] overflow-hidden border border-slate-100/50">
                <div className="p-8 lg:p-12 space-y-10">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center text-indigo-500">
                            <Plus className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 tracking-tight">Project PID Setup Tool</h3>
                    </div>

                    <div className="space-y-10">
                        {/* 1. Identity Phase */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-slate-50/30 border border-slate-100 rounded-3xl animate-in slide-in-from-left duration-500">
                            <div className="md:col-span-2 -mb-2">
                                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Step 1: Project Identity</h4>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-slate-500 tracking-tight ml-1">Client Name</label>
                                <div className="relative">
                                    <select
                                        value={formData.client_id}
                                        onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all text-sm font-medium text-slate-700 appearance-none cursor-pointer"
                                        required
                                    >
                                        <option value="">Select client...</option>
                                        {clients.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-slate-500 tracking-tight ml-1">Internal Project Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Samsung Galaxy S24 Study"
                                    value={formData.project_name || ''}
                                    onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all text-sm font-medium text-slate-700 placeholder:text-slate-300"
                                    required
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="block text-[11px] font-bold text-slate-500 tracking-tight ml-1">Internal Project ID (Unique)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. SAMSUNG_S24_01"
                                    value={formData.project_code}
                                    onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all text-sm font-medium text-slate-700 placeholder:text-slate-300"
                                    required
                                />
                            </div>
                        </div>

                        {/* 2. PID Setup Phase */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 bg-indigo-50/30 border border-indigo-100 rounded-3xl animate-in slide-in-from-right duration-500">
                            <div className="md:col-span-4 -mb-2 flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Step 2: Client PID Configuration</h4>
                                <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded-full border border-emerald-200 uppercase tracking-tighter animate-pulse">
                                    Anti-Duplicate Enabled
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-slate-400 tracking-widest ml-1 uppercase">PID Prefix</label>
                                <input
                                    type="text"
                                    placeholder="OPGH"
                                    value={formData.pid_prefix || ''}
                                    onChange={(e) => setFormData({ ...formData, pid_prefix: e.target.value.toUpperCase() })}
                                    className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-200 font-mono"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-slate-400 tracking-widest ml-1 uppercase">Start #</label>
                                <input
                                    type="number"
                                    value={formData.pid_counter}
                                    onChange={(e) => setFormData({ ...formData, pid_counter: parseInt(e.target.value) || 1 })}
                                    className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all text-sm font-bold text-slate-700 font-mono"
                                    min="1"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-slate-400 tracking-widest ml-1 uppercase">Padding</label>
                                <select
                                    value={formData.pid_padding}
                                    onChange={(e) => setFormData({ ...formData, pid_padding: parseInt(e.target.value) })}
                                    className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl outline-none transition-all text-sm font-bold text-slate-700 appearance-none cursor-pointer font-mono"
                                >
                                    <option value={1}>1</option>
                                    <option value={2}>2</option>
                                    <option value={3}>3</option>
                                    <option value={4}>4</option>
                                </select>
                            </div>

                            <div className="flex flex-col justify-end">
                                <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 shadow-lg">
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1">Preview (Global)</p>
                                    <code className="text-emerald-400 text-sm font-black tracking-widest">
                                        {formData.pid_prefix
                                            ? `${formData.pid_prefix}${String(formData.pid_counter).padStart(formData.pid_padding, '0')}`
                                            : '----'}
                                    </code>
                                </div>
                                <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 shadow-lg">
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1">Preview (US Example)</p>
                                    <code className="text-amber-400 text-sm font-black tracking-widest">
                                        {formData.pid_prefix
                                            ? `${formData.pid_prefix}US${String(formData.pid_counter).padStart(formData.pid_padding, '0')}`
                                            : '----'}
                                    </code>
                                </div>
                            </div>
                        </div>

                        {/* Target UID Override Field (New) */}
                        <div className="md:col-span-2 p-6 bg-indigo-50/20 border border-indigo-100 rounded-3xl space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
                                        <Save className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Target UID Override (High Priority)</p>
                                        <p className="text-[9px] font-medium text-slate-400 leading-tight">If set, this value is sent to the client instead of any PID or incoming UID.</p>
                                    </div>
                                </div>
                            </div>
                            <input
                                type="text"
                                placeholder="e.g. STATIC_IDENTIFIER (Optional)"
                                value={formData.target_uid}
                                onChange={(e) => setFormData({ ...formData, target_uid: e.target.value })}
                                className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-200 font-mono"
                            />
                        </div>

                        {/* PID-as-UID Logic Toggle */}
                        <div className="mt-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${formData.force_pid_as_uid ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Use Generated PID as User ID (UID)</p>
                                    <p className="text-[9px] font-medium text-slate-400 leading-tight mt-0.5">If enabled, the client receives the auto-incrementing PID (e.g. OPGH01) instead of random incoming UIDs.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, force_pid_as_uid: !formData.force_pid_as_uid })}
                                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.force_pid_as_uid ? 'bg-emerald-500' : 'bg-slate-200'}`}
                            >
                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.force_pid_as_uid ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {/* 3. Baseline & Advanced */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3 md:col-span-2">
                                {/* Smart URL Mapper */}
                                {!formData.is_multi_country && (
                                    <SmartUrlMapper
                                        onApply={(baseUrl, uidParam, pidParam) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                base_url: baseUrl,
                                                client_uid_param: uidParam,
                                                client_pid_param: pidParam || prev.client_pid_param
                                            }))
                                        }}
                                    />
                                )}
                                <label className="block text-[11px] font-bold text-slate-500 tracking-tight ml-1 uppercase opacity-70">
                                    {formData.is_multi_country ? 'Default Survey URL (Disabled)' : 'Base Survey URL'}
                                    {formData.client_uid_param && (
                                        <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[9px] normal-case font-bold">
                                            UID → <code>{formData.client_uid_param}</code> param
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="url"
                                    placeholder={formData.is_multi_country ? 'Multi-country mode: Add country URLs below' : 'https://survey-provider.com/s/123'}
                                    value={formData.base_url}
                                    onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                                    className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all text-xs font-medium text-slate-700 placeholder:text-slate-300 font-mono ${formData.is_multi_country ? 'cursor-not-allowed bg-slate-50/50' : 'bg-white'}`}
                                    required={!formData.is_multi_country}
                                    disabled={formData.is_multi_country}
                                />
                            </div>
                            <div className="hidden"> {/* spacer - keeps grid alignment */}</div>

                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-slate-500 tracking-tight ml-1 uppercase opacity-70">Global Target (Quota)</label>
                                <input
                                    type="number"
                                    placeholder="e.g. 500 (Optional)"
                                    value={formData.complete_target || ''}
                                    onChange={(e) => setFormData({ ...formData, complete_target: e.target.value ? parseInt(e.target.value) : null })}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all text-sm font-medium text-slate-700 font-mono"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <details className="group bg-slate-50/50 border border-slate-100 rounded-2xl p-2 transition-all">
                                    <summary className="flex items-center justify-between px-4 py-2 cursor-pointer list-none select-none">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-8 h-8 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-open:text-indigo-500 transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Advanced Link Settings</span>
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-slate-300 group-open:rotate-180 transition-transform" />
                                    </summary>
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-6 animate-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-bold text-indigo-600 tracking-tight ml-1 uppercase">Target UID Override</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. COMPLETED"
                                                value={formData.target_uid}
                                                onChange={(e) => setFormData({ ...formData, target_uid: e.target.value })}
                                                className="w-full px-4 py-2 bg-indigo-50/50 border border-indigo-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all text-xs font-bold text-slate-700 placeholder:text-slate-300 font-mono"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-bold text-slate-500 tracking-tight ml-1 uppercase">Vendor PID Param</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. pid"
                                                value={formData.client_pid_param}
                                                onChange={(e) => setFormData({ ...formData, client_pid_param: e.target.value })}
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 transition-all text-xs font-medium text-slate-700 placeholder:text-slate-300 font-mono"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-bold text-slate-500 tracking-tight ml-1 uppercase">Vendor UID Param</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. uid"
                                                value={formData.client_uid_param}
                                                onChange={(e) => setFormData({ ...formData, client_uid_param: e.target.value })}
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 transition-all text-xs font-medium text-slate-700 placeholder:text-slate-300 font-mono"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-bold text-slate-500 tracking-tight ml-1 uppercase">Safe Namespace</label>
                                            <input
                                                type="text"
                                                value={formData.oi_prefix}
                                                onChange={(e) => setFormData({ ...formData, oi_prefix: e.target.value || 'oi_' })}
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 transition-all text-xs font-medium text-slate-700 font-mono"
                                            />
                                            <p className="text-[9px] text-slate-400 font-medium leading-tight ml-1">⚡ Safe namespace</p>
                                        </div>

                                        {/* URL Param Mapping — Multi UID/RID/TOID */}
                                        <div className="md:col-span-4 space-y-3 pt-2 border-t border-slate-100">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-[10px] font-black text-violet-600 uppercase tracking-[0.15em]">URL Param Mapping</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">If set, overrides Vendor PID/UID Param above</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setUidParamRows([...uidParamRows, { param: '', value: 'client_rid' }])}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 text-[10px] font-bold rounded-lg transition-colors"
                                                >
                                                    <Plus className="w-3 h-3" /> Add Param
                                                </button>
                                            </div>

                                            {uidParamRows.length === 0 && (
                                                <p className="text-[10px] text-slate-300 italic px-1">No params — legacy single param mode active</p>
                                            )}

                                            {uidParamRows.map((row, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="param name (e.g. rid, toid, uid)"
                                                        value={row.param}
                                                        onChange={(e) => {
                                                            const rows = [...uidParamRows]
                                                            rows[i] = { ...rows[i], param: e.target.value }
                                                            setUidParamRows(rows)
                                                        }}
                                                        className="flex-1 px-3 py-2 bg-white border border-violet-200 rounded-lg text-xs font-mono text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-violet-300 outline-none"
                                                    />
                                                    <select
                                                        value={row.value}
                                                        onChange={(e) => {
                                                            const rows = [...uidParamRows]
                                                            rows[i] = { ...rows[i], value: e.target.value }
                                                            setUidParamRows(rows)
                                                        }}
                                                        className="flex-1 px-3 py-2 bg-violet-50 border border-violet-200 rounded-lg text-xs font-bold text-violet-800 focus:ring-2 focus:ring-violet-300 outline-none"
                                                    >
                                                        <option value="client_rid">client_rid — custom RID (goes to client)</option>
                                                        <option value="supplier_uid">supplier_uid — supplier original UID</option>
                                                        <option value="session">session — session token</option>
                                                        <option value="hash">hash — 8-char hash</option>
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => setUidParamRows(uidParamRows.filter((_, j) => j !== i))}
                                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}

                                            {uidParamRows.filter(r => r.param).length > 0 && (
                                                <div className="p-2 bg-violet-50 border border-violet-100 rounded-lg">
                                                    <p className="text-[9px] font-bold text-violet-500 uppercase tracking-wider mb-1">Preview</p>
                                                    <code className="text-[10px] text-violet-700 break-all">
                                                        ?{uidParamRows.filter(r => r.param).map(r => `${r.param}=[${r.value}]`).join('&')}
                                                    </code>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </details>
                            </div>
                        </div>

                        {/* Toggles Row */}
                        <div className="bg-slate-50/30 border border-slate-100 rounded-2xl p-6 flex flex-wrap gap-8">
                            <label className="flex items-center space-x-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={formData.is_multi_country}
                                    onChange={() => setFormData({ ...formData, is_multi_country: !formData.is_multi_country })}
                                    className="w-5 h-5 rounded-lg border-2 border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                                />
                                <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Enable Multi-Country Support</span>
                            </label>

                            <label className="flex items-center space-x-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={formData.has_prescreener}
                                    onChange={() => setFormData({ ...formData, has_prescreener: !formData.has_prescreener })}
                                    className="w-5 h-5 rounded-lg border-2 border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                                />
                                <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Security Pre-Screener</span>
                            </label>
                        </div>

                        {formData.is_multi_country && (
                            <div className="space-y-4 animate-in fade-in duration-500">
                                <div className="bg-indigo-50/30 border border-indigo-100 rounded-3xl overflow-hidden shadow-inner">
                                    <table className="w-full text-left">
                                        <thead className="bg-indigo-100/30 border-b border-indigo-100">
                                            <tr>
                                                <th className="px-6 py-4 text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Country</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Survey URL</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-indigo-600 uppercase tracking-widest text-center">Remove</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-indigo-100/50">
                                            {links.map((link, idx) => (
                                                <tr key={idx} className="bg-white/50">
                                                    <td className="px-6 py-4">
                                                        <input
                                                            type="text"
                                                            value={link.country_code}
                                                            onChange={(e) => updateLink(idx, 'country_code', e.target.value.toUpperCase())}
                                                            className="w-12 px-2 py-2 border border-slate-200 rounded-lg text-xs font-bold text-center uppercase"
                                                            maxLength={2}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <input
                                                            type="url"
                                                            value={link.target_url}
                                                            onChange={(e) => updateLink(idx, 'target_url', e.target.value)}
                                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                                                            required
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button type="button" onClick={() => removeLink(idx)} className="text-rose-400 hover:text-rose-600 transition-colors">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <button type="button" onClick={addLink} className="w-full py-4 text-[10px] font-bold text-indigo-500 hover:bg-white transition-colors uppercase tracking-widest">
                                        + Add New Country
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-8 py-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex-1">
                        {error && (
                            <div className="flex items-center space-x-2 text-rose-500">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center space-x-6">
                        <button
                            type="button"
                            onClick={() => router.push('/admin/projects')}
                            className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !formData.project_code || !formData.client_id}
                            className="px-12 py-4 bg-indigo-500 text-white text-[13px] font-bold rounded-xl shadow-xl shadow-indigo-100/50 hover:bg-indigo-600 transition-all uppercase tracking-widest disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : 'Deploy Enterprise Route'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
