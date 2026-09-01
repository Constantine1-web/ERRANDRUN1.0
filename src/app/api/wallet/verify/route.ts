import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { reference, userId } = await req.json();

    if (!reference || !userId) {
      return NextResponse.json({ success: false, error: 'Reference and userId required' }, { status: 400 });
    }

    // 1. Verify with Paystack API
    const response = await fetch('https://api.paystack.co/transaction/verify/' + reference, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + paystackSecretKey
      }
    });

    const data = await response.json();

    if (!data.status || data.data.status !== 'success') {
      return NextResponse.json({ success: false, error: 'Payment verification failed' }, { status: 400 });
    }

    // 2. Prevent duplicate processing
    const { data: existingTx } = await supabase
      .from('transactions')
      .select('id')
      .eq('reference', reference)
      .single();

    if (existingTx) {
      return NextResponse.json({ success: false, error: 'Transaction already processed' }, { status: 400 });
    }

    // Paystack amounts are in kobo (divide by 100)
    const amount = data.data.amount / 100;

    // 3. Record transaction
    const { error: txError } = await supabase.from('transactions').insert({
      user_id: userId,
      amount: amount,
      type: 'topup',
      status: 'success',
      reference: reference,
      description: 'Paystack Wallet Top-up'
    });

    if (txError) throw txError;

    // 4. Update Wallet Balance
    // First get current balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (walletError && walletError.code !== 'PGRST116') throw walletError;

    const newBalance = (wallet?.balance || 0) + amount;

    await supabase.from('wallets').upsert({
      user_id: userId,
      balance: newBalance,
      updated_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, balance: newBalance });
  } catch (error: any) {
    console.error('Wallet verify error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
