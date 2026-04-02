'use client'

import { useState, useEffect } from 'react'
import { Project } from '@/lib/types'
import { Copy, Check } from 'lucide-react'

interface RedirectManagerProps {
    project: Project
}

export default function RedirectManager({ project }: RedirectManagerProps) {
    const [baseUrl, setBaseUrl] = useState('')
    const [copiedLink, setCopiedLink] = useState<string | null>(null)

    useEffect(() => {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL
        const calculatedBaseUrl = appUrl
            ? (appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl)
            : (typeof window !== 'undefined' ? window.location.origin : '')

        setBaseUrl(calculatedBaseUrl)
    }, [])

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedLink(id)
            setTimeout(() => setCopiedLink(null), 2000)
        } catch (err) {
            console.error('Copy failed:', err)
        }
    }

    const generateLinks = (code: string) => [
        { label: 'Entry Router Link', url: `${baseUrl}/track?code=${code}&uid=[UID]`, id: 'entry' },
        { label: 'Complete Redirect', url: `${baseUrl}/status?code=${code}&uid=[UID]&type=complete`, id: 'complete' },
        { label: 'Terminate Redirect', url: `${baseUrl}/status?code=${code}&uid=[UID]&type=terminate`, id: 'terminate' },
        { label: 'Quota Redirect', url: `${baseUrl}/status?code=${code}&uid=[UID]&type=quota`, id: 'quota' },
        { label: 'Duplicate String Redirect', url: `${baseUrl}/status?code=${code}&uid=[UID]&type=duplicate_string`, id: 'dup-str' },
        { label: 'Duplicate IP Redirect', url: `${baseUrl}/status?code=${code}&uid=[UID]&type=duplicate_ip`, id: 'dup-ip' },
        { label: 'Security Terminate Redirect', url: `${baseUrl}/status?code=${code}&uid=[UID]&type=security_terminate`, id: 'sec-term' },
    ]

    const links = generateLinks(project.project_code)

    return (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 mt-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Redirect Manager</h2>
                    <p className="text-sm text-slate-500 font-medium">Production-grade path-based routing links.</p>
                </div>
                <div className="px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Live Links</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {links.map((link) => (
                    <div key={link.id} className="relative group">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                            {link.label}
                        </label>
                        <div className="flex shadow-sm">
                            <input
                                type="text"
                                readOnly
                                value={link.url}
                                className="flex-1 bg-slate-50 border border-slate-200 border-r-0 rounded-l-xl px-4 py-3 text-xs font-mono text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium truncate"
                            />
                            <button
                                onClick={() => copyToClipboard(link.url, link.id)}
                                className={`px-5 py-2 rounded-r-xl border border-l-0 transition-all text-xs font-bold flex items-center gap-2 ${copiedLink === link.id
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                                    }`}
                            >
                                {copiedLink === link.id ? (
                                    <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 text-amber-800 text-xs font-medium">
                <div className="shrink-0 mt-0.5">💡</div>
                <div className="space-y-2">
                    <p>
                        These redirect URLs use the <code>pid</code> and <code>uid</code> parameters.
                        The <code>[UID]</code> placeholder will be automatically replaced by the vendor.
                    </p>
                    <p className="mt-1">
                        <strong>S2S Callback URLs:</strong> Use <code>session=[SESSION]</code> where <code>[SESSION]</code> represents the <code>oi_session</code> token (UUID). This token is generated per click and must be captured from the entry redirect or cookies to report completions.
                    </p>
                </div>
            </div>
        </div>
    )
}
