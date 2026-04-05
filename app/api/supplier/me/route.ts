import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { validateSupplierSession } from '@/lib/supplier-auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('supplier_session')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { valid, supplierId } = await validateSupplierSession(token)

    if (!valid || !supplierId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const db = getDb()
    
    // Get supplier profile
    const supplier = db.prepare(`
      SELECT id, name, login_email, status, last_login, created_at
      FROM suppliers
      WHERE id = ?
    `).get(supplierId) as any

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    return NextResponse.json({ supplier })
  } catch (error) {
    console.error('[Supplier Me] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
