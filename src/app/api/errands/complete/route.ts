import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { errandId } = body;

    if (!errandId) {
      return NextResponse.json({ error: 'errandId is required' }, { status: 400 });
    }

    const { data: errand, error: fetchError } = await supabase
      .from('errands')
      .select('id, status, runner_id, runner_amount')
      .eq('id', errandId)
      .single();

    if (fetchError || !errand) {
      console.error('Errand fetch error:', fetchError);
      return NextResponse.json({ error: 'Errand not found' }, { status: 404 });
    }

    if (errand.status === 'completed') {
      return NextResponse.json({ error: 'Errand already completed' }, { status: 400 });
    }

    if (errand.status === 'payment_pending' || errand.status === 'unassigned') {
      return NextResponse.json(
        { error: 'Cannot confirm completion until a runner is assigned and delivery has started' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('errands')
      .update({ status: 'completed', actual_completion_time: new Date().toISOString() })
      .eq('id', errandId);

    if (updateError) {
      console.error('Errand completion update failed:', updateError);
      return NextResponse.json({ error: 'Failed to complete errand' }, { status: 500 });
    }

    // Credit Runner Wallet
    if (errand.runner_id && errand.runner_amount > 0) {
      // Get current wallet balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id, balance, total_earned')
        .eq('user_id', errand.runner_id)
        .single();
        
      if (wallet) {
        const newBalance = Number(wallet.balance) + Number(errand.runner_amount);
        const newTotalEarned = Number(wallet.total_earned) + Number(errand.runner_amount);
        
        await supabase
          .from('wallets')
          .update({ 
            balance: newBalance, 
            total_earned: newTotalEarned, 
            last_updated: new Date().toISOString() 
          })
          .eq('id', wallet.id);
          
        await supabase
          .from('wallet_transactions')
          .insert({
            wallet_id: wallet.id,
            transaction_type: 'credit',
            amount: errand.runner_amount,
            reference_id: errand.id,
            reference_type: 'errand_completion',
            description: `Earnings for completed errand`,
            balance_after: newBalance
          });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Errand completion route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
