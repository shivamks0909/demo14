'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Users,
    Layers,
    BarChart3,
    Settings as SettingsIcon,
    Link2,
    Truck,
    FileText,
    Activity
} from 'lucide-react'
import BrandLogo from './BrandLogo'

const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Clients', href: '/admin/clients', icon: Users },
    { name: 'Projects', href: '/admin/projects', icon: Layers },
    { name: 'Suppliers', href: '/admin/suppliers', icon: Truck },
    { name: 'Redirects', href: '/admin/redirects', icon: Link2 },
    { name: 'Responses', href: '/admin/responses', icon: BarChart3 },
    { name: 'Audit Logs', href: '/admin/audit-logs', icon: Activity },
    { name: 'Settings', href: '/admin/settings', icon: SettingsIcon },
]

export default function AdminSidebar() {
    const pathname = usePathname()

    return (
        <aside className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-50">
            <div className="flex flex-col flex-grow bg-white border-r border-slate-100 pt-8 pb-4 overflow-y-auto">
                {/* Premium Logo */}
                <div className="flex items-center flex-shrink-0 px-8 mb-12">
                    <BrandLogo className="h-12 w-auto" />
                </div>

                <div className="flex-grow flex flex-col px-4">
                    <nav className="flex-1 space-y-2">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`
                                        group flex items-center px-4 py-3.5 text-sm font-bold rounded-2xl transition-all duration-300
                                        ${isActive
                                            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
                                        }
                                    `}
                                >
                                    <item.icon className={`
                                        mr-4 flex-shrink-0 h-5 w-5 transition-colors
                                        ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}
                                    `} />
                                    <span className="tracking-tight">{item.name}</span>
                                    {isActive && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-sm"></div>
                                    )}
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                {/* Footer Section */}
                <div className="px-6 py-4">
                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Network Secure</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                            Enterprise Route Node <br />
                            <span className="font-mono text-indigo-600 opacity-70">v4.2.0-stable</span>
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    )
}
