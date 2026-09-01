import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { errandId, runnerId, pin } = await request.json();

    if (!errandId || !runnerId || !pin) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify PIN
    const { data: errand, error: fetchError } = await supabase
      .from('errands')
      .select('delivery_pin, status, runner_amount')
      .eq('id', errandId)
      .eq('runner_id', runnerId)
      .single();

    if (fetchError || !errand) {
      return NextResponse.json({ error: 'Errand not found or you are not the assigned runner' }, { status: 404 });
    }

    if (errand.status !== 'in_progress') {
      return NextResponse.json({ error: 'Errand is not in progress' }, { status: 400 });
    }

    if (errand.delivery_pin !== pin) {
      return NextResponse.json({ error: 'Invalid Delivery PIN' }, { status: 400 });
    }

        // PIN matched, update status to completed
    const { data: updatedErrand, error: updateError } = await supabase
      .from('errands')
      .update({ status: 'completed', actual_completion_time: new Date().toISOString() })
      .eq('id', errandId)
      .select('runner_amount, platform_fee, total_fee')
      .single();

    if (updateError || !updatedErrand) {
      return NextResponse.json({ error: 'Failed to complete errand' }, { status: 500 });
    }

    // 1. Get runner's wallet
    const { data: runnerWallet } = await supabase.from('wallets').select('balance').eq('user_id', runnerId).single();
    const runnerBalance = runnerWallet ? Number(runnerWallet.balance) : 0;
    
    // 2. Credit runner's wallet
    await supabase.from('wallets').upsert({
      user_id: runnerId,
      balance: runnerBalance + Number(updatedErrand.runner_amount),
      updated_at: new Date().toISOString()
    });

    // 3. Record Payout Transaction
    await supabase.from('transactions').insert([
      {
        user_id: runnerId,
        amount: updatedErrand.runner_amount,
        type: 'payout',
        status: 'success',
        reference: errandId,
        description: 'Payout for completing errand #' + errandId
      },
      {
        user_id: '00000000-0000-0000-0000-000000000000', // Platform/Admin
        amount: updatedErrand.platform_fee,
        type: 'platform_fee',
        status: 'success',
        reference: errandId,
        description: 'Platform fee for errand #' + errandId
      }
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Complete errand error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

