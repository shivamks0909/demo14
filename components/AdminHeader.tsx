'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { logoutAction } from '@/app/login/actions'
import {
    Bell,
    Search,
    User,
    Menu,
    LogOut,
    Settings,
    ChevronDown,
    PanelLeftClose,
    PanelLeftOpen,
} from 'lucide-react'

interface AdminHeaderProps {
    onMenuToggle: () => void
    onSidebarToggle: () => void
    isSidebarCollapsed: boolean
    pageTitle?: string
    pageDescription?: string
}

export default function AdminHeader({
    onMenuToggle,
    onSidebarToggle,
    isSidebarCollapsed,
    pageTitle,
    pageDescription,
}: AdminHeaderProps) {
    const router = useRouter()
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const notifRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false)
            }
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setShowNotifications(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLogout = async () => {
        await logoutAction()
        router.push('/login')
        router.refresh()
    }

    return (
        <header className="sticky top-0 z-30 h-16 bg-bg-surface/80 backdrop-blur-xl border-b border-border-subtle shadow-header">
            <div className="flex items-center justify-between h-full px-4 sm:px-6">
                {/* Left Section */}
                <div className="flex items-center gap-3">
                    {/* Mobile Menu Button */}
                    <button
                        onClick={onMenuToggle}
                        className="md:hidden p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-subtle transition-colors"
                    >
                        <Menu className="h-5 w-5" />
                    </button>

                    {/* Sidebar Toggle - Desktop */}
                    <button
                        onClick={onSidebarToggle}
                        className="hidden md:flex p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-subtle transition-colors"
                        title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {isSidebarCollapsed ? (
                            <PanelLeftOpen className="h-[18px] w-[18px]" />
                        ) : (
                            <PanelLeftClose className="h-[18px] w-[18px]" />
                        )}
                    </button>

                    {/* Page Title */}
                    {pageTitle && (
                        <div className="hidden sm:block">
                            <h1 className="text-base font-semibold text-text-primary tracking-tight">{pageTitle}</h1>
                            {pageDescription && (
                                <p className="text-xs text-text-muted -mt-0.5">{pageDescription}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Center - Search */}
                <div className="flex-1 max-w-md mx-4">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2 text-sm bg-bg-subtle/50 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="Search projects, clients, responses..."
                        />
                        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-text-muted bg-bg-surface border border-border-subtle rounded">
                            ⌘K
                        </kbd>
                    </div>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-1">
                    {/* Notifications */}
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-subtle transition-colors"
                        >
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-error ring-2 ring-bg-surface" />
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-bg-surface border border-border-base rounded-2xl shadow-dropdown overflow-hidden">
                                <div className="px-4 py-3 border-b border-border-subtle">
                                    <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                                </div>
                                <div className="p-4 text-center text-sm text-text-muted">
                                    No new notifications
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Menu */}
                    <div className="relative ml-1" ref={menuRef}>
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-bg-subtle transition-colors"
                        >
                            <div className="h-8 w-8 rounded-xl bg-primary-soft border border-primary-border flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                            </div>
                            <div className="hidden lg:block text-left">
                                <p className="text-sm font-medium text-text-primary leading-tight">Admin</p>
                                <p className="text-[10px] text-text-muted">Super Admin</p>
                            </div>
                            <ChevronDown className="hidden lg:block h-4 w-4 text-text-muted" />
                        </button>

                        {showUserMenu && (
                            <div className="absolute right-0 mt-2 w-56 bg-bg-surface border border-border-base rounded-2xl shadow-dropdown overflow-hidden">
                                <div className="px-4 py-3 border-b border-border-subtle">
                                    <p className="text-sm font-medium text-text-primary">Admin User</p>
                                    <p className="text-xs text-text-muted">admin@opinioninsights.com</p>
                                </div>
                                <div className="py-1">
                                    <button
                                        onClick={() => {
                                            router.push('/admin/settings')
                                            setShowUserMenu(false)
                                        }}
                                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:bg-bg-subtle transition-colors"
                                    >
                                        <Settings className="h-4 w-4" />
                                        Settings
                                    </button>
                                    <div className="my-1 border-t border-border-subtle" />
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-error hover:bg-error-soft transition-colors"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}
