import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireAuth } from '@/lib/serverAuth';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.response) return authCheck.response;

    const callerId = authCheck.auth.user.id;
    const isAdmin = authCheck.auth.profile?.role === 'admin';

    const requestedRunnerId = request.nextUrl.searchParams.get('runnerId') || callerId;

    // Authorization: callers can only see their own assigned tasks unless they are admin
    if (requestedRunnerId !== callerId && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You cannot access other runners tasks' },
        { status: 403 }
      );
    }

    const ip = getClientIp(request);
    const rate = checkRateLimit(`runner-tasks:${callerId || ip}`, 60, 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    const { data, error } = await adminSupabase
      .from('errands')
      .select('id, title, pickup_location, delivery_location, total_fee, runner_amount, status, created_at')
      .eq('runner_id', requestedRunnerId)
      .in('status', ['assigned', 'in_progress'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching runner tasks:', error);
      return NextResponse.json({ success: false, error: 'Unable to load runner tasks' }, { status: 500 });
    }

    return NextResponse.json({ success: true, tasks: data });
  } catch (error) {
    console.error('Runner tasks exception:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
