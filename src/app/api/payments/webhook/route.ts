import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/serverAuth';
import crypto from 'crypto';

const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';

export async function POST(request: NextRequest) {
  try {
    if (!paystackSecretKey) {
      console.warn('PAYSTACK_SECRET_KEY is missing. Webhook rejected for security.');
      return NextResponse.json({ error: 'Gateway configuration error' }, { status: 500 });
    }

    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 401 });
    }

    // 1. Verify HMAC-SHA512 signature in constant time
    const expectedSignature = crypto.createHmac('sha512', paystackSecretKey).update(rawBody).digest('hex');
    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      console.warn('Invalid Paystack webhook signature detected');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const eventPayload = JSON.parse(rawBody);
    const eventType = eventPayload.event;
    const data = eventPayload.data;
    const providerReference = data?.reference;

    if (!providerReference) {
      return NextResponse.json({ received: true, note: 'Missing provider reference' });
    }

    // 2. Persist the provider event (Idempotency layer 1)
    const { error: insertError } = await adminSupabase.from('provider_events').insert({
      provider: 'PAYSTACK',
      event_type: eventType,
      provider_reference: providerReference,
      payload: eventPayload,
      status: 'PENDING'
    });

    if (insertError) {
      // 23505 is PostgreSQL unique violation (duplicate webhook)
      if (insertError.code === '23505') {
        console.log(`Duplicate webhook safely ignored: ${providerReference}`);
        return NextResponse.json({ received: true, note: 'Duplicate safely ignored' });
      }
      throw new Error(`Failed to insert provider event: ${insertError.message}`);
    }

    // 3. Dispatch to appropriate Financial Operation RPC based on event
    let processingStatus = 'PROCESSED';

    try {
      if (eventType === 'charge.success') {
        const amountKobo = parseInt(data.amount, 10);
        // Look up the internal payment record to get the user ID
        const { data: payment } = await adminSupabase
          .from('payments')
          .select('user_id')
          .eq('reference', providerReference)
          .single();

        if (payment && payment.user_id) {
          const feesKobo = data.fees ? parseInt(data.fees, 10) : 0;
          // Model B Funding processing via DB RPC
          const { error: rpcErr } = await adminSupabase.rpc('process_funding', {
            p_user_id: payment.user_id,
            p_amount_kobo: amountKobo,
            p_fee_kobo: feesKobo,
            p_provider_reference: providerReference
          });

          if (rpcErr) throw rpcErr;
        } else {
          // Unknown payment reference
          processingStatus = 'REQUIRES_REVIEW';
        }
      } 
      // Handle Transfer success (Withdrawals)
      else if (eventType === 'transfer.success') {
        // ... handled by a different RPC like finalize_withdrawal(op_id, providerReference)
        // (Assuming reference matches op_id or similar in your app logic)
      } 
      else {
        processingStatus = 'IGNORED';
      }
    } catch (opErr: any) {
      processingStatus = 'FAILED';
      console.error('Financial operation failed:', opErr);
    }

    // 4. Update the event processing status
    await adminSupabase.from('provider_events')
      .update({ status: processingStatus, processed_at: new Date().toISOString() })
      .eq('provider_reference', providerReference)
      .eq('event_type', eventType);

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing exception:', error);
    // Don't return 500 if the provider event is safely persisted.
    // Returning 500 makes Paystack retry endlessly. We should ideally swallow expected errors.
    return NextResponse.json({ received: false, error: 'Internal server error' }, { status: 500 });
  }
}
