interface StatusBadgeProps {
    status: string
    variant?: 'default' | 'dot'
}

const statusConfig: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'badge-success' },
    paused: { label: 'Paused', className: 'badge-warning' },
    completed: { label: 'Completed', className: 'badge-neutral' },
    error: { label: 'Error', className: 'badge-error' },
    pending: { label: 'Pending', className: 'badge-info' },
    inactive: { label: 'Inactive', className: 'badge-neutral' },
    running: { label: 'Running', className: 'badge-success' },
    terminated: { label: 'Terminated', className: 'badge-error' },
    quotafull: { label: 'Quota Full', className: 'badge-warning' },
    duplicate: { label: 'Duplicate', className: 'badge-neutral' },
    inprogress: { label: 'In Progress', className: 'badge-info' },
    started: { label: 'Started', className: 'badge-primary' },
}

export default function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
    const config = statusConfig[status.toLowerCase()] || {
        label: status,
        className: 'badge-neutral',
    }

    if (variant === 'dot') {
        return (
            <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
                <span className={`w-2 h-2 rounded-full ${
                    status.toLowerCase() === 'active' || status.toLowerCase() === 'running' ? 'bg-success' :
                    status.toLowerCase() === 'error' || status.toLowerCase() === 'terminated' ? 'bg-error' :
                    status.toLowerCase() === 'paused' || status.toLowerCase() === 'quotafull' ? 'bg-warning' :
                    'bg-text-muted'
                }`} />
                {config.label}
            </span>
        )
    }

    return (
        <span className={config.className}>
            {config.label}
        </span>
    )
}
