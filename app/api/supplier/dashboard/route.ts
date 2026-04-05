import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '@/lib/unified-db'
import { validateSupplierSession } from '@/lib/supplier-auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('supplier_session')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { valid, supplierId } = await validateSupplierSession(token)
    if (!valid || !supplierId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { database: db } = await getUnifiedDb()

    // KPI Stats
    const { data: stats } = await db
      .from('responses')
      .select('status')
      .eq('supplier_id', supplierId)

    const totalClicks = stats?.length || 0
    const totalCompletes = stats?.filter((r: any) => r.status === 'complete').length || 0
    const totalTerminates = stats?.filter((r: any) => r.status === 'terminate').length || 0
    const totalQuotaFull = stats?.filter((r: any) => r.status === 'quota_full').length || 0
    const totalSecurityTerminate = stats?.filter((r: any) => r.status === 'security_terminate').length || 0
    const totalDuplicateIp = stats?.filter((r: any) => r.status === 'duplicate_ip').length || 0
    const totalDuplicateString = stats?.filter((r: any) => r.status === 'duplicate_string').length || 0
    const conversionRate = totalClicks > 0 ? (totalCompletes / totalClicks) * 100 : 0

    // Active projects count
    const { data: activeProjects } = await db
      .from('supplier_project_links')
      .select('id')
      .eq('supplier_id', supplierId)
      .eq('status', 'active')

    // Quota usage
    const { data: quotaStats } = await db
      .from('supplier_project_links')
      .select('quota_allocated, quota_used')
      .eq('supplier_id', supplierId)

    const quotaAllocated = quotaStats?.reduce((sum: number, q: any) => sum + (q.quota_allocated || 0), 0) || 0
    const quotaUsed = quotaStats?.reduce((sum: number, q: any) => sum + (q.quota_used || 0), 0) || 0

    // Recent responses
    const { data: recentResponses } = await db
      .from('responses')
      .select('id, project_code, project_name, uid, oi_session, status, created_at')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      kpis: {
        totalClicks,
        totalCompletes,
        totalTerminates,
        totalQuotaFull,
        totalSecurityTerminate,
        totalDuplicateIp,
        totalDuplicateString,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        activeProjects: activeProjects?.length || 0,
        quotaUsed,
        quotaAllocated
      },
      recentResponses: recentResponses || []
    })
  } catch (error) {
    console.error('[Supplier Dashboard] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
