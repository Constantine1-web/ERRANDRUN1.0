import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireAdmin } from '@/lib/serverAuth';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireAdmin(request);
    if (authCheck.response) return authCheck.response;

    const ip = getClientIp(request);
    const rate = checkRateLimit(`admin-disputes:${ip}`, 60, 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = adminSupabase
      .from('disputes')
      .select(`
        *,
        initiator:initiator_id (id, full_name, phone_number, student_id),
        respondent:respondent_id (id, full_name, phone_number, student_id),
        errand:errand_id (id, title, total_fee, runner_amount, platform_fee, status, delivery_pin, pickup_photo_url, dropoff_photo_url)
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Admin disputes fetch error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch disputes' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Admin disputes error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAdmin(request);
    if (authCheck.response) return authCheck.response;

    const body = await request.json();
    const { disputeId, resolutionType, resolutionAmount, adminNotes, status } = body;

    if (!disputeId || typeof disputeId !== 'string') {
      return NextResponse.json({ success: false, error: 'disputeId is required' }, { status: 400 });
    }

    const updates: any = {
      status: status || 'resolved',
      resolution_type: resolutionType || 'no_action',
      resolution_amount: resolutionAmount !== undefined && resolutionAmount !== null ? Number(resolutionAmount) : null,
      admin_notes: adminNotes ? String(adminNotes).slice(0, 1000) : null,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await adminSupabase.from('disputes').update(updates).eq('id', disputeId);

    if (error) {
      console.error('Admin dispute update error:', error);
      return NextResponse.json({ success: false, error: 'Failed to update dispute' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Dispute updated successfully' });
  } catch (error: any) {
    console.error('Admin dispute update exception:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
