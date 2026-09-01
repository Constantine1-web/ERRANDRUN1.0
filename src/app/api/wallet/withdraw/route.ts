import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const { userId, amount } = await req.json();

    if (!userId || !amount || amount < 2000) {
      return NextResponse.json({ success: false, error: 'Invalid amount. Minimum withdrawal is N2000' }, { status: 400 });
    }

    // 1. Check Wallet Balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet || Number(wallet.balance) < Number(amount)) {
      return NextResponse.json({ success: false, error: 'Insufficient funds' }, { status: 400 });
    }

    // 2. Deduct Balance
    const newBalance = Number(wallet.balance) - Number(amount);
    await supabase.from('wallets').update({ balance: newBalance }).eq('user_id', userId);

    // 3. Record Withdrawal Transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      amount: amount,
      type: 'withdrawal',
      status: 'pending', // Pending admin manual payout
      description: 'Runner requested withdrawal to bank account'
    });

    return NextResponse.json({ success: true, balance: newBalance });
  } catch (error: any) {
    console.error('Withdrawal error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
