import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/serverAuth';
import crypto from 'crypto';

const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';

export async function POST(request: NextRequest) {
  try {
    if (!paystackSecretKey) {
      console.error('PAYSTACK_SECRET_KEY is missing. Webhook rejected for security.');
      return NextResponse.json({ error: 'Gateway configuration error' }, { status: 500 });
    }

    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 401 });
    }

    // 1. Verify HMAC-SHA512 signature in constant time (prevents timing attacks)
    const expectedSignature = crypto
      .createHmac('sha512', paystackSecretKey)
      .update(rawBody)
      .digest('hex');

    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      console.warn('Invalid Paystack webhook signature detected');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    // 2. Handle charge.success
    if (event.event === 'charge.success') {
      const data = event.data;
      const reference = data?.reference;
      const amountNaira = Number(data?.amount) / 100; // Paystack sends kobo

      if (!reference || isNaN(amountNaira) || amountNaira <= 0) {
        return NextResponse.json({ received: true, note: 'Malformed charge data' });
      }

      // Check if payment record exists
      const { data: payment, error: paymentError } = await adminSupabase
        .from('payments')
        .select('*')
        .eq('reference', reference)
        .maybeSingle();

      // If payment already completed, return immediately (Idempotency)
      if (payment && payment.status === 'completed') {
        return NextResponse.json({ received: true, note: 'Payment already processed' });
      }

      if (payment) {
        // Mark payment as completed
        await adminSupabase
          .from('payments')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        // A. If payment was for an errand, activate the errand to 'unassigned'
        if (payment.errand_id) {
          await adminSupabase
            .from('errands')
            .update({ status: 'unassigned', updated_at: new Date().toISOString() })
            .eq('id', payment.errand_id);
        } else {
          // B. Credit User Wallet
          const { data: wallet } = await adminSupabase
            .from('wallets')
            .select('id, balance, total_spent')
            .eq('user_id', payment.user_id)
            .maybeSingle();

          if (wallet) {
            const newBalance = Number(wallet.balance) + amountNaira;
            await adminSupabase
              .from('wallets')
              .update({
                balance: newBalance,
                last_updated: new Date().toISOString(),
              })
              .eq('id', wallet.id);

            // Record transaction idempotently
            const { data: existingTx } = await adminSupabase
              .from('transactions')
              .select('id')
              .eq('reference', reference)
              .maybeSingle();

            if (!existingTx) {
              await adminSupabase.from('transactions').insert({
                user_id: payment.user_id,
                amount: amountNaira,
                type: 'topup',
                status: 'success',
                reference,
                description: 'Paystack Automated Webhook Top-up',
                created_at: new Date().toISOString(),
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
