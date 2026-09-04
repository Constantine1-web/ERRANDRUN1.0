import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/serverAuth';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit(`session-log:${ip}`, 60, 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    const body = await request.json();
    const { sessionId, logoutAt, durationSeconds } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing or invalid sessionId' }, { status: 400 });
    }

    const duration = typeof durationSeconds === 'number' && durationSeconds >= 0 ? Math.floor(durationSeconds) : null;
    const logout = logoutAt && typeof logoutAt === 'string' ? logoutAt : new Date().toISOString();

    // Non-blocking update to sessions table
    const { error } = await adminSupabase
      .from('sessions')
      .update({
        logout_at: logout,
        duration_seconds: duration,
      })
      .eq('id', sessionId);

    if (error) {
      console.warn('Session logging update non-fatal warning:', error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in session logger:', error);
    return NextResponse.json({ success: true, warning: 'Handled gracefully' });
  }
}

// Handle keepalive requests with restricted headers
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
