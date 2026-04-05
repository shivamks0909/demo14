'use client'
'use client'
import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface MetricCardProps {
    title: string
    value: string | number
    icon: ReactNode
    trend?: {
        value: number
        isPositive: boolean
    }
    color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
    delay?: number
}

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    primary: { bg: 'bg-primary-soft', text: 'text-primary', border: 'border-primary-border' },
    success: { bg: 'bg-success-soft', text: 'text-success', border: 'border-success-border' },
    warning: { bg: 'bg-warning-soft', text: 'text-warning', border: 'border-warning-border' },
    error: { bg: 'bg-error-soft', text: 'text-error', border: 'border-error-border' },
    info: { bg: 'bg-info-soft', text: 'text-info', border: 'border-info-border' },
    neutral: { bg: 'bg-neutral-soft', text: 'text-neutral', border: 'border-neutral-border' },
}

export default function MetricCard({
    title,
    value,
    icon,
    trend,
    color = 'neutral',
    delay = 0,
}: MetricCardProps) {
    const colors = colorMap[color]

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay, ease: 'easeOut' }}
            className="group relative bg-bg-surface border border-border-base rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-all duration-200"
        >
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-xl ${colors.bg} ${colors.text} border ${colors.border}`}>
                    {icon}
                </div>
                {trend && (
                    <div className={`flex items-center gap-0.5 text-xs font-medium ${trend.isPositive ? 'text-success' : 'text-error'}`}>
                        <span>{trend.isPositive ? '↑' : '↓'}</span>
                        <span>{Math.abs(trend.value)}%</span>
                    </div>
                )}
            </div>

            <div>
                <div className="text-2xl font-semibold text-text-primary tracking-tight">{value}</div>
                <div className="text-xs text-text-muted mt-0.5">{title}</div>
            </div>
        </motion.div>
    )
}
