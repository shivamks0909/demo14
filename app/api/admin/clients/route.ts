import { NextRequest, NextResponse } from 'next/server';
import { dashboardService } from '@/lib/dashboardService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const clients = await dashboardService.getClients();
    return NextResponse.json({ success: true, data: clients || [] });
  } catch (error: any) {
    console.error('[Admin Clients GET] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ success: false, error: 'Client name is required' }, { status: 400 });
    }

    const { data, error } = await dashboardService.createClient(body.name);
    
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[Admin Clients POST] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to create client' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    
    const { error } = await dashboardService.deleteClient(id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Admin Clients DELETE] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to delete client' }, { status: 500 });
  }
}