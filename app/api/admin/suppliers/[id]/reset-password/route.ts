import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { hashPassword } from '@/lib/supplier-auth'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const db = getDb()

    if (body.password) {
      const passwordHash = await hashPassword(body.password)
      db.prepare(`
        UPDATE suppliers SET password_hash = ? WHERE id = ?
      `).run(passwordHash, id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Reset Password] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
