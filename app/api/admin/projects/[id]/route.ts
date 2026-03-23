import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/insforge-server'

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    if (!id) {
        return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const db = await createAdminClient()
    if (!db) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    try {
        // 1. Delete associated responses
        const { error: responseError } = await db.database
            .from('responses')
            .delete()
            .eq('project_id', id)

        if (responseError) {
            console.error('Error deleting responses:', responseError)
            return NextResponse.json({ error: responseError.message }, { status: 500 })
        }

        // 2. Delete the project
        const { error: projectError } = await db.database
            .from('projects')
            .delete()
            .eq('id', id)

        if (projectError) {
            console.error('Error deleting project:', projectError)
            return NextResponse.json({ error: projectError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Critical error in delete project route:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
