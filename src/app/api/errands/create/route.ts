import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { requester_id, total_fee } = payload;

    if (!requester_id || !total_fee) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Check Wallet Balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', requester_id)
      .single();

    if (walletError || !wallet || Number(wallet.balance) < Number(total_fee)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Insufficient wallet balance. Please top up your wallet.' 
      }, { status: 400 });
    }

    // 2. Deduct Balance (Escrow Hold)
    const newBalance = Number(wallet.balance) - Number(total_fee);
    await supabase.from('wallets').update({ balance: newBalance }).eq('user_id', requester_id);

    // 3. Create Errand
    const deliveryPin = Math.floor(1000 + Math.random() * 9000).toString();
    const errandPayload = {
      ...payload,
      status: 'unassigned',
      delivery_pin: deliveryPin
    };

    const { data: errand, error: errandError } = await supabase
      .from('errands')
      .insert([errandPayload])
      .select('id')
      .single();

    if (errandError || !errand) {
      // Rollback
      await supabase.from('wallets').update({ balance: wallet.balance }).eq('user_id', requester_id);
      throw errandError || new Error('Failed to create errand');
    }

    // 4. Record Transaction
    await supabase.from('transactions').insert({
      user_id: requester_id,
      amount: total_fee,
      type: 'escrow_hold',
      status: 'success',
      reference: errand.id,
      description: 'Escrow hold for errand #' + errand.id
    });

    return NextResponse.json({ success: true, errandId: errand.id });
  } catch (error: any) {
    console.error('Errand creation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
