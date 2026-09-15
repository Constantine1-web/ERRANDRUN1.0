import crypto from 'crypto';
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
    const amountKobo = Math.round(amount * 100);
    const idempotencyKey = crypto.randomUUID();

    // The atomic RPC handles checking the balance, creating the operation, 
    // drafting the journal, moving funds to Withdrawal Clearing, and updating the projection.
    const { data: rpcData, error: rpcError } = await adminSupabase.rpc('request_withdrawal', {
      p_user_id: userId,
      p_amount_kobo: amountKobo,
      p_idempotency_key: idempotencyKey
    });

    if (rpcError) {
      console.warn('Withdrawal RPC failed:', rpcError);
      return NextResponse.json(
        { success: false, error: rpcError.message || 'Failed to process withdrawal' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, operation_id: rpcData.operation_id, amount });
  } catch (error: any) {
    console.warn('Withdrawal exception:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
