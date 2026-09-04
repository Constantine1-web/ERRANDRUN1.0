import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireAuth } from '@/lib/serverAuth';
import { RatingSchema } from '@/lib/validations';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';

/**
 * GET: Fetch ratings for an errand
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const errandId = searchParams.get('errandId');

    if (!errandId) {
      return NextResponse.json({ success: false, error: 'errandId query parameter required' }, { status: 400 });
    }

    const { data: ratings, error } = await adminSupabase
      .from('ratings')
      .select(`
        *,
        rater:rater_id (id, full_name, avatar_url)
      `)
      .eq('errand_id', errandId);

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch ratings' }, { status: 500 });
    }

    return NextResponse.json({ success: true, ratings });
  } catch (error: any) {
    console.error('Rating fetch error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST: Submit a rating for an errand
 */
export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.response) return authCheck.response;

    const raterId = authCheck.auth.user.id;

    const ip = getClientIp(request);
    const rate = checkRateLimit(`rate-errand:${raterId || ip}`, 10, 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    const body = await request.json();
    const parseResult = RatingSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid rating payload', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { errandId, rating, review, categories } = parseResult.data;

    // 1. Verify errand is completed and caller was a legitimate party
    const { data: errand, error: errandError } = await adminSupabase
      .from('errands')
      .select('id, requester_id, runner_id, status')
      .eq('id', errandId)
      .single();

    if (errandError || !errand) {
      return NextResponse.json({ success: false, error: 'Errand not found' }, { status: 404 });
    }

    if (errand.status !== 'completed') {
      return NextResponse.json({ success: false, error: 'You can only rate completed errands' }, { status: 400 });
    }

    // Determine the ratee
    let rateeId: string | null = null;
    if (raterId === errand.requester_id) {
      rateeId = errand.runner_id;
    } else if (raterId === errand.runner_id) {
      rateeId = errand.requester_id;
    } else {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You were not a participant in this errand' },
        { status: 403 }
      );
    }

    if (!rateeId) {
      return NextResponse.json({ success: false, error: 'No counterparty found to rate' }, { status: 400 });
    }

    // 2. Insert or update rating
    const { data: ratingRecord, error: insertError } = await adminSupabase
      .from('ratings')
      .upsert(
        [
          {
            errand_id: errandId,
            rater_id: raterId,
            ratee_id: rateeId,
            rating,
            review: review || null,
            categories: categories || null,
            created_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'errand_id,rater_id' }
      )
      .select()
      .single();

    if (insertError) {
      console.error('Rating insert error:', insertError);
      return NextResponse.json({ success: false, error: 'Failed to record rating' }, { status: 500 });
    }

    // 3. Update the average rating on the ratee's profile
    const { data: allRatings } = await adminSupabase
      .from('ratings')
      .select('rating')
      .eq('ratee_id', rateeId);

    if (allRatings && allRatings.length > 0) {
      const avg = allRatings.reduce((sum, r) => sum + Number(r.rating), 0) / allRatings.length;
      const roundedAvg = Math.round(avg * 10) / 10;

      await adminSupabase
        .from('profiles')
        .update({ rating: roundedAvg, total_ratings: allRatings.length })
        .eq('id', rateeId);
    }

    return NextResponse.json({ success: true, rating: ratingRecord });
  } catch (error: any) {
    console.error('Rating submission exception:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
