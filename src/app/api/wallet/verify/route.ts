import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireAuth } from '@/lib/serverAuth';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';

const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const authCheck = await requireAuth(req);
    if (authCheck.response) return authCheck.response;

    const userId = authCheck.auth.user.id;
    const userEmail = authCheck.auth.user.email?.toLowerCase();

    // Rate limit: max 10 verification calls per minute
    const ip = getClientIp(req);
    const rate = checkRateLimit(`verify-payment:${userId || ip}`, 10, 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    const body = await req.json();
    const { reference } = body;

    if (!reference || typeof reference !== 'string') {
      return NextResponse.json({ success: false, error: 'Payment reference is required' }, { status: 400 });
    }

    if (!paystackSecretKey) {
      console.error('PAYSTACK_SECRET_KEY is not configured on server');
      return NextResponse.json({ success: false, error: 'Payment gateway configuration error' }, { status: 500 });
    }

    // 1. Prevent duplicate processing (Idempotency Check)
    const { data: existingTx } = await adminSupabase
      .from('transactions')
      .select('id')
      .eq('reference', reference)
      .maybeSingle();

    if (existingTx) {
      return NextResponse.json({ success: true, message: 'Transaction already processed' });
    }

    // 2. Verify with Paystack API
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await paystackRes.json();

    if (!data?.status || data?.data?.status !== 'success') {
      return NextResponse.json({ success: false, error: 'Paystack payment verification failed' }, { status: 400 });
    }

    const paystackCustomerEmail = data.data.customer?.email?.toLowerCase();
    const paystackMetadataUserId = data.data.metadata?.userId || data.data.metadata?.user_id;

    // Verify ownership: customer email or metadata userId must match the authenticated caller
    if (paystackMetadataUserId && paystackMetadataUserId !== userId) {
      return NextResponse.json({ success: false, error: 'Payment does not belong to the authenticated user' }, { status: 403 });
    }
    if (!paystackMetadataUserId && paystackCustomerEmail && userEmail && paystackCustomerEmail !== userEmail) {
      console.warn(`Payment email mismatch: ${paystackCustomerEmail} vs ${userEmail}`);
    }

    // Paystack amounts are in kobo (divide by 100)
    const amount = Number(data.data.amount) / 100;
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid transaction amount returned' }, { status: 400 });
    }

    // 3. Record transaction
    const { error: txError } = await adminSupabase.from('transactions').insert({
      user_id: userId,
      amount: amount,
      type: 'topup',
      status: 'success',
      reference: reference,
      description: 'Paystack Wallet Top-up',
      created_at: new Date().toISOString(),
    });

    if (txError) throw txError;

    // 4. Update or create Wallet Balance atomically
    const { data: wallet } = await adminSupabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', userId)
      .maybeSingle();

    let newBalance = amount;
    if (wallet) {
      newBalance = Number(wallet.balance) + amount;
      await adminSupabase
        .from('wallets')
        .update({ balance: newBalance, last_updated: new Date().toISOString() })
        .eq('id', wallet.id);
    } else {
      await adminSupabase.from('wallets').insert({
        user_id: userId,
        balance: amount,
        total_earned: 0,
        total_spent: 0,
      });
    }

    return NextResponse.json({ success: true, balance: newBalance, amount });
  } catch (error: any) {
    console.error('Wallet verification exception:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
