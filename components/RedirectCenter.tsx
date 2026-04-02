'use client'

import { useState, useEffect } from 'react'
import { Project } from '@/lib/types'

interface RedirectCenterProps {
    projects: (Project & { client_name: string })[]
}

export default function RedirectCenter({ projects }: RedirectCenterProps) {
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

    const participantLinks = (code: string) => [
        { label: 'Short Entry Link (Recommended)', url: `${baseUrl}/r/${code}/[uid]`, id: `${code}-entry-short`, desc: 'Easiest for most vendors.' },
        { label: 'Explicit Tracking Link', url: `${baseUrl}/track?pid=${code}&uid=[uid]`, id: `${code}-entry-track`, desc: 'Direct hit to the tracking bridge.' },
    ]

    const landingPageLinks = (code: string) => [
        { label: 'Complete Redirect', url: `${baseUrl}/status?code=${code}&uid=[UID]&type=complete`, id: `${code}-complete`, desc: 'Standard client-side redirect.' },
        { label: 'Terminate Redirect', url: `${baseUrl}/status?code=${code}&uid=[UID]&type=terminate`, id: `${code}-terminate`, desc: 'Standard client-side redirect.' },
        { label: 'Quota Full Redirect', url: `${baseUrl}/status?code=${code}&uid=[UID]&type=quota`, id: `${code}-quota`, desc: 'Standard client-side redirect.' },
        { label: 'Duplicate Check Redirect', url: `${baseUrl}/status?code=${code}&uid=[UID]&type=duplicate_string`, id: `${code}-dup-str`, desc: 'Standard client-side redirect.' },
        { label: 'Security/IP Redirect', url: `${baseUrl}/status?code=${code}&uid=[UID]&type=security_terminate`, id: `${code}-sec-term`, desc: 'Access denied redirect.' },
    ]

    const postbackLinks = (code: string) => [
        { label: 'S2S Complete Postback', url: `${baseUrl}/api/callback?session=[SESSION]&type=complete`, id: `${code}-pb-complete`, desc: 'Server-to-server callback. Replace [SESSION] with the oi_session token.' },
        { label: 'S2S Terminate Postback', url: `${baseUrl}/api/callback?session=[SESSION]&type=terminate`, id: `${code}-pb-terminate`, desc: 'Server-to-server callback. Replace [SESSION] with the oi_session token.' },
        { label: 'S2S Quota Postback', url: `${baseUrl}/api/callback?session=[SESSION]&type=quota`, id: `${code}-pb-quota`, desc: 'Server-to-server callback. Replace [SESSION] with the oi_session token.' },
    ]

    return (
        <section className="mt-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Unified Link Center</h2>
                    <p className="text-slate-500 text-sm mt-1">Unified routing and callback system for all active projects.</p>
                </div>
                <div className="px-4 py-1.5 bg-indigo-50 rounded-full border border-indigo-100 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest text-pretty">V2 Logic Active</span>
                </div>
            </div>

            <div className="space-y-6">
                {projects.length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400 italic text-sm">
                        No projects available. Create a project to see routing links.
                    </div>
                ) : (
                    projects.map((project) => (
                        <div key={project.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                            <details className="group">
                                <summary className="flex items-center justify-between p-6 cursor-pointer list-none bg-slate-50/30 group-open:bg-white transition-colors">
                                    <div className="flex items-center space-x-5">
                                        <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 group-open:border-indigo-100 group-open:text-indigo-600 transition-all duration-300">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.826L10.242 9.172a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.102 1.101" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                                                {project.project_name || project.project_code}
                                            </h3>
                                            <div className="flex items-center space-x-2 mt-0.5">
                                                <span className="text-xs font-mono text-gray-400">ID: {project.project_code}</span>
                                                <span className="text-slate-200 text-pretty">|</span>
                                                <p className="text-xs text-slate-400 font-medium">{project.client_name}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${project.status === 'active'
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            : 'bg-slate-50 text-slate-400 border-slate-100'
                                            }`}>
                                            {project.status}
                                        </span>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 group-open:rotate-180 transition-all duration-500 bg-white border border-slate-100 shadow-sm">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </summary>
                                <div className="p-6 pt-2 border-t border-slate-50">
                                    <div className="space-y-8">
                                        {/* PARTICIPANT ENTRY */}
                                        <div>
                                            <h4 className="flex items-center space-x-2 text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">
                                                <span className="w-4 h-[1px] bg-indigo-200"></span>
                                                <span>Participant Entry Links</span>
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {participantLinks(project.project_code).map((link) => (
                                                    <div key={link.id} className="relative group/link bg-slate-50/50 p-4 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:bg-white transition-all duration-300">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">{link.label}</label>
                                                            <span className="text-[9px] text-slate-400 font-medium italic">{link.desc}</span>
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            <input
                                                                type="text"
                                                                readOnly
                                                                value={link.url}
                                                                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 truncate"
                                                            />
                                                            <button
                                                                onClick={() => copyToClipboard(link.url, link.id)}
                                                                className={`px-6 py-2.5 rounded-xl border transition-all text-xs font-bold ${copiedLink === link.id
                                                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-100'
                                                                    : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100'
                                                                    }`}
                                                            >
                                                                {copiedLink === link.id ? 'Copied' : 'Copy'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* LANDING PAGE REDIRECTS */}
                                        <div>
                                            <h4 className="flex items-center space-x-2 text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-4">
                                                <span className="w-4 h-[1px] bg-emerald-200"></span>
                                                <span>Direct Landing Redirects (Client-Side)</span>
                                            </h4>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                {landingPageLinks(project.project_code).map((link) => (
                                                    <div key={link.id} className="relative group/link bg-emerald-50/20 p-4 rounded-2xl border border-emerald-50 hover:border-emerald-200 hover:bg-white transition-all duration-300">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">{link.label}</label>
                                                            <span className="text-[9px] text-emerald-600/60 font-medium italic">{link.desc}</span>
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            <input
                                                                type="text"
                                                                readOnly
                                                                value={link.url}
                                                                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 truncate"
                                                            />
                                                            <button
                                                                onClick={() => copyToClipboard(link.url, link.id)}
                                                                className={`px-6 py-2.5 rounded-xl border transition-all text-xs font-bold ${copiedLink === link.id
                                                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-100'
                                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-500 hover:text-emerald-500'
                                                                    }`}
                                                            >
                                                                {copiedLink === link.id ? 'Copied' : 'Copy'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* S2S POSTBACKS */}
                                        <div>
                                            <h4 className="flex items-center space-x-2 text-[11px] font-black text-orange-600 uppercase tracking-[0.2em] mb-4">
                                                <span className="w-4 h-[1px] bg-orange-200"></span>
                                                <span>Partner Postbacks (Server-to-Server)</span>
                                            </h4>
                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                                {postbackLinks(project.project_code).map((link) => (
                                                    <div key={link.id} className="relative group/link bg-orange-50/30 p-4 rounded-2xl border border-orange-100/50 hover:border-orange-200 hover:bg-white transition-all duration-300">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">{link.label}</label>
                                                        </div>
                                                        <div className="flex flex-col space-y-2">
                                                            <input
                                                                type="text"
                                                                readOnly
                                                                value={link.url}
                                                                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                            />
                                                            <button
                                                                onClick={() => copyToClipboard(link.url, link.id)}
                                                                className={`w-full py-2 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest ${copiedLink === link.id
                                                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                                                    : 'bg-orange-600 border-orange-600 text-white hover:bg-orange-700'
                                                                    }`}
                                                            >
                                                                {copiedLink === link.id ? 'Copied SUCCESS' : 'Copy S2S URL'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </details>
                        </div>
                    ))
                )}
            </div>
        </section>
    )
}
