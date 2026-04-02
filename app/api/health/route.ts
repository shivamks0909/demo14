import { NextRequest } from 'next/server';
import { getUnifiedDb } from '@/lib/unified-db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    // Test the database connection using unified DB (works local+production)
    const { database: db, source } = await getUnifiedDb();

    // Quick ping: select from projects
    await db.from('projects').select('id').eq('status', 'active').limit(1);

    const latency = Date.now() - start;

    return new Response(JSON.stringify({
      success: true,
      status: 'healthy',
      db_source: source,
      latency_ms: latency,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    const latency = Date.now() - start;
    console.error('Health check failed:', error);
    return new Response(JSON.stringify({
      success: false,
      status: 'unhealthy',
      latency_ms: latency,
      error: error?.message || 'Database connection failed',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
}