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

    // Get assigned projects with stats
    const { data: links } = await db
      .from('supplier_project_links')
      .select('*, projects(project_code, project_name, country, status)')
      .eq('supplier_id', supplierId)
      .order('projects(project_name)')

    const projects = (links || []).map((link: any) => ({
      link_id: link.id,
      project_id: link.project_id,
      quota_allocated: link.quota_allocated,
      quota_used: link.quota_used,
      link_status: link.status,
      project_code: link.projects?.project_code,
      project_name: link.projects?.project_name,
      country: link.projects?.country,
      project_status: link.projects?.status
    }))

    // Enrich with stats
    const enrichedProjects = await Promise.all(
      projects.map(async (proj: any) => {
        const { data: responses } = await db
          .from('responses')
          .select('status')
          .eq('supplier_id', supplierId)
          .eq('project_id', proj.project_id)

        const totalClicks = responses?.length || 0
        const totalCompletes = responses?.filter((r: any) => r.status === 'complete').length || 0
        const conversionRate = totalClicks > 0 ? (totalCompletes / totalClicks) * 100 : 0

        return {
          ...proj,
          total_clicks: totalClicks,
          total_completes: totalCompletes,
          conversion_rate: parseFloat(conversionRate.toFixed(2))
        }
      })
    )

    return NextResponse.json({ projects: enrichedProjects })
  } catch (error) {
    console.error('[Supplier Projects] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
