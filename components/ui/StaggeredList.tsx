'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface StaggeredListProps {
    children: ReactNode
    className?: string
    staggerDelay?: number
}

export default function StaggeredList({ children, className = '', staggerDelay = 0.05 }: StaggeredListProps) {
    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={{
                hidden: { opacity: 0 },
                visible: {
                    opacity: 1,
                    transition: {
                        staggerChildren: staggerDelay,
                        delayChildren: 0.1,
                    },
                },
            }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

interface StaggeredItemProps {
    children: ReactNode
    className?: string
}

export function StaggeredItem({ children, className = '' }: StaggeredItemProps) {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 8 },
                visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
                },
            }}
            className={className}
        >
            {children}
        </motion.div>
    )
}
