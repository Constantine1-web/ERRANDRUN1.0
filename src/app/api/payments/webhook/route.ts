import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    // 1. Verify HMAC-SHA512 signature
    if (paystackSecretKey) {
      const hash = crypto
        .createHmac('sha512', paystackSecretKey)
        .update(rawBody)
        .digest('hex');

      if (hash !== signature) {
        console.warn('Paystack webhook signature mismatch');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Handle successful charge
    if (event.event === 'charge.success') {
      const data = event.data;
      const reference = data.reference;
      const amountNaira = data.amount / 100; // Paystack sends kobo

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('reference', reference)
        .single();

      if (paymentError || !payment) {
        console.warn(`Payment with reference ${reference} not found in database`);
        return NextResponse.json({ received: true, note: 'Payment record not found' });
      }

      if (payment.status !== 'completed') {
        // Mark payment as completed
        await supabase
          .from('payments')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        // A. If payment was for an errand, activate the errand to 'unassigned'
        if (payment.errand_id) {
          await supabase
            .from('errands')
            .update({ status: 'unassigned', updated_at: new Date().toISOString() })
            .eq('id', payment.errand_id);
        }

        // B. If payment was a wallet top-up, credit the user's wallet
        if (!payment.errand_id) {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', payment.user_id)
            .single();

          if (wallet) {
            const newBalance = Number(wallet.balance) + Number(amountNaira);
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
                amount: amountNaira,
                reference_id: payment.id,
                reference_type: 'payment',
                description: `Deposit via Paystack Webhook - Ref: ${reference}`,
                balance_after: newBalance,
              },
            ]);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Paystack webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
