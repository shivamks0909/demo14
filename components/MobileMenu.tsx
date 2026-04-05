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
    Activity,
    X,
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

export default function MobileMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const pathname = usePathname()

    if (!isOpen) return null

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden animate-fade-in"
                onClick={onClose}
            />
            {/* Menu Panel */}
            <div className="fixed inset-y-0 left-0 z-50 w-72 bg-bg-surface shadow-card-elevated transform transition-transform md:hidden animate-slide-right">
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between h-16 px-5 border-b border-border-subtle">
                        <BrandLogo className="h-8 w-auto" />
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-subtle transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={onClose}
                                    className={`
                                        flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-colors
                                        ${isActive
                                            ? 'bg-primary-soft text-primary'
                                            : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary'
                                        }
                                    `}
                                >
                                    <item.icon className={`h-[18px] w-[18px] ${isActive ? 'text-primary' : 'text-text-muted'}`} />
                                    {item.name}
                                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="flex-shrink-0 border-t border-border-subtle p-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                            <span className="text-xs text-text-muted">System Online</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
