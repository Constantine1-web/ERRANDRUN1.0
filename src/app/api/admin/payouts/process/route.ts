import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireAdmin } from '@/lib/serverAuth';
import { AdminProcessPayoutSchema } from '@/lib/validations';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const authCheck = await requireAdmin(req);
    if (authCheck.response) return authCheck.response;

    const ip = getClientIp(req);
    const rate = checkRateLimit(`admin-payouts:${ip}`, 30, 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    const body = await req.json();
    const parseResult = AdminProcessPayoutSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid payout request payload', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { transactionId } = parseResult.data;

    // 1. Fetch transaction and verify it's pending withdrawal
    const { data: tx, error: txError } = await adminSupabase
      .from('transactions')
      .select('*, profiles(bank_name, account_number, account_name, full_name, id)')
      .eq('id', transactionId)
      .eq('type', 'withdrawal')
      .eq('status', 'pending')
      .single();

    if (txError || !tx) {
      return NextResponse.json({ success: false, error: 'Pending withdrawal transaction not found' }, { status: 404 });
    }

    const runner = tx.profiles;
    
    if (!runner?.account_number || !runner?.bank_name) {
      return NextResponse.json({ success: false, error: 'Runner has not provided complete bank details' }, { status: 400 });
    }

    // 2. Update transaction to success atomically
    const { error: updateError } = await adminSupabase
      .from('transactions')
      .update({
        status: 'success',
        description: `Withdrawal processed by admin (${authCheck.auth.user.email})`,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .eq('status', 'pending');

    if (updateError) {
      console.error('Failed to update payout transaction:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to process payout transaction' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Payout processed successfully' });
  } catch (error: any) {
    console.error('Payout processing error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
