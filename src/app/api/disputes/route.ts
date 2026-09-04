import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireAuth } from '@/lib/serverAuth';
import { DisputeSchema } from '@/lib/validations';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';

/**
 * GET: Fetch disputes for a specific errand
 */
export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.response) return authCheck.response;

    const callerId = authCheck.auth.user.id;
    const isAdmin = authCheck.auth.profile?.role === 'admin';

    const { searchParams } = new URL(request.url);
    const errandId = searchParams.get('errandId');

    if (!errandId) {
      return NextResponse.json({ success: false, error: 'errandId is required' }, { status: 400 });
    }

    // Verify errand party or admin
    const { data: errand, error: errandError } = await adminSupabase
      .from('errands')
      .select('id, requester_id, runner_id')
      .eq('id', errandId)
      .single();

    if (errandError || !errand) {
      return NextResponse.json({ success: false, error: 'Errand not found' }, { status: 404 });
    }

    if (errand.requester_id !== callerId && errand.runner_id !== callerId && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden: You are not a party to this errand' }, { status: 403 });
    }

    const { data: disputes, error } = await adminSupabase
      .from('disputes')
      .select('*')
      .eq('errand_id', errandId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch disputes' }, { status: 500 });
    }

    return NextResponse.json({ success: true, disputes });
  } catch (error: any) {
    console.error('Dispute fetch exception:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST: File a dispute on an errand
 */
export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.response) return authCheck.response;

    const initiatorId = authCheck.auth.user.id;

    const ip = getClientIp(request);
    const rate = checkRateLimit(`file-dispute:${initiatorId || ip}`, 5, 15 * 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    const body = await request.json();
    const parseResult = DisputeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { errandId, reason, description } = parseResult.data;

    // 1. Fetch errand and verify parties
    const { data: errand, error: errandError } = await adminSupabase
      .from('errands')
      .select('id, requester_id, runner_id, status')
      .eq('id', errandId)
      .single();

    if (errandError || !errand) {
      return NextResponse.json({ success: false, error: 'Errand not found' }, { status: 404 });
    }

    // Determine respondent
    let respondentId: string | null = null;
    if (initiatorId === errand.runner_id) {
      respondentId = errand.requester_id;
    } else if (initiatorId === errand.requester_id) {
      respondentId = errand.runner_id;
    } else {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only the requester or assigned runner can file a dispute' },
        { status: 403 }
      );
    }

    if (!respondentId) {
      return NextResponse.json(
        { success: false, error: 'Cannot file a dispute on an unassigned errand' },
        { status: 400 }
      );
    }

    // 2. Insert into disputes table
    const { data: dispute, error: disputeError } = await adminSupabase
      .from('disputes')
      .insert([
        {
          errand_id: errandId,
          initiator_id: initiatorId,
          respondent_id: respondentId,
          reason,
          description,
          status: 'open',
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (disputeError) {
      console.error('Failed to create dispute:', disputeError);
      return NextResponse.json({ success: false, error: 'Failed to file dispute' }, { status: 500 });
    }

    // 3. Mark errand as disputed
    await adminSupabase
      .from('errands')
      .update({ status: 'disputed', updated_at: new Date().toISOString() })
      .eq('id', errandId);

    return NextResponse.json({ success: true, dispute });
  } catch (error: any) {
    console.error('File dispute exception:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
