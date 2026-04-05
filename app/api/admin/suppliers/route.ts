import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
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

    const db = getDb()

    // Check if email already exists
    const existing = db.prepare(`
      SELECT id FROM suppliers WHERE login_email = ?
    `).get(login_email)

    if (existing) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)
    const id = `sup_${crypto.randomUUID()}`
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO suppliers (id, name, login_email, password_hash, status, created_at)
      VALUES (?, ?, ?, ?, 'active', ?)
    `).run(id, name, login_email, passwordHash, now)

    const supplier = db.prepare(`
      SELECT id, name, login_email, status, created_at
      FROM suppliers WHERE id = ?
    `).get(id)

    return NextResponse.json({ supplier, password }, { status: 201 })
  } catch (error) {
    console.error('[Admin Create Supplier] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const db = getDb()
    const suppliers = db.prepare(`
      SELECT id, name, login_email, status, last_login, created_at
      FROM suppliers
      ORDER BY created_at DESC
    `).all()

    return NextResponse.json({ suppliers })
  } catch (error) {
    console.error('[Admin List Suppliers] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}