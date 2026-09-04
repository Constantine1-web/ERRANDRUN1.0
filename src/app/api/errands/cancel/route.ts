import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireAuth } from '@/lib/serverAuth';
import { CancelErrandSchema } from '@/lib/validations';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.response) return authCheck.response;

    const callerId = authCheck.auth.user.id;
    const isAdmin = authCheck.auth.profile?.role === 'admin';

    const ip = getClientIp(request);
    const rate = checkRateLimit(`cancel-errand:${callerId || ip}`, 20, 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    const body = await request.json();
    const parseResult = CancelErrandSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid cancellation request', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { errandId, reason } = parseResult.data;

    // 1. Fetch errand
    const { data: errand, error: fetchError } = await adminSupabase
      .from('errands')
      .select('*')
      .eq('id', errandId)
      .single();

    if (fetchError || !errand) {
      return NextResponse.json({ success: false, error: 'Errand not found' }, { status: 404 });
    }

    // 2. Authorization check: Only requester or admin can cancel
    if (errand.requester_id !== callerId && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not own this errand request' },
        { status: 403 }
      );
    }

    if (errand.status === 'completed' || errand.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: `Cannot cancel an errand with status: ${errand.status}` },
        { status: 400 }
      );
    }

    if (errand.status === 'assigned' || errand.status === 'in_progress') {
      return NextResponse.json(
        {
          success: false,
          error: 'A runner is actively fulfilling this task. Please submit a dispute to resolve cancellation.',
        },
        { status: 400 }
      );
    }

    // 3. Mark errand as cancelled
    const { error: updateError } = await adminSupabase
      .from('errands')
      .update({
        status: 'cancelled',
        notes: reason ? `Cancelled by requester: ${reason.slice(0, 300)}` : 'Cancelled by requester',
        updated_at: new Date().toISOString(),
      })
      .eq('id', errandId);

    if (updateError) {
      console.error('Errand cancel update error:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to update errand status' }, { status: 500 });
    }

    // 4. Refund total_fee to requester wallet if the errand was unassigned
    if (errand.status === 'unassigned' && Number(errand.total_fee) > 0) {
      const { data: wallet } = await adminSupabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', errand.requester_id)
        .single();

      if (wallet) {
        const refundedBalance = Number(wallet.balance) + Number(errand.total_fee);
        await adminSupabase
          .from('wallets')
          .update({ balance: refundedBalance, last_updated: new Date().toISOString() })
          .eq('id', wallet.id);

        await adminSupabase.from('transactions').insert({
          user_id: errand.requester_id,
          amount: errand.total_fee,
          type: 'refund',
          status: 'success',
          reference: errand.id,
          description: `Refund for cancelled errand #${errand.id.slice(0, 8)}`,
          created_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Errand cancelled and escrow refunded successfully' });
  } catch (error: any) {
    console.error('Cancel errand exception:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
