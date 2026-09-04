import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/serverAuth';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit(`auto-release:${ip}`, 6, 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    // 1. Find all errands that are 'assigned' but haven't progressed to 'in_progress' for over 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data: expiredErrands, error: fetchError } = await adminSupabase
      .from('errands')
      .select('id')
      .eq('status', 'assigned')
      .lt('updated_at', twoHoursAgo);

    if (fetchError) {
      console.error('Auto-release fetch error:', fetchError);
      return NextResponse.json({ success: false, error: 'Failed to fetch expired errands' }, { status: 500 });
    }

    if (!expiredErrands || expiredErrands.length === 0) {
      return NextResponse.json({ success: true, message: 'No expired errands found', releasedCount: 0 });
    }

    const expiredIds = expiredErrands.map((e) => e.id);

    // 2. Reset them to 'unassigned' and clear runner data
    const { error: updateError } = await adminSupabase
      .from('errands')
      .update({
        status: 'unassigned',
        runner_id: null,
        runner_amount: 0,
        platform_fee: 0,
        updated_at: new Date().toISOString(),
      })
      .in('id', expiredIds);

    if (updateError) {
      console.error('Auto-release update error:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to release errands' }, { status: 500 });
    }

    return NextResponse.json({ success: true, releasedCount: expiredIds.length });
  } catch (error) {
    console.error('Auto-release error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
