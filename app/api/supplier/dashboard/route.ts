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

    // KPI Stats
    const stats = db.prepare(`
      SELECT
        COUNT(*) as totalClicks,
        SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as totalCompletes,
        SUM(CASE WHEN status = 'terminate' THEN 1 ELSE 0 END) as totalTerminates,
        SUM(CASE WHEN status = 'quota_full' THEN 1 ELSE 0 END) as totalQuotaFull,
        SUM(CASE WHEN status = 'security_terminate' THEN 1 ELSE 0 END) as totalSecurityTerminate,
        SUM(CASE WHEN status = 'duplicate_ip' THEN 1 ELSE 0 END) as totalDuplicateIp,
        SUM(CASE WHEN status = 'duplicate_string' THEN 1 ELSE 0 END) as totalDuplicateString
      FROM responses
      WHERE supplier_id = ?
    `).get(supplierId) as any

    const totalClicks = stats.totalClicks || 0
    const totalCompletes = stats.totalCompletes || 0
    const conversionRate = totalClicks > 0 ? (totalCompletes / totalClicks) * 100 : 0

    // Active projects count
    const activeProjects = db.prepare(`
      SELECT COUNT(*) as count FROM supplier_project_links
      WHERE supplier_id = ? AND status = 'active'
    `).get(supplierId) as any

    // Quota usage
    const quotaStats = db.prepare(`
      SELECT
        COALESCE(SUM(quota_allocated), 0) as quotaAllocated,
        COALESCE(SUM(quota_used), 0) as quotaUsed
      FROM supplier_project_links
      WHERE supplier_id = ?
    `).get(supplierId) as any

    // Recent responses
    const recentResponses = db.prepare(`
      SELECT r.id, r.project_code, r.project_name, r.uid, r.oi_session, r.status, r.created_at
      FROM responses r
      WHERE r.supplier_id = ?
      ORDER BY r.created_at DESC
      LIMIT 20
    `).all(supplierId) as any[]

    return NextResponse.json({
      kpis: {
        totalClicks,
        totalCompletes,
        totalTerminates: stats.totalTerminates || 0,
        totalQuotaFull: stats.totalQuotaFull || 0,
        totalSecurityTerminate: stats.totalSecurityTerminate || 0,
        totalDuplicateIp: stats.totalDuplicateIp || 0,
        totalDuplicateString: stats.totalDuplicateString || 0,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        activeProjects: activeProjects.count || 0,
        quotaUsed: quotaStats.quotaUsed || 0,
        quotaAllocated: quotaStats.quotaAllocated || 0
      },
      recentResponses
    })
  } catch (error) {
    console.error('[Supplier Dashboard] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
