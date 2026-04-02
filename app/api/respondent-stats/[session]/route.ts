import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '@/lib/unified-db'

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ session: string }> }
) {
    const { session } = await context.params
    if (!session || session === '-') {
        return NextResponse.json({ error: 'invalid session' }, { status: 400 })
    }

    const { database: db } = await getUnifiedDb()
    if (!db) return NextResponse.json({ error: 'system offline' }, { status: 503 })

    try {
        const { data: response, error } = await db
            .from('responses')
            .select('supplier_uid, project_code, start_time, updated_at, status, ip')
            .eq('clickid', session)
            .maybeSingle()

        if (error || !response) {
            return NextResponse.json({ error: 'not found' }, { status: 404 })
        }

        // Calculate LOI in seconds if possible
        let loi = 0
        if (response.start_time && response.updated_at) {
            const start = new Date(response.start_time).getTime()
            const end = new Date(response.updated_at).getTime()
            loi = Math.floor((end - start) / 1000)
        }

        return NextResponse.json({
            supplierRid: response.supplier_uid,
            projectCode: response.project_code,
            status: response.status,
            ip: response.ip,
            loi: Math.floor(loi / 60), // Return minutes for the component
            endTime: response.updated_at ? Math.floor(new Date(response.updated_at).getTime() / 1000) : null
        })
    } catch (e) {
        return NextResponse.json({ error: 'server error' }, { status: 500 })
    }
}
