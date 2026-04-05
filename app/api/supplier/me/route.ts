import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '@/lib/unified-db'
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

    const { database: db } = await getUnifiedDb()
    
    // Get supplier profile
    const { data: supplier } = await db
      .from('suppliers')
      .select('id, name, login_email, status, last_login, created_at')
      .eq('id', supplierId)
      .maybeSingle()

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
