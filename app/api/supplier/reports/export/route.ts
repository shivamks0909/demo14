import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
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

    const db = getDb()

    let whereClause = 'WHERE r.supplier_id = ?'
    const params: any[] = [supplierId]

    if (status) {
      whereClause += ' AND r.status = ?'
      params.push(status)
    }
    if (projectId) {
      whereClause += ' AND r.project_id = ?'
      params.push(projectId)
    }
    if (dateFrom) {
      whereClause += ' AND r.created_at >= ?'
      params.push(dateFrom)
    }
    if (dateTo) {
      whereClause += ' AND r.created_at <= ?'
      params.push(dateTo)
    }

    const responses = db.prepare(`
      SELECT r.id, r.project_code, r.project_name, r.uid, r.oi_session, r.status, r.created_at, r.updated_at
      FROM responses r
      ${whereClause}
      ORDER BY r.created_at DESC
    `).all(...params) as any[]

    // Generate CSV
    const headers = ['ID', 'Project Code', 'Project Name', 'UID', 'Session', 'Status', 'Created At', 'Updated At']
    const csvRows = [
      headers.join(','),
      ...responses.map(r => [
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
