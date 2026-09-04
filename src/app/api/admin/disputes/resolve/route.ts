import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireAdmin } from '@/lib/serverAuth';
import { AdminDisputeResolveSchema } from '@/lib/validations';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const authCheck = await requireAdmin(req);
    if (authCheck.response) return authCheck.response;

    const ip = getClientIp(req);
    const rate = checkRateLimit(`admin-resolve:${ip}`, 30, 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    const body = await req.json();
    const parseResult = AdminDisputeResolveSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid dispute resolution payload', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { disputeId, resolutionType, resolutionAmount, adminNotes, addRunnerStrike, addCustomerStrike } = parseResult.data;

    // 1. Fetch dispute and linked errand
    const { data: dispute, error: fetchDisputeError } = await adminSupabase
      .from('disputes')
      .select('*, errands(*)')
      .eq('id', disputeId)
      .single();

    if (fetchDisputeError || !dispute) {
      return NextResponse.json({ success: false, error: 'Dispute record not found' }, { status: 404 });
    }

    const errand = dispute.errands;
    if (!errand) {
      return NextResponse.json({ success: false, error: 'Linked errand not found' }, { status: 404 });
    }

    // 2. Process Runner Strike
    if (addRunnerStrike && errand.runner_id) {
      const { data: runnerProfile } = await adminSupabase
        .from('profiles')
        .select('strikes')
        .eq('id', errand.runner_id)
        .single();
      const currentStrikes = runnerProfile?.strikes || 0;
      await adminSupabase.from('profiles').update({ strikes: currentStrikes + 1 }).eq('id', errand.runner_id);
    }

    // 3. Process Customer Strike
    if (addCustomerStrike && errand.requester_id) {
      const { data: customerProfile } = await adminSupabase
        .from('profiles')
        .select('strikes')
        .eq('id', errand.requester_id)
        .single();
      const currentStrikes = customerProfile?.strikes || 0;
      await adminSupabase.from('profiles').update({ strikes: currentStrikes + 1 }).eq('id', errand.requester_id);
    }

    // 4. Resolve the errand status
    const payout = Number(resolutionAmount || 0);
    const newStatus = payout > 0 ? 'completed' : 'cancelled';

    await adminSupabase
      .from('errands')
      .update({
        status: newStatus,
        runner_amount: payout,
        platform_fee: Math.max(0, Number(errand.total_fee || 0) - payout),
        updated_at: new Date().toISOString(),
      })
      .eq('id', errand.id);

    // 5. Update dispute record
    await adminSupabase
      .from('disputes')
      .update({
        status: 'resolved',
        resolution_type: resolutionType,
        resolution_amount: payout,
        admin_notes: adminNotes ? String(adminNotes).slice(0, 1000) : `Resolved by admin: ${authCheck.auth.user.email}`,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', disputeId);

    return NextResponse.json({ success: true, message: 'Dispute resolved successfully' });
  } catch (error: any) {
    console.error('Dispute resolution error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
