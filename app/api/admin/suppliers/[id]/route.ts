import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { hashPassword } from '@/lib/supplier-auth'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const db = getDb()

    if (body.status) {
      db.prepare(`
        UPDATE suppliers SET status = ? WHERE id = ?
      `).run(body.status, id)
    }

    const supplier = db.prepare(`
      SELECT id, name, login_email, status, last_login, created_at
      FROM suppliers WHERE id = ?
    `).get(id)

    return NextResponse.json({ supplier })
  } catch (error) {
    console.error('[Admin Update Supplier] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
