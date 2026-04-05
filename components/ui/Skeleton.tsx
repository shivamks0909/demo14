import { cn } from '@/lib/utils'

interface SkeletonProps {
    className?: string
    variant?: 'text' | 'circular' | 'rectangular'
}

export default function Skeleton({ className = '', variant = 'text' }: SkeletonProps) {
    const baseClasses = 'animate-pulse bg-bg-subtle'
    
    const variantClasses = {
        text: 'h-4 rounded-md',
        circular: 'rounded-full',
        rectangular: 'rounded-xl',
    }

    return (
        <div
            className={cn(baseClasses, variantClasses[variant], className)}
            role="status"
            aria-label="Loading"
        />
    )
}

interface CardSkeletonProps {
    className?: string
}

export function CardSkeleton({ className = '' }: CardSkeletonProps) {
    return (
        <div className={cn('card p-6 space-y-4', className)}>
            <div className="flex items-center gap-3">
                <Skeleton variant="circular" className="h-10 w-10" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
            <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/6" />
            </div>
        </div>
    )
}

interface TableSkeletonProps {
    rows?: number
    columns?: number
    className?: string
}

export function TableSkeleton({ rows = 5, columns = 4, className = '' }: TableSkeletonProps) {
    return (
        <div className={cn('card overflow-hidden', className)}>
            <div className="p-4 border-b border-border-base">
                <Skeleton className="h-5 w-48" />
            </div>
            <div className="divide-y divide-border-base">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4">
                        {Array.from({ length: columns }).map((_, j) => (
                            <Skeleton key={j} className="h-4 flex-1" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}
