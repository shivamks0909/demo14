import { ReactNode } from 'react'

interface PageHeaderProps {
    title: string
    description?: string
    actions?: ReactNode
    breadcrumbs?: Array<{ label: string; href?: string }>
}

export default function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <nav className="flex items-center gap-1.5 text-xs text-text-muted mb-2">
                        {breadcrumbs.map((crumb, idx) => (
                            <span key={idx} className="flex items-center gap-1.5">
                                {idx > 0 && <span className="text-text-muted/50">/</span>}
                                {crumb.href ? (
                                    <a href={crumb.href} className="hover:text-text-secondary transition-colors">
                                        {crumb.label}
                                    </a>
                                ) : (
                                    <span className="text-text-primary font-medium">{crumb.label}</span>
                                )}
                            </span>
                        ))}
                    </nav>
                )}
                <h1 className="text-xl font-semibold text-text-primary tracking-tight">{title}</h1>
                {description && (
                    <p className="text-sm text-text-muted mt-1">{description}</p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-2 flex-shrink-0">
                    {actions}
                </div>
            )}
        </div>
    )
}
