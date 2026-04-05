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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    const db = getDb()

    // Build query with filters
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

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM responses r ${whereClause}
    `).get(...params) as any

    // Get paginated responses
    const responses = db.prepare(`
      SELECT r.id, r.project_code, r.project_name, r.uid, r.oi_session, r.status, r.created_at, r.updated_at
      FROM responses r
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as any[]

    const total = countResult.total || 0
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      responses,
      total,
      page,
      totalPages
    })
  } catch (error) {
    console.error('[Supplier Responses] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
