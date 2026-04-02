import { NextRequest, NextResponse } from 'next/server'
import { dashboardService } from '@/lib/dashboardService'

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    if (!id) {
        return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    try {
        const { error } = await dashboardService.deleteProject(id)
        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting project:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
