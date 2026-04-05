import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { validateSupplierSession } from '@/lib/supplier-auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('supplier_session')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { valid, supplierId } = await validateSupplierSession(token)
    if (!valid || !supplierId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const db = getDb()

    // Get assigned projects with stats
    const projects = db.prepare(`
      SELECT
        spl.id as link_id,
        spl.project_id,
        spl.quota_allocated,
        spl.quota_used,
        spl.status as link_status,
        p.project_code,
        p.project_name,
        p.country,
        p.status as project_status
      FROM supplier_project_links spl
      JOIN projects p ON spl.project_id = p.id
      WHERE spl.supplier_id = ?
      ORDER BY p.project_name
    `).all(supplierId) as any[]

    // Enrich with today's stats
    const enrichedProjects = projects.map((proj: any) => {
      const todayStats = db.prepare(`
        SELECT
          COUNT(*) as total_clicks,
          SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as total_completes
        FROM responses
        WHERE supplier_id = ? AND project_id = ?
      `).get(supplierId, proj.project_id) as any

      const totalClicks = todayStats.total_clicks || 0
      const totalCompletes = todayStats.total_completes || 0
      const conversionRate = totalClicks > 0 ? (totalCompletes / totalClicks) * 100 : 0

      return {
        ...proj,
        total_clicks: totalClicks,
        total_completes: totalCompletes,
        conversion_rate: parseFloat(conversionRate.toFixed(2))
      }
    })

    return NextResponse.json({ projects: enrichedProjects })
  } catch (error) {
    console.error('[Supplier Projects] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
