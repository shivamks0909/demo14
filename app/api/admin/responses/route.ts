import { NextRequest, NextResponse } from 'next/server';
import { dashboardService } from '@/lib/dashboardService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      ip: searchParams.get('ip') || undefined,
      status: searchParams.get('status') || undefined,
      device_type: searchParams.get('device_type') || undefined
    };

    const responses = await dashboardService.getResponses(filters);
    return NextResponse.json({ success: true, data: responses || [] });
  } catch (error: any) {
    console.error('[Admin Responses GET] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch responses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Use dashboardService to create response (handles ID correctly)
    const { data, error } = await dashboardService.createResponse(body);
    
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[Admin Responses POST] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to create response' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    
    const { error } = await dashboardService.updateResponse(id, updates);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Admin Responses PATCH] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to update response' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    
    const { error } = await dashboardService.deleteResponse(id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Admin Responses DELETE] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to delete response' }, { status: 500 });
  }
}