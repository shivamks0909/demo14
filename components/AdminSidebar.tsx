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
    ChevronDown,
    ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import BrandLogo from './BrandLogo'

interface NavItem {
    name: string
    href: string
    icon: React.ComponentType<{ className?: string }>
}

interface NavGroup {
    label: string
    items: NavItem[]
}

const navigationGroups: NavGroup[] = [
    {
        label: 'Overview',
        items: [
            { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        ],
    },
    {
        label: 'Management',
        items: [
            { name: 'Clients', href: '/admin/clients', icon: Users },
            { name: 'Projects', href: '/admin/projects', icon: Layers },
            { name: 'Suppliers', href: '/admin/suppliers', icon: Truck },
        ],
    },
    {
        label: 'Operations',
        items: [
            { name: 'Redirects', href: '/admin/redirects', icon: Link2 },
            { name: 'Responses', href: '/admin/responses', icon: BarChart3 },
        ],
    },
    {
        label: 'System',
        items: [
            { name: 'Audit Logs', href: '/admin/audit-logs', icon: Activity },
            { name: 'Settings', href: '/admin/settings', icon: SettingsIcon },
        ],
    },
]

function NavGroup({ group, isCollapsed }: { group: NavGroup; isCollapsed: boolean }) {
    const pathname = usePathname()
    const [isExpanded, setIsExpanded] = useState(true)
    const hasActive = group.items.some(item => pathname === item.href)

    return (
        <div className="mb-2">
            {!isCollapsed && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center w-full px-3 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider hover:text-text-secondary transition-colors"
                >
                    {isExpanded ? (
                        <ChevronDown className="w-3 h-3 mr-1.5" />
                    ) : (
                        <ChevronRight className="w-3 h-3 mr-1.5" />
                    )}
                    {group.label}
                </button>
            )}
            {(isExpanded || isCollapsed) && (
                <nav className="space-y-0.5 px-1">
                    {group.items.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`
                                    group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-150
                                    ${isActive
                                        ? 'bg-primary-soft text-primary'
                                        : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary'
                                    }
                                    ${isCollapsed ? 'justify-center px-2' : ''}
                                `}
                                title={isCollapsed ? item.name : undefined}
                            >
                                <item.icon className={`
                                    flex-shrink-0 h-[18px] w-[18px] transition-colors
                                    ${isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-secondary'}
                                `} />
                                {!isCollapsed && (
                                    <>
                                        <span className="tracking-tight">{item.name}</span>
                                        {isActive && (
                                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                                        )}
                                    </>
                                )}
                            </Link>
                        )
                    })}
                </nav>
            )}
        </div>
    )
}

export default function AdminSidebar({
    isCollapsed,
    onToggleCollapse,
}: {
    isCollapsed: boolean
    onToggleCollapse: () => void
}) {
    return (
        <aside
            className={`
                hidden md:flex md:flex-col md:fixed md:inset-y-0 z-40
                bg-bg-surface border-r border-border-subtle
                transition-all duration-300 ease-in-out
                ${isCollapsed ? 'md:w-[72px]' : 'md:w-[260px]'}
            `}
        >
            <div className="flex flex-col flex-grow overflow-y-auto">
                {/* Logo Area */}
                <div className={`
                    flex items-center flex-shrink-0 border-b border-border-subtle
                    ${isCollapsed ? 'px-4 py-4 justify-center' : 'px-5 py-4'}
                `}>
                    <Link href="/admin/dashboard" className="flex items-center gap-3">
                        <BrandLogo className="h-8 w-auto flex-shrink-0" />
                        {!isCollapsed && (
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-text-primary tracking-tight">OpinionInsights</span>
                                <span className="text-[10px] text-text-muted font-medium">Admin Console</span>
                            </div>
                        )}
                    </Link>
                </div>

                {/* Navigation Groups */}
                <div className="flex-grow py-3 overflow-y-auto scrollbar-hide">
                    {navigationGroups.map((group) => (
                        <NavGroup
                            key={group.label}
                            group={group}
                            isCollapsed={isCollapsed}
                        />
                    ))}
                </div>

                {/* Footer */}
                <div className={`
                    flex-shrink-0 border-t border-border-subtle p-3
                    ${isCollapsed ? 'px-2' : 'px-4'}
                `}>
                    <div className={`
                        bg-bg-subtle rounded-xl border border-border-subtle
                        ${isCollapsed ? 'p-2' : 'p-3'}
                    `}>
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse flex-shrink-0" />
                            {!isCollapsed && (
                                <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">System Online</span>
                            )}
                        </div>
                        {!isCollapsed && (
                            <p className="text-[10px] text-text-muted leading-relaxed">
                                Enterprise Route Node
                                <span className="block font-mono text-primary/70">v4.2.0-stable</span>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    )
}
