import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST: Submit a rating for an errand
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { errandId, raterId, rateeId, rating, review, categories } = body;

    if (!errandId || !raterId || !rateeId || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields: errandId, raterId, rateeId, rating' },
        { status: 400 }
      );
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json({ error: 'Rating must be a number between 1 and 5' }, { status: 400 });
    }

    // 1. Verify errand is completed
    const { data: errand, error: errandError } = await supabase
      .from('errands')
      .select('id, status')
      .eq('id', errandId)
      .single();

    if (errandError || !errand) {
      return NextResponse.json({ error: 'Errand not found' }, { status: 404 });
    }

    if (errand.status !== 'completed') {
      return NextResponse.json({ error: 'Can only rate completed errands' }, { status: 400 });
    }

    // 2. Insert into ratings table (upsert if already exists for this errand & rater)
    const { data: ratingRecord, error: insertError } = await supabase
      .from('ratings')
      .upsert(
        [
          {
            errand_id: errandId,
            rater_id: raterId,
            ratee_id: rateeId,
            rating: numRating,
            review: review || null,
            categories: categories || null,
          },
        ],
        { onConflict: 'errand_id,rater_id' }
      )
      .select()
      .single();

    if (insertError) {
      console.error('Error saving rating:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 3. Recalculate average rating for the ratee profile
    const { data: allRatings, error: fetchRatingsError } = await supabase
      .from('ratings')
      .select('rating')
      .eq('ratee_id', rateeId);

    if (!fetchRatingsError && allRatings && allRatings.length > 0) {
      const sum = allRatings.reduce((acc, curr) => acc + Number(curr.rating), 0);
      const avg = Number((sum / allRatings.length).toFixed(2));

      await supabase
        .from('profiles')
        .update({
          rating: avg,
          total_ratings: allRatings.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rateeId);
    }

    return NextResponse.json({
      success: true,
      data: ratingRecord,
      message: 'Rating submitted successfully',
    });
  } catch (error: any) {
    console.error('Rating submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET: Fetch rating for an errand or ratee
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const errandId = searchParams.get('errandId');
    const rateeId = searchParams.get('rateeId');

    let query = supabase.from('ratings').select('*');

    if (errandId) {
      query = query.eq('errand_id', errandId);
    } else if (rateeId) {
      query = query.eq('ratee_id', rateeId).order('created_at', { ascending: false });
    } else {
      return NextResponse.json({ error: 'Provide errandId or rateeId parameter' }, { status: 400 });
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Fetch ratings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
