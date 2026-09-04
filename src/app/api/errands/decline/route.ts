import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireRunner } from '@/lib/serverAuth';
import { DeclineErrandSchema } from '@/lib/validations';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const authCheck = await requireRunner(req);
    if (authCheck.response) return authCheck.response;

    const runnerId = authCheck.auth.user.id;

    const ip = getClientIp(req);
    const rate = checkRateLimit(`decline-errand:${runnerId || ip}`, 20, 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    const body = await req.json();
    const parseResult = DeclineErrandSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid decline payload', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { errandId } = parseResult.data;

    // Verify the errand is currently assigned to this runner
    const { data: existing, error: fetchError } = await adminSupabase
      .from('errands')
      .select('id, runner_id, status')
      .eq('id', errandId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ success: false, error: 'Errand not found' }, { status: 404 });
    }

    if (existing.runner_id !== runnerId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You are not assigned to this errand' },
        { status: 403 }
      );
    }

    // Reset errand to unassigned
    const { error: updateError } = await adminSupabase
      .from('errands')
      .update({ runner_id: null, status: 'unassigned', updated_at: new Date().toISOString() })
      .eq('id', errandId);

    if (updateError) {
      console.error('Failed to decline errand:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to update errand' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Errand unassigned successfully' });
  } catch (err: any) {
    console.error('Decline errand error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
