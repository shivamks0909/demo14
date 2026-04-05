import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import * as crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { supplier_id, project_id, quota_allocated } = body

    if (!supplier_id || !project_id) {
      return NextResponse.json(
        { error: 'Supplier ID and Project ID are required' },
        { status: 400 }
      )
    }

    const db = getDb()

    // Check if assignment already exists
    const existing = db.prepare(`
      SELECT id FROM supplier_project_links
      WHERE supplier_id = ? AND project_id = ?
    `).get(supplier_id, project_id)

    if (existing) {
      // Update existing assignment
      db.prepare(`
        UPDATE supplier_project_links
        SET quota_allocated = ?, status = 'active'
        WHERE supplier_id = ? AND project_id = ?
      `).run(quota_allocated || 0, supplier_id, project_id)
    } else {
      // Create new assignment
      const id = `spl_${crypto.randomUUID()}`
      db.prepare(`
        INSERT INTO supplier_project_links (id, supplier_id, project_id, quota_allocated, quota_used, status, created_at)
        VALUES (?, ?, ?, ?, 0, 'active', ?)
      `).run(id, supplier_id, project_id, quota_allocated || 0, new Date().toISOString())
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Assign Project] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
