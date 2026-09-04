import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireRunner } from '@/lib/serverAuth';
import { AcceptErrandSchema } from '@/lib/validations';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const authCheck = await requireRunner(req);
    if (authCheck.response) return authCheck.response;

    const runnerId = authCheck.auth.user.id;

    // Rate limit runner accepts
    const ip = getClientIp(req);
    const rate = checkRateLimit(`runner-accept:${runnerId || ip}`, 20, 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    const body = await req.json();
    const parseResult = AcceptErrandSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid accept request', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { errandId } = parseResult.data;

    // 1. Check active errands limit (Max 2 concurrent active tasks)
    const { count: activeCount, error: countError } = await adminSupabase
      .from('errands')
      .select('id', { count: 'exact', head: true })
      .eq('runner_id', runnerId)
      .in('status', ['assigned', 'in_progress']);

    if (countError) {
      console.error('Failed to verify active errands count:', countError);
      return NextResponse.json({ success: false, error: 'Failed to verify runner limits' }, { status: 500 });
    }

    if (activeCount && activeCount >= 2) {
      return NextResponse.json(
        { success: false, error: 'You have reached the maximum limit of 2 active errands. Please complete an active task first.' },
        { status: 403 }
      );
    }

    // 2. Fetch errand to ensure it's unassigned
    const { data: errand, error: fetchError } = await adminSupabase
      .from('errands')
      .select('id, requester_id, total_fee, status')
      .eq('id', errandId)
      .single();

    if (fetchError || !errand) {
      return NextResponse.json({ success: false, error: 'Errand not found' }, { status: 404 });
    }

    // Prevent a user from accepting their own errand
    if (errand.requester_id === runnerId) {
      return NextResponse.json({ success: false, error: 'You cannot accept your own errand request' }, { status: 400 });
    }

    if (errand.status !== 'unassigned') {
      return NextResponse.json({ success: false, error: 'This errand is no longer available' }, { status: 409 });
    }

    // 3. Compute 80% runner payout / 20% platform fee
    const totalFee = Number(errand.total_fee || 0);
    const runner_amount = Math.round(totalFee * 0.8);
    const platform_fee = totalFee - runner_amount;

    // 4. Atomically assign runner only if still unassigned (concurrency safe)
    const { data: updated, error: updateError } = await adminSupabase
      .from('errands')
      .update({
        runner_id: runnerId,
        status: 'assigned',
        runner_amount,
        platform_fee,
        updated_at: new Date().toISOString(),
      })
      .eq('id', errandId)
      .eq('status', 'unassigned')
      .select()
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { success: false, error: 'Errand was already claimed by another runner' },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, errand: updated });
  } catch (error: any) {
    console.error('Accept errand error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
