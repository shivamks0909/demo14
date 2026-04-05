import { NextRequest, NextResponse } from 'next/server'
import { destroySupplierSession } from '@/lib/supplier-auth'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('supplier_session')?.value

    if (token) {
      await destroySupplierSession(token)
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set('supplier_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    })

    return response
  } catch (error) {
    console.error('[Supplier Logout] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
