import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '@/lib/unified-db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { supplier_id, project_id, quota_allocated } = body

    if (!supplier_id || !project_id) {
      return NextResponse.json(
        { error: 'Supplier ID and Project ID are required' },
        { status: 400 }
      )
    }

    const { database: db } = await getUnifiedDb()

    // Check if assignment already exists
    const { data: existing } = await db
      .from('supplier_project_links')
      .select('id')
      .eq('supplier_id', supplier_id)
      .eq('project_id', project_id)
      .maybeSingle()

    if (existing) {
      // Update existing assignment
      const { error } = await db
        .from('supplier_project_links')
        .update({ quota_allocated: quota_allocated || 0, status: 'active' })
        .eq('supplier_id', supplier_id)
        .eq('project_id', project_id)

      if (error) {
        console.error('[Admin Assign Project] Update error:', error)
        return NextResponse.json(
          { error: 'Failed to update assignment' },
          { status: 500 }
        )
      }
    } else {
      // Create new assignment
      const { error } = await db
        .from('supplier_project_links')
        .insert([{
          supplier_id,
          project_id,
          quota_allocated: quota_allocated || 0,
          quota_used: 0,
          status: 'active',
          created_at: new Date().toISOString()
        }])

      if (error) {
        console.error('[Admin Assign Project] Insert error:', error)
        return NextResponse.json(
          { error: 'Failed to create assignment' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Admin Assign Project] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
