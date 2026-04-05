import { ReactNode } from 'react'

interface ActionCardProps {
    title: string
    description?: string
    children: ReactNode
    action?: ReactNode
    className?: string
}

export default function ActionCard({ title, description, children, action, className = '' }: ActionCardProps) {
    return (
        <div className={`card ${className}`}>
            {(title || action) && (
                <div className="flex items-start justify-between px-5 py-4 border-b border-border-subtle">
                    <div>
                        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
                        {description && (
                            <p className="text-xs text-text-muted mt-0.5">{description}</p>
                        )}
                    </div>
                    {action && (
                        <div className="flex-shrink-0 ml-4">
                            {action}
                        </div>
                    )}
                </div>
            )}
            <div className="p-5">
                {children}
            </div>
        </div>
    )
}
