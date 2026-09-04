import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireAuth } from '@/lib/serverAuth';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';
import axios from 'axios';

const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.response) return authCheck.response;

    const userId = authCheck.auth.user.id;

    const ip = getClientIp(request);
    const rate = checkRateLimit(`payment-init:${userId || ip}`, 10, 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    const body = await request.json();
    const { amount, email, errandId, metadata } = body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 100 || numAmount > 1000000) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount. Minimum is ₦100 and maximum is ₦1,000,000' },
        { status: 400 }
      );
    }

    const payerEmail = email || authCheck.auth.user.email;
    if (!payerEmail || typeof payerEmail !== 'string') {
      return NextResponse.json({ success: false, error: 'Valid email is required' }, { status: 400 });
    }

    if (!paystackSecretKey) {
      console.error('PAYSTACK_SECRET_KEY is not set');
      return NextResponse.json({ success: false, error: 'Payment gateway not configured' }, { status: 500 });
    }

    // 1. Create pending payment record in database
    const { data: payment, error: dbError } = await adminSupabase
      .from('payments')
      .insert([
        {
          user_id: userId,
          errand_id: errandId || null,
          amount: numAmount,
          payment_method: 'paystack',
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (dbError || !payment) {
      console.error('Payment record insert error:', dbError);
      return NextResponse.json({ success: false, error: 'Failed to initialize payment record' }, { status: 500 });
    }

    // 2. Initialize Paystack payment
    try {
      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: payerEmail,
          amount: Math.round(numAmount * 100), // Kobo
          metadata: {
            userId,
            paymentId: payment.id,
            errandId: errandId || null,
            ...(typeof metadata === 'object' ? metadata : {}),
          },
          channels: ['card', 'bank_transfer', 'ussd'],
          callback_url: errandId
            ? `${appUrl}/dashboard/user/errand/${errandId}`
            : `${appUrl}/dashboard/wallet`,
        },
        {
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Store reference
      await adminSupabase
        .from('payments')
        .update({ reference: response.data.data.reference })
        .eq('id', payment.id);

      return NextResponse.json({
        success: true,
        data: response.data.data,
        paymentId: payment.id,
      });
    } catch (paystackError: any) {
      console.error('Paystack initialize error:', paystackError?.response?.data || paystackError);
      await adminSupabase.from('payments').update({ status: 'failed' }).eq('id', payment.id);
      return NextResponse.json({ success: false, error: 'Failed to initialize payment with Paystack' }, { status: 502 });
    }
  } catch (error: any) {
    console.error('Payment initialization error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET: Verify Paystack payment with reference
 */
export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.response) return authCheck.response;

    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json({ success: false, error: 'Missing reference parameter' }, { status: 400 });
    }

    if (!paystackSecretKey) {
      return NextResponse.json({ success: false, error: 'Payment gateway configuration error' }, { status: 500 });
    }

    const response = await axios.get(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${paystackSecretKey}` },
    });

    const paystackData = response.data?.data;

    if (paystackData?.status === 'success') {
      const { data: payment } = await adminSupabase
        .from('payments')
        .select('*')
        .eq('reference', reference)
        .maybeSingle();

      if (payment && payment.status !== 'completed') {
        await adminSupabase
          .from('payments')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        if (payment.errand_id) {
          await adminSupabase
            .from('errands')
            .update({ status: 'unassigned' })
            .eq('id', payment.errand_id);
        } else {
          // Credit wallet
          const { data: wallet } = await adminSupabase
            .from('wallets')
            .select('id, balance')
            .eq('user_id', payment.user_id)
            .maybeSingle();

          if (wallet) {
            const newBal = Number(wallet.balance) + Number(payment.amount);
            await adminSupabase.from('wallets').update({ balance: newBal }).eq('id', wallet.id);
          }
        }
      }

      return NextResponse.json({ success: true, data: paystackData });
    }

    return NextResponse.json({ success: false, error: 'Payment verification failed' }, { status: 400 });
  } catch (error: any) {
    console.error('Payment verify GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
