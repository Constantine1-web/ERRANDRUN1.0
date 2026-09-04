import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireRunner } from '@/lib/serverAuth';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireRunner(request);
    if (authCheck.response) return authCheck.response;

    const runnerId = authCheck.auth.user.id;

    const ip = getClientIp(request);
    const rate = checkRateLimit(`dispute-runner:${runnerId || ip}`, 5, 15 * 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    const body = await request.json();
    const { errandId, reason, lat, lng } = body;

    if (!errandId || typeof errandId !== 'string' || !reason) {
      return NextResponse.json({ success: false, error: 'Missing required fields: errandId, reason' }, { status: 400 });
    }

    // 1. Fetch errand and verify runner assignment
    const { data: errand, error: errandError } = await adminSupabase
      .from('errands')
      .select('id, runner_id, requester_id, status')
      .eq('id', errandId)
      .single();

    if (errandError || !errand) {
      return NextResponse.json({ success: false, error: 'Errand not found' }, { status: 404 });
    }

    if (errand.runner_id !== runnerId) {
      return NextResponse.json({ success: false, error: 'Forbidden: You are not assigned to this errand' }, { status: 403 });
    }

    // 2. Mark errand status as disputed
    const { error: updateError } = await adminSupabase
      .from('errands')
      .update({ status: 'disputed', updated_at: new Date().toISOString() })
      .eq('id', errandId);

    if (updateError) {
      console.error('Failed to update errand status to disputed:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to update errand status' }, { status: 500 });
    }

    // 3. Create a dispute record with correct respondent_id (requester)
    const gpsLocation = lat !== undefined && lng !== undefined ? ` | GPS: ${lat}, ${lng}` : '';
    await adminSupabase.from('disputes').insert([{
      errand_id: errandId,
      initiator_id: runnerId,
      respondent_id: errand.requester_id,
      reason: 'customer_refused_pin',
      description: String(reason).slice(0, 1000) + gpsLocation,
      status: 'open',
      created_at: new Date().toISOString(),
    }]);

    return NextResponse.json({ success: true, message: 'Dispute filed successfully' });
  } catch (error: any) {
    console.error('Dispute errand exception:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
