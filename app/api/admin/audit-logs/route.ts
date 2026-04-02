import { NextRequest, NextResponse } from 'next/server'
import { auditService } from '@/lib/audit-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')
  const eventType = searchParams.get('event_type')

  try {
    let logs = await auditService.getLogs(limit, offset)

    // Filter by event_type if provided
    if (eventType) {
      logs = logs.filter(log => log.event_type === eventType)
    }

    return NextResponse.json({
      success: true,
      logs,
      count: logs.length,
      limit,
      offset
    })
  } catch (error) {
    console.error('[AuditLogsAPI] Error fetching logs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
