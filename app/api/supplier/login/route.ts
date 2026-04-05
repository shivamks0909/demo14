import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { verifyPassword, createSupplierSession, updateSupplierLastLogin } from '@/lib/supplier-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const db = getDb()
    const supplier = db.prepare(`
      SELECT id, name, login_email, password_hash, status
      FROM suppliers
      WHERE login_email = ?
    `).get(email) as { id: string; name: string; login_email: string; password_hash: string; status: string } | undefined

    if (!supplier) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    if (supplier.status !== 'active') {
      return NextResponse.json(
        { error: 'Account is paused. Contact support.' },
        { status: 403 }
      )
    }

    const isValid = await verifyPassword(password, supplier.password_hash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const { token } = await createSupplierSession(supplier.id)
    await updateSupplierLastLogin(supplier.id)

    const response = NextResponse.json({
      success: true,
      supplier: {
        id: supplier.id,
        name: supplier.name,
        email: supplier.login_email
      }
    })

    response.cookies.set('supplier_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    })

    return response
  } catch (error) {
    console.error('[Supplier Login] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
