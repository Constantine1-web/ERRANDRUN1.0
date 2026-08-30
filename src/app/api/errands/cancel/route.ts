import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { errandId, userId, reason } = body;

    if (!errandId || !userId) {
      return NextResponse.json({ error: 'errandId and userId are required' }, { status: 400 });
    }

    // 1. Fetch errand
    const { data: errand, error: fetchError } = await supabase
      .from('errands')
      .select('*')
      .eq('id', errandId)
      .single();

    if (fetchError || !errand) {
      return NextResponse.json({ error: 'Errand not found' }, { status: 404 });
    }

    if (errand.requester_id !== userId) {
      return NextResponse.json({ error: 'Only the requester can cancel this errand' }, { status: 403 });
    }

    if (errand.status === 'completed' || errand.status === 'cancelled') {
      return NextResponse.json({ error: `Cannot cancel an errand with status: ${errand.status}` }, { status: 400 });
    }

    if (errand.status === 'assigned' || errand.status === 'in_progress') {
      return NextResponse.json(
        { error: 'A runner is already fulfilling this task. Please file a dispute or contact support to cancel.' },
        { status: 400 }
      );
    }

    // 2. Mark errand as cancelled
    const { error: updateError } = await supabase
      .from('errands')
      .update({
        status: 'cancelled',
        notes: reason ? `Cancelled by requester: ${reason}` : 'Cancelled by requester',
        updated_at: new Date().toISOString(),
      })
      .eq('id', errandId);

    if (updateError) {
      console.error('Errand cancel update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 3. If the errand was unassigned (meaning payment had been completed), refund the total_fee to requester wallet
    if (errand.status === 'unassigned' && errand.total_fee > 0) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (wallet) {
        const newBalance = Number(wallet.balance) + Number(errand.total_fee);
        await supabase
          .from('wallets')
          .update({
            balance: newBalance,
            last_updated: new Date().toISOString(),
          })
          .eq('id', wallet.id);

        await supabase.from('wallet_transactions').insert([
          {
            wallet_id: wallet.id,
            transaction_type: 'credit',
            amount: errand.total_fee,
            reference_id: errand.id,
            reference_type: 'refund',
            description: `Refund for cancelled errand #${errand.id.substring(0, 8)}`,
            balance_after: newBalance,
          },
        ]);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Errand cancelled successfully. Refund credited to your wallet.',
    });
  } catch (error: any) {
    console.error('Cancel errand error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
