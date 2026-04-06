import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '@/lib/unified-db'
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

    const { database: db, source } = await getUnifiedDb()
    console.log('[Supplier Login] DB source:', source, 'Email:', email)

    // Query suppliers table from cloud database
    const { data: supplier, error: queryError } = await db
      .from('suppliers')
      .select('*')
      .eq('login_email', email)
      .maybeSingle()

    if (queryError) {
      console.error('[Supplier Login] DB query error:', queryError)
    }

    if (queryError || !supplier) {
      console.log('[Supplier Login] Supplier not found for email:', email)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    if (supplier.status !== 'active') {
      console.log('[Supplier Login] Account paused:', email, 'status:', supplier.status)
      return NextResponse.json(
        { error: 'Account is paused. Contact support.' },
        { status: 403 }
      )
    }

    const isValid = await verifyPassword(password, supplier.password_hash)
    if (!isValid) {
      console.log('[Supplier Login] Invalid password for:', email)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    console.log('[Supplier Login] Password valid, creating session for supplier:', supplier.id)
    const { token } = await createSupplierSession(supplier.id)
    await updateSupplierLastLogin(supplier.id)
    console.log('[Supplier Login] Session created successfully')

    const isProduction = process.env.NODE_ENV === 'production'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || ''
    // Extract domain from URL (e.g., "dashboard.opinioninsights.in" from "https://dashboard.opinioninsights.in")
    const cookieDomain = appUrl ? appUrl.replace(/^https?:\/\//, '') : undefined

    console.log('[Supplier Login] Cookie config - production:', isProduction, 'domain:', cookieDomain)

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
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {})
    })

    console.log('[Supplier Login] Cookie set, returning success')
    return response
  } catch (error) {
    console.error('[Supplier Login] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
