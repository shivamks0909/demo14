import React, { Suspense } from 'react'
import { Card, CardContent } from "../../components/ui/card"
import { WavyOutcomeView } from '../../components/public/WavyOutcomeView'
import { getUnifiedDb } from '../../lib/unified-db'

export const dynamic = 'force-dynamic'
export const runtime = "nodejs";

async function StatusContent({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const resolvedParams = await searchParams
    const type = typeof resolvedParams.type === 'string' ? resolvedParams.type : 'complete'
    const clickid = typeof resolvedParams.clickid === 'string' ? resolvedParams.clickid : (typeof resolvedParams.cid === 'string' ? resolvedParams.cid : null)
    const urlUid = typeof resolvedParams.uid === 'string' ? resolvedParams.uid : null
    const urlCode = typeof resolvedParams.code === 'string' ? resolvedParams.code : (typeof resolvedParams.pid === 'string' ? resolvedParams.pid : null)
    
    let statusLabel = "Complete"
    let keyword = "complete"
    let dbStatus = "complete"

    switch (type) {
        case 'terminate':
            statusLabel = "Terminated"
            keyword = "terminate"
            dbStatus = "terminate"
            break
        case 'quota':
        case 'quotafull':
        case 'quota_full':
            statusLabel = "Quota Full"
            keyword = "quotafull"
            dbStatus = "quota_full"
            break
        case 'security':
        case 'security_terminate':
            statusLabel = "Terminated"
            keyword = "security"
            dbStatus = "security_terminate"
            break
        case 'paused':
            statusLabel = "Project Paused"
            keyword = "paused"
            dbStatus = "paused"
            break
        case 'duplicate':
        case 'duplicate_string':
        case 'duplicate_ip':
            statusLabel = "Duplicate Entry"
            keyword = "duplicate"
            dbStatus = "duplicate_string"
            break
        default:
            statusLabel = "Complete"
            keyword = "complete"
            dbStatus = "complete"
    }

    // Attempt status persistence
    if (clickid || urlUid) {
        try {
            const { database: db } = await getUnifiedDb()
            if (db) {
                let query = db.from('responses').update({ 
                    status: dbStatus,
                    updated_at: new Date().toISOString()
                }).in('status', ['in_progress', 'started'])

                if (clickid) {
                    // Method 1: Precision update by session token
                    await query.eq('oi_session', clickid)
                } else if (urlUid && urlCode) {
                    // Method 2: Update by UID + Original Project Code
                    // Note: We ignore urlCode if it looks like a generic placeholder
                    await query.eq('uid', urlUid).eq('project_code', urlCode)
                } else if (urlUid) {
                    // Method 3: Fallback update by UID (most recent in_progress)
                    await query.eq('uid', urlUid).order('created_at', { ascending: false }).limit(1)
                }
            }
        } catch (e) {
            console.error('[Status Page] Failed to persist status update:', e)
        }
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
