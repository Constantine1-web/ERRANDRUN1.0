import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, amount, email, errandId, metadata } = body;

    if (!userId || !amount || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, amount, email' },
        { status: 400 }
      );
    }

    // Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create payment record in database first
    const { data: payment, error: dbError } = await supabase
      .from('payments')
      .insert([
        {
          user_id: userId,
          errand_id: errandId,
          amount,
          payment_method: 'paystack',
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 });
    }

    // Initialize Paystack payment
    try {
      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email,
          amount: Math.round(amount * 100), // Paystack uses kobo (100 kobo = 1 naira)
          metadata: {
            userId,
            paymentId: payment.id,
            errandId,
            ...metadata,
          },
          channels: ['card', 'bank_transfer', 'ussd'],
          callback_url: `${appUrl}/dashboard/user/errand/${errandId}?payment_reference=${payment.id}`,
        },
        {
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Update payment with Paystack reference
      await supabase
        .from('payments')
        .update({
          reference: response.data.data.reference,
        })
        .eq('id', payment.id);

      return NextResponse.json({
        success: true,
        data: response.data.data,
        paymentId: payment.id,
      });
    } catch (paystackError) {
      console.error('Paystack error:', paystackError);

      // Update payment status to failed
      await supabase.from('payments').update({ status: 'failed' }).eq('id', payment.id);

      return NextResponse.json(
        { error: 'Failed to initialize Paystack payment' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Payment initialization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Verify Paystack payment
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json(
        { error: 'Missing reference parameter' },
        { status: 400 }
      );
    }

    // Verify with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
      }
    );

    const paystackData = response.data.data;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update payment status in database
    if (paystackData.status === 'success') {
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('reference', reference)
        .single();

      if (payment) {
        // Update payment status
        await supabase
          .from('payments')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        // Mark errand confirmed when payment completes
        if (payment.errand_id) {
          await supabase
            .from('errands')
            .update({ status: 'unassigned' })
            .eq('id', payment.errand_id);
        }

        // Credit user wallet if not from an errand
        if (!payment.errand_id) {
          const wallet = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', payment.user_id)
            .single();

          if (wallet.data) {
            const newBalance = wallet.data.balance + payment.amount;
            await supabase
              .from('wallets')
              .update({
                balance: newBalance,
                total_spent: wallet.data.total_spent + payment.amount,
                last_updated: new Date().toISOString(),
              })
              .eq('id', wallet.data.id);

            // Add wallet transaction
            await supabase.from('wallet_transactions').insert([
              {
                wallet_id: wallet.data.id,
                transaction_type: 'credit',
                amount: payment.amount,
                reference_id: payment.id,
                reference_type: 'payment',
                description: `Payment via Paystack - Reference: ${reference}`,
                balance_after: newBalance,
              },
            ]);
          }
        }
      }
    }

    return NextResponse.json({
      success: paystackData.status === 'success',
      data: paystackData,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
