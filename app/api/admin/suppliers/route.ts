import { NextRequest, NextResponse } from 'next/server';
import { dashboardService } from '@/lib/dashboardService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const suppliers = await dashboardService.getSuppliers();
    return NextResponse.json({ success: true, data: suppliers || [] });
  } catch (error: any) {
    console.error('[Admin Suppliers GET] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch suppliers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, error } = await dashboardService.createSupplier(body);
    
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[Admin Suppliers POST] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to create supplier' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    
    const { error } = await dashboardService.updateSupplier(id, updates);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Admin Suppliers PATCH] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to update supplier' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    
    const { error } = await dashboardService.deleteSupplier(id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Admin Suppliers DELETE] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to delete supplier' }, { status: 500 });
  }
}