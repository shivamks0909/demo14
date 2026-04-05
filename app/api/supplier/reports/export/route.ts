import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '@/lib/unified-db'
import { validateSupplierSession } from '@/lib/supplier-auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('supplier_session')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { valid, supplierId } = await validateSupplierSession(token)
    if (!valid || !supplierId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const projectId = searchParams.get('project_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    const { database: db } = await getUnifiedDb()

    let query = db
      .from('responses')
      .select('id, project_code, project_name, uid, oi_session, status, created_at, updated_at')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (projectId) query = query.eq('project_id', projectId)
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)

    const { data: responses, error } = await query

    if (error) {
      console.error('[Supplier Export] Query error:', error)
      return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
    }

    // Generate CSV
    const headers = ['ID', 'Project Code', 'Project Name', 'UID', 'Session', 'Status', 'Created At', 'Updated At']
    const csvRows = [
      headers.join(','),
      ...(responses || []).map(r => [
        r.id,
        r.project_code,
        `"${(r.project_name || '').replace(/"/g, '""')}"`,
        r.uid || '',
        r.oi_session || '',
        r.status,
        r.created_at,
        r.updated_at || ''
      ].join(','))
    ]

    const csvContent = csvRows.join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="supplier_responses_${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('[Supplier Export] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
