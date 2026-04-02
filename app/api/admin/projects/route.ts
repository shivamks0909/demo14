import { NextRequest, NextResponse } from 'next/server';
import { dashboardService } from '@/lib/dashboardService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    let projects = await dashboardService.getProjects();
    if (status) {
      projects = projects.filter((p: any) => p.status === status);
    }

    return NextResponse.json({ success: true, data: projects || [] });
  } catch (error: any) {
    console.error('[Admin Projects GET] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Use dashboardService to create project (handles ID correctly)
    const { data, error } = await dashboardService.createProject(body);
    
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[Admin Projects POST] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to create project' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    
    const { error } = await dashboardService.updateProject(id, updates);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Admin Projects PATCH] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    
    const { error } = await dashboardService.deleteProject(id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Admin Projects DELETE] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to delete project' }, { status: 500 });
  }
}