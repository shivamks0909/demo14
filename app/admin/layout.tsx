'use client'

import { useState } from 'react'
import AdminHeader from '@/components/AdminHeader'
import AdminSidebar from '@/components/AdminSidebar'
import MobileMenu from '@/components/MobileMenu'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'

// Map paths to page titles
const pageTitles: Record<string, { title: string; description: string }> = {
    '/admin/dashboard': { title: 'Dashboard', description: 'Monitor survey performance and routing health' },
    '/admin/clients': { title: 'Clients', description: 'Manage client accounts and configurations' },
    '/admin/projects': { title: 'Projects', description: 'Create and manage survey routing projects' },
    '/admin/suppliers': { title: 'Suppliers', description: 'Manage traffic suppliers and performance' },
    '/admin/redirects': { title: 'Redirects', description: 'Configure survey redirect URLs and postbacks' },
    '/admin/responses': { title: 'Responses', description: 'View and analyze survey response data' },
    '/admin/audit-logs': { title: 'Audit Logs', description: 'Track system events and user actions' },
    '/admin/settings': { title: 'Settings', description: 'Configure system preferences and integrations' },
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const pathname = usePathname()

    const pageInfo = pageTitles[pathname] || { title: 'Admin', description: '' }

    return (
        <div className="min-h-screen bg-bg-main">
            {/* Desktop Sidebar */}
            <AdminSidebar
                isCollapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            {/* Mobile Menu */}
            <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

            {/* Main Content Area */}
            <div
                className={`
                    flex flex-col min-h-screen transition-all duration-300
                    ${sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'}
                `}
            >
                {/* Header */}
                <AdminHeader
                    onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
                    onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                    isSidebarCollapsed={sidebarCollapsed}
                    pageTitle={pageInfo.title}
                    pageDescription={pageInfo.description}
                />

                {/* Page Content */}
                <main className="flex-1">
                    <div className="page-container">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                        >
                            {children}
                        </motion.div>
                    </div>
                </main>
            </div>
        </div>
    )
}
