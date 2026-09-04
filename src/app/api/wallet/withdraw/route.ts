import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireAuth } from '@/lib/serverAuth';
import { WithdrawSchema } from '@/lib/validations';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const authCheck = await requireAuth(req);
    if (authCheck.response) return authCheck.response;

    const userId = authCheck.auth.user.id;

    // Rate limit: max 5 withdrawal requests per 10 minutes per user
    const ip = getClientIp(req);
    const rate = checkRateLimit(`withdraw:${userId || ip}`, 5, 10 * 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    const body = await req.json();
    const parseResult = WithdrawSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { amount } = parseResult.data;

    // 1. Fetch Verified Wallet Balance
    const { data: wallet, error: walletError } = await adminSupabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet || Number(wallet.balance) < amount) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient funds. Your available balance is ₦${Number(wallet?.balance || 0).toLocaleString()}`,
        },
        { status: 400 }
      );
    }

    // 2. Deduct Balance Atomically
    const newBalance = Number(wallet.balance) - amount;
    const { error: updateError } = await adminSupabase
      .from('wallets')
      .update({ balance: newBalance, last_updated: new Date().toISOString() })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to deduct withdrawal balance:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to process withdrawal' }, { status: 500 });
    }

    // 3. Record Withdrawal Transaction
    const { error: txError } = await adminSupabase.from('transactions').insert({
      user_id: userId,
      amount: amount,
      type: 'withdrawal',
      status: 'pending',
      description: 'Runner requested payout to bank account',
      created_at: new Date().toISOString(),
    });

    if (txError) {
      // Rollback balance deduction
      await adminSupabase.from('wallets').update({ balance: wallet.balance }).eq('user_id', userId);
      console.error('Transaction insert failed, rolled back:', txError);
      return NextResponse.json({ success: false, error: 'Transaction recording failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, balance: newBalance, amount });
  } catch (error: any) {
    console.error('Withdrawal exception:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
