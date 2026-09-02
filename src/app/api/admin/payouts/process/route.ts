import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; // Service role client

export async function POST(req: Request) {
  try {
    const { transactionId } = await req.json();

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    // 1. Fetch transaction and verify it's pending
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select('*, profiles(bank_name, account_number, account_name, full_name, id)')
      .eq('id', transactionId)
      .eq('type', 'withdrawal')
      .eq('status', 'pending')
      .single();

    if (txError || !tx) {
      return NextResponse.json({ error: 'Pending transaction not found' }, { status: 404 });
    }

    const runner = tx.profiles;
    
    if (!runner.account_number || !runner.bank_name) {
      return NextResponse.json({ error: 'Runner has not provided bank details' }, { status: 400 });
    }

    // In a real production environment, you would call Paystack Transfer API here:
    // 1. Create Transfer Recipient (POST https://api.paystack.co/transferrecipient)
    // 2. Initiate Transfer (POST https://api.paystack.co/transfer)
    
    // For V1 / Dev, we will simulate the Paystack call success
    // await simulatePaystackTransfer(tx.amount, runner);

    // Update transaction to success
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ status: 'success', description: 'Withdrawal Processed (Automated API)' })
      .eq('id', transactionId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: 'Payout processed successfully' });
  } catch (error: any) {
    console.error('Payout error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
