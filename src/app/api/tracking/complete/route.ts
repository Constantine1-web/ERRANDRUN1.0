import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireRunner } from '@/lib/serverAuth';
import { VerifyPinSchema } from '@/lib/validations';
import { checkRateLimit, rateLimitExceededResponse } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireRunner(request);
    if (authCheck.response) return authCheck.response;

    const runnerId = authCheck.auth.user.id;

    const body = await request.json();
    const parseResult = VerifyPinSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { errandId, pin } = parseResult.data;

    // Rate limit PIN attempts: max 5 attempts per errand per 15 minutes (Anti-Brute Force)
    const pinRate = checkRateLimit(`pin-attempt:${errandId}`, 5, 15 * 60 * 1000);
    if (!pinRate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maximum PIN verification attempts exceeded. For security, please contact support or the requester.',
          retryAfterSeconds: pinRate.resetTime,
        },
        { status: 429 }
      );
    }

    // 1. Fetch Errand and verify runner assignment
    const { data: errand, error: fetchError } = await adminSupabase
      .from('errands')
      .select('id, delivery_pin, status, runner_id, runner_amount, platform_fee, total_fee')
      .eq('id', errandId)
      .eq('runner_id', runnerId)
      .single();

    if (fetchError || !errand) {
      return NextResponse.json(
        { success: false, error: 'Errand not found or you are not the assigned runner' },
        { status: 404 }
      );
    }

    if (errand.status !== 'in_progress') {
      return NextResponse.json(
        { success: false, error: `Cannot complete delivery. Current status: ${errand.status}` },
        { status: 400 }
      );
    }

    // 2. Validate PIN (safe comparison)
    if (errand.delivery_pin !== pin) {
      return NextResponse.json(
        {
          success: false,
          error: `Incorrect Delivery PIN. ${pinRate.remaining} attempt(s) remaining before security lockout.`,
          attemptsRemaining: pinRate.remaining,
        },
        { status: 400 }
      );
    }

    // 3. Atomically mark as completed
    const { data: updatedErrand, error: updateError } = await adminSupabase
      .from('errands')
      .update({
        status: 'completed',
        actual_completion_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', errandId)
      .eq('status', 'in_progress')
      .select()
      .single();

    if (updateError || !updatedErrand) {
      return NextResponse.json({ success: false, error: 'Failed to update delivery status' }, { status: 500 });
    }

    // 4. Credit Runner Wallet with Payout
    const payoutAmount = Number(updatedErrand.runner_amount || 0);
    const { data: runnerWallet } = await adminSupabase
      .from('wallets')
      .select('id, balance, total_earned')
      .eq('user_id', runnerId)
      .maybeSingle();

    if (runnerWallet) {
      const newBal = Number(runnerWallet.balance) + payoutAmount;
      const newEarned = Number(runnerWallet.total_earned || 0) + payoutAmount;

      await adminSupabase
        .from('wallets')
        .update({
          balance: newBal,
          total_earned: newEarned,
          last_updated: new Date().toISOString(),
        })
        .eq('id', runnerWallet.id);

      // Record payout transaction
      await adminSupabase.from('transactions').insert({
        user_id: runnerId,
        amount: payoutAmount,
        type: 'payout',
        status: 'success',
        reference: errandId,
        description: `Payout for completing errand #${errandId.slice(0, 8)}`,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Delivery confirmed and payout credited successfully',
      runnerAmount: payoutAmount,
    });
  } catch (error: any) {
    console.error('Delivery completion error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
