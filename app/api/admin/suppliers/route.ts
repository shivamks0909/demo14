import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '@/lib/unified-db'
import { hashPassword } from '@/lib/supplier-auth'
import * as crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, login_email, password } = body

    if (!name || !login_email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    const { database: db } = await getUnifiedDb()

    // Check if email already exists in cloud DB
    const { data: existing } = await db
      .from('suppliers')
      .select('id')
      .eq('login_email', login_email)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)
    const id = `sup_${crypto.randomUUID()}`
    const supplierToken = `tok_${crypto.randomUUID()}`
    const now = new Date().toISOString()

    const { data: supplier, error: insertError } = await db
      .from('suppliers')
      .insert([{
        id,
        name,
        supplier_token: supplierToken,
        login_email,
        password_hash: passwordHash,
        status: 'active',
        contact_email: login_email,
        created_at: now,
        updated_at: now
      }])
      .select()
      .single()

    if (insertError) {
      console.error('[Admin Create Supplier] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create supplier: ' + insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ supplier, password }, { status: 201 })
  } catch (error: any) {
    console.error('[Admin Create Supplier] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error.message || '') },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const { database: db } = await getUnifiedDb()
    const { data: suppliers, error } = await db
      .from('suppliers')
      .select('id, name, login_email, status, last_login, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Admin List Suppliers] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch suppliers' },
        { status: 500 }
      )
    }

    return NextResponse.json({ suppliers })
  } catch (error: any) {
    console.error('[Admin List Suppliers] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}