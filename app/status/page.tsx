import React, { Suspense } from 'react'
import { WavyOutcomeView } from '@/components/public/WavyOutcomeView'

async function StatusContent({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const resolvedParams = await searchParams
    const type = typeof resolvedParams.type === 'string' ? resolvedParams.type : 'complete'
    
    let statusLabel = "Complete"
    let keyword = "complete"

    switch (type) {
        case 'terminate':
            statusLabel = "Terminated"
            keyword = "terminate"
            break
        case 'quota':
        case 'quotafull':
        case 'quota_full':
            statusLabel = "Quota Full"
            keyword = "quotafull"
            break
        case 'security':
        case 'security_terminate':
            statusLabel = "Terminated"
            keyword = "security"
            break
        case 'paused':
            statusLabel = "Project Paused"
            keyword = "paused"
            break
        case 'duplicate':
        case 'duplicate_string':
        case 'duplicate_ip':
            statusLabel = "Duplicate Entry"
            keyword = "duplicate"
            break
        default:
            statusLabel = "Complete"
            keyword = "complete"
    }

    return (
        <WavyOutcomeView 
            status={statusLabel}
            statusKeyword={keyword}
        />
    )
}

export default function StatusPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center text-white">Loading status...</div>}>
            <StatusContent searchParams={searchParams} />
        </Suspense>
    )
}
