import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedDb } from '@/lib/unified-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { database: db } = await getUnifiedDb();
    
    let query = db.from('responses').select('*');
    
    const ip = searchParams.get('ip');
    const status = searchParams.get('status');
    const device_type = searchParams.get('device_type');
    
    if (ip) query = query.eq('ip', ip);
    if (status) query = query.eq('status', status);
    if (device_type) query = query.eq('device_type', device_type);
    
    const { data: responses, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return NextResponse.json({ success: true, data: responses || [] });
  } catch (error: any) {
    console.error('[Admin Responses GET] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch responses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { database: db } = await getUnifiedDb();
    
    const responseId = body.id || `resp_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    
    const { data, error } = await db.from('responses').insert([{
      id: responseId,
      ...body,
      created_at: body.created_at || now,
      updated_at: now,
    }]).select().single();
    
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
    
    const { database: db } = await getUnifiedDb();
    const { error } = await db.from('responses').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
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
    
    const { database: db } = await getUnifiedDb();
    const { error } = await db.from('responses').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Admin Responses DELETE] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to delete response' }, { status: 500 });
  }
}