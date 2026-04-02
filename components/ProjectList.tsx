'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Project } from '@/lib/types'
import { updateProjectStatusAction, updateCountryActiveAction } from '@/app/actions'
import DeleteProjectButton from './DeleteProjectButton'

interface ProjectListProps {
    projects: (Project & {
        client_name: string;
        clicks_today?: number;
        completes_today?: number;
        conversion_rate?: number;
    })[]
}

export default function ProjectList({ projects: initialProjects }: ProjectListProps) {
    const [projects, setProjects] = useState(initialProjects)
    const [openLinks, setOpenLinks] = useState<string | null>(null)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [baseUrl, setBaseUrl] = useState('')

    useEffect(() => {
        setProjects(initialProjects)
    }, [initialProjects])

    useEffect(() => {
        setBaseUrl(window.location.origin)
    }, [])

    const handleToggleStatus = async (id: string, currentStatus: 'active' | 'paused') => {
        const newStatus = currentStatus === 'active' ? 'paused' : 'active'

        // Optimistic UI update
        setProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p))

        const { error } = await updateProjectStatusAction(id, newStatus)
        if (error) {
            // Revert on error
            setProjects(prev => prev.map(p => p.id === id ? { ...p, status: currentStatus } : p))
            alert('Failed to update status')
        }
    }

    const handleToggleCountryActive = async (projectId: string, countryCode: string, currentActive: boolean) => {
        const newActive = !currentActive

        // Optimistic update
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p
            return {
                ...p,
                country_urls: (p.country_urls || []).map(c =>
                    c.country_code === countryCode ? { ...c, active: newActive } : c
                )
            }
        }))

        const { error } = await updateCountryActiveAction(projectId, countryCode, newActive)
        if (error) {
            // Revert
            setProjects(prev => prev.map(p => {
                if (p.id !== projectId) return p
                return {
                    ...p,
                    country_urls: p.country_urls.map(c =>
                        c.country_code === countryCode ? { ...c, active: currentActive } : c
                    )
                }
            }))
        }
    }

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedId(id)
            setTimeout(() => setCopiedId(null), 2000)
        } catch (err) {
            console.error('Copy failed:', err)
        }
    }

    if (projects.length === 0) {
        return (
            <div className="bg-white/50 backdrop-blur-sm rounded-[2rem] p-16 text-center border-2 border-dashed border-slate-200">
                <p className="text-slate-400 italic font-medium">No projects in your inventory. Launch one above.</p>
            </div>
        )
    }

    const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
      }
    }

    const itemVariants: any = {
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" }
      }
    }

    return (
        <motion.div
          className="space-y-4"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
            <div className="hidden lg:grid grid-cols-12 gap-4 px-8 py-3 bg-slate-100/50 rounded-2xl mb-4">
                <div className="col-span-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project / Code</div>
                <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Velocity</div>
                <div className="col-span-1 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Success</div>
                <div className="col-span-1 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Yield</div>
                <div className="col-span-1 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</div>
                <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Links</div>
                <div className="col-span-1 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</div>
            </div>

            {projects.map((project) => (
                <motion.div
                    key={project.id}
                    className="bg-white/80 backdrop-blur-md border border-white/40 shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden transition-all hover:shadow-2xl hover:border-indigo-100 group"
                    variants={itemVariants}
                    whileHover={{ scale: 1.01 }}
                    layout
                >
                    <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-4 p-6 lg:p-8">
                        {/* Project / Code */}
                        <div className="col-span-4 flex items-center space-x-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 ${project.status === 'active' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-slate-100 text-slate-400 border border-slate-200 shadow-none'}`}>
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <div className="flex items-center space-x-2">
                                    <h3 className="text-xl font-black text-slate-900 leading-tight">{project.project_name || project.project_code}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${project.is_multi_country ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                        {project.is_multi_country ? 'Multi' : 'Single'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">
                                    <span className="text-indigo-600/70">{project.project_code}</span>
                                    <span className="mx-2 text-slate-200">|</span>
                                    {project.client_name}
                                    <span className="mx-1">•</span>
                                    {project.country || 'Global'}
                                </p>
                            </div>
                        </div>

                        {/* Velocity */}
                        <div className="col-span-2 flex flex-col items-center">
                            <div className="flex items-end space-x-1">
                                <span className="text-2xl font-black text-slate-800">{project.clicks_today || 0}</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Traffic</span>
                            </div>
                            <div className="w-full max-w-[80px] h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min((project.clicks_today || 0) / 10, 100)}%` }}></div>
                            </div>
                        </div>

                        {/* Success */}
                        <div className="col-span-1 flex flex-col items-center">
                            <span className="text-2xl font-black text-emerald-600">{project.completes_today || 0}</span>
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-1">Success</span>
                        </div>

                        {/* Yield */}
                        <div className="col-span-1 flex flex-col items-center">
                            <span className="text-xl font-black text-indigo-600">{Math.round(project.conversion_rate || 0)}%</span>
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">Efficiency</span>
                        </div>

                        {/* Status Toggle */}
                        <div className="col-span-1 flex justify-center">
                            <button
                                onClick={() => handleToggleStatus(project.id, project.status)}
                                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 relative ${project.status === 'active' ? 'bg-indigo-600' : 'bg-slate-200'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${project.status === 'active' ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>

                        {/* Links Accordion Trigger */}
                        <div className="col-span-2 flex justify-center">
                            <button
                                onClick={() => setOpenLinks(openLinks === project.id ? null : project.id)}
                                className={`px-5 py-2.5 rounded-2xl flex items-center space-x-2 transition-all font-black text-[11px] uppercase tracking-widest group/btn ${openLinks === project.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-white hover:border-indigo-300 hover:text-indigo-600'}`}
                            >
                                <span>{project.is_multi_country ? (project.country_urls?.length || 0) : 1} Link{(!project.is_multi_country || (project.country_urls?.length || 0) !== 1) ? 's' : ''}</span>
                                <svg className={`w-4 h-4 transition-transform duration-300 ${openLinks === project.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="col-span-1 flex items-center justify-end space-x-4">
                            <a
                                href={`/admin/projects/${project.id}`}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </a>
                            <DeleteProjectButton id={project.id} projectCode={project.project_code} />
                        </div>
                    </div>

                    {/* Links Accordion Content */}
                    {openLinks === project.id && (
                        <div className="px-8 pb-8 pt-2 animate-in slide-in-from-top-4 duration-300 border-t border-slate-50">
                            <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                                <div className="flex items-center space-x-2 mb-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Tracking Links</h4>
                                </div>
                                <div className="space-y-3">
                                    {!project.is_multi_country ? (
                                        <div className={`flex items-center space-x-3 p-3 rounded-2xl border shadow-sm transition-all ${project.status === 'active'
                                            ? 'bg-white border-slate-100 hover:border-indigo-200'
                                            : 'bg-slate-50/80 border-slate-100 opacity-60'
                                            }`}>
                                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-xs">🔗</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none mb-1">Global</p>
                                                <p className="text-[11px] font-mono text-slate-500 truncate">{baseUrl}/track?code={project.project_code}&uid=[UID]</p>
                                            </div>
                                            {/* Active toggle for single-country */}
                                            <button
                                                onClick={() => handleToggleStatus(project.id, project.status)}
                                                className={`relative w-10 h-5 rounded-full p-0.5 transition-all duration-300 shrink-0 ${project.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'
                                                    }`}
                                                title={project.status === 'active' ? 'Click to deactivate' : 'Click to activate'}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${project.status === 'active' ? 'translate-x-5' : 'translate-x-0'
                                                    }`} />
                                            </button>
                                            <button
                                                onClick={() => copyToClipboard(`${baseUrl}/track?code=${project.project_code}&uid=[UID]`, `copy-${project.id}`)}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${copiedId === `copy-${project.id}` ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                            >
                                                {copiedId === `copy-${project.id}` ? 'COPY' : '📋'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {(project.country_urls || []).map((country, idx) => {
                                                const isActive = (country as any).active !== false
                                                const url = `${baseUrl}/track?code=${project.project_code}&country=${country.country_code}&uid=[UID]`;
                                                return (
                                                    <div key={idx} className={`flex items-center space-x-3 p-3 rounded-2xl border shadow-sm transition-all ${isActive
                                                        ? 'bg-white border-slate-100 hover:border-indigo-200'
                                                        : 'bg-slate-50/80 border-slate-100 opacity-60'
                                                        }`}>
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
                                                            }`}>{country.country_code}</div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[11px] font-mono text-slate-500 truncate">{url}</p>
                                                        </div>
                                                        {/* Active toggle per country */}
                                                        <button
                                                            onClick={() => handleToggleCountryActive(project.id, country.country_code, isActive)}
                                                            className={`relative w-10 h-5 rounded-full p-0.5 transition-all duration-300 shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-slate-300'
                                                                }`}
                                                            title={isActive ? 'Click to deactivate' : 'Click to activate'}
                                                        >
                                                            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${isActive ? 'translate-x-5' : 'translate-x-0'
                                                                }`} />
                                                        </button>
                                                        <button
                                                            onClick={() => copyToClipboard(url, `copy-${project.id}-${idx}`)}
                                                            className={`p-2 rounded-lg text-[10px] transition-all ${copiedId === `copy-${project.id}-${idx}` ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-indigo-600 hover:text-white'}`}
                                                        >
                                                            {copiedId === `copy-${project.id}-${idx}` ? '✓' : '📋'}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            ))}
        </motion.div>
    )
}
