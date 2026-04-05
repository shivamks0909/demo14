import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '@/lib/unified-db'
import { hashPassword } from '@/lib/supplier-auth'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { database: db } = await getUnifiedDb()

    if (body.password) {
      const passwordHash = await hashPassword(body.password)
      const { error } = await db
        .from('suppliers')
        .update({ password_hash: passwordHash })
        .eq('id', id)

      if (error) {
        console.error('[Admin Reset Password] Update error:', error)
        return NextResponse.json(
          { error: 'Failed to reset password: ' + error.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Admin Reset Password] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
