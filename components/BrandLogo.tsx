'use client'

import Image from 'next/image'
import { useState } from 'react'

interface BrandLogoProps {
    className?: string
    alt?: string
    fallbackText?: string
    fallbackClassName?: string
}

export default function BrandLogo({
    className = "h-6 w-auto",
    alt = "Opinion Insights",
    fallbackText = "Opinion Insights",
    fallbackClassName = "text-xs font-black text-slate-900 tracking-tighter uppercase"
}: BrandLogoProps) {
    const [error, setError] = useState(false)

    if (error) {
        return (
            <div className={`flex items-center space-x-1 ${className}`}>
                <span className="text-sm font-black text-slate-800 tracking-tight">Opinion</span>
                <span className="text-sm font-bold text-emerald-500 tracking-tight">Insights</span>
            </div>
        )
    }

    return (
        <Image
            src="/logo.svg"
            alt={alt}
            width={120}
            height={40}
            className={className}
            onError={() => setError(true)}
        />
    )
}
