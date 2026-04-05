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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    const { database: db } = await getUnifiedDb()

    // Build query with filters
    let query = db.from('responses').select('id, project_code, project_name, uid, oi_session, status, created_at, updated_at', { count: 'exact' }).eq('supplier_id', supplierId)

    if (status) {
      query = query.eq('status', status)
    }
    if (projectId) {
      query = query.eq('project_id', projectId)
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    const { data: responses, count: total } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const totalPages = Math.ceil((total || 0) / limit)

    return NextResponse.json({
      responses: responses || [],
      total: total || 0,
      page,
      totalPages
    })
  } catch (error) {
    console.error('[Supplier Responses] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
