import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireAdmin } from '@/lib/serverAuth';

/**
 * Direct completion endpoint is strictly restricted to Administrators.
 * Standard errand deliveries must be completed via /api/tracking/complete using the customer's 4-digit Delivery PIN.
 */
export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAdmin(request);
    if (authCheck.response) return authCheck.response;

    const body = await request.json();
    const { errandId } = body;

    if (!errandId || typeof errandId !== 'string') {
      return NextResponse.json({ success: false, error: 'errandId is required' }, { status: 400 });
    }

    const { data: errand, error: fetchError } = await adminSupabase
      .from('errands')
      .select('id, status, runner_id, runner_amount')
      .eq('id', errandId)
      .single();

    if (fetchError || !errand) {
      return NextResponse.json({ success: false, error: 'Errand not found' }, { status: 404 });
    }

    if (errand.status === 'completed') {
      return NextResponse.json({ success: false, error: 'Errand already completed' }, { status: 400 });
    }

    const { error: updateError } = await adminSupabase
      .from('errands')
      .update({ status: 'completed', actual_completion_time: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', errandId);

    if (updateError) {
      return NextResponse.json({ success: false, error: 'Failed to complete errand' }, { status: 500 });
    }

    // Credit Runner Wallet if assigned
    if (errand.runner_id && Number(errand.runner_amount) > 0) {
      const { data: wallet } = await adminSupabase
        .from('wallets')
        .select('id, balance, total_earned')
        .eq('user_id', errand.runner_id)
        .single();
        
      if (wallet) {
        const newBalance = Number(wallet.balance) + Number(errand.runner_amount);
        const newTotalEarned = Number(wallet.total_earned || 0) + Number(errand.runner_amount);
        await adminSupabase
          .from('wallets')
          .update({ balance: newBalance, total_earned: newTotalEarned, last_updated: new Date().toISOString() })
          .eq('id', wallet.id);

        await adminSupabase.from('transactions').insert({
          user_id: errand.runner_id,
          amount: errand.runner_amount,
          type: 'payout',
          status: 'success',
          reference: errand.id,
          description: `Admin manual completion payout for errand #${errand.id.slice(0, 8)}`,
          created_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Errand completed by administrator.' });
  } catch (error: any) {
    console.error('Errand admin completion error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
