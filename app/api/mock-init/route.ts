import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedDb } from '@/lib/unified-db'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { pid, oi_session, uid } = await request.json()
    
    if (!pid || !oi_session) {
      return NextResponse.json(
        { success: false, error: 'Missing pid or oi_session' },
        { status: 400 }
      )
    }
    
    const { database: db } = await getUnifiedDb()
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database unavailable' },
        { status: 503 }
      )
    }
    
    // Check if response already exists for this oi_session
    const { data: existing } = await db
      .from('responses')
      .select('id')
      .eq('oi_session', oi_session)
      .maybeSingle()
    
    if (existing) {
      return NextResponse.json({ success: true, message: 'Already exists' })
    }
    
    // Find project by code
    const { data: project } = await db
      .from('projects')
      .select('id, project_code, project_name')
      .eq('project_code', pid)
      .maybeSingle()
    
    // Use fallback project if not found
    const projectId = project?.id || 'external_traffic_fallback'
    const projectCode = project?.project_code || pid
    const projectName = project?.project_name || 'Mock Survey'
    
    // Create response record with oi_session
    const { data: response, error: insertError } = await db
      .from('responses')
      .insert([{
        project_id: projectId,
        project_code: projectCode,
        project_name: projectName,
        uid: uid || oi_session,
        clickid: oi_session,
        oi_session: oi_session,
        session_token: oi_session,
        status: 'in_progress',
        created_at: new Date().toISOString()
      }])
      .select()
      .single()
    
    if (insertError) {
      console.error('[MockInit] Insert failed:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to create response' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true, response })
    
  } catch (error: any) {
    console.error('[MockInit] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
