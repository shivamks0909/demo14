import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '@/lib/unified-db'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { database: db } = await getUnifiedDb()

    if (body.status) {
      await db
        .from('suppliers')
        .update({ status: body.status })
        .eq('id', id)
    }

    if (body.name) {
      await db
        .from('suppliers')
        .update({ name: body.name })
        .eq('id', id)
    }

    const { data: supplier } = await db
      .from('suppliers')
      .select('id, name, login_email, status, last_login, created_at')
      .eq('id', id)
      .maybeSingle()

    return NextResponse.json({ supplier })
  } catch (error: any) {
    console.error('[Admin Update Supplier] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
