import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireAdmin } from '@/lib/serverAuth';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireAdmin(request);
    if (authCheck.response) return authCheck.response;

    const ip = getClientIp(request);
    const rate = checkRateLimit(`admin-errands:${ip}`, 60, 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = adminSupabase
      .from('errands')
      .select(`
        *,
        requester:requester_id (id, full_name, phone_number, student_id),
        runner:runner_id (id, full_name, phone_number, student_id, rating)
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Admin errands fetch error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch errands' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Admin errands error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAdmin(request);
    if (authCheck.response) return authCheck.response;

    const body = await request.json();
    const { errandId, action, notes } = body;

    if (!errandId || typeof errandId !== 'string' || !action) {
      return NextResponse.json({ success: false, error: 'errandId and action are required' }, { status: 400 });
    }

    if (action === 'cancel') {
      const { error } = await adminSupabase
        .from('errands')
        .update({ status: 'cancelled', notes: notes ? String(notes).slice(0, 500) : 'Cancelled by admin', updated_at: new Date().toISOString() })
        .eq('id', errandId);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Errand cancelled by admin.' });
    }

    if (action === 'complete') {
      const { error } = await adminSupabase
        .from('errands')
        .update({ status: 'completed', actual_completion_time: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', errandId);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Errand marked complete by admin.' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin errand update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
