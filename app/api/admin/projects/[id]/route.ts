import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '@/lib/unified-db'

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    if (!id) {
        return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    try {
        const { database: db } = await getUnifiedDb()
        if (!db) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 })

        const { error } = await db
            .from('projects')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting project:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
