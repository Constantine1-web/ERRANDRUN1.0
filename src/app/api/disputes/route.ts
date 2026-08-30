import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST: File a dispute on an errand
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { errandId, initiatorId, reason, description } = body;

    if (!errandId || !initiatorId || !reason || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: errandId, initiatorId, reason, description' },
        { status: 400 }
      );
    }

    // 1. Fetch the errand to verify parties
    const { data: errand, error: errandError } = await supabase
      .from('errands')
      .select('id, requester_id, runner_id, status')
      .eq('id', errandId)
      .single();

    if (errandError || !errand) {
      return NextResponse.json({ error: 'Errand not found' }, { status: 404 });
    }

    // Determine respondent
    let respondentId = errand.runner_id;
    if (initiatorId === errand.runner_id) {
      respondentId = errand.requester_id;
    } else if (initiatorId !== errand.requester_id) {
      return NextResponse.json(
        { error: 'Only the requester or assigned runner can file a dispute on this errand' },
        { status: 403 }
      );
    }

    if (!respondentId) {
      return NextResponse.json(
        { error: 'Cannot file a dispute on an unassigned errand' },
        { status: 400 }
      );
    }

    // 2. Insert into disputes table
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .insert([
        {
          errand_id: errandId,
          initiator_id: initiatorId,
          respondent_id: respondentId,
          reason,
          description,
          status: 'open',
        },
      ])
      .select()
      .single();

    if (disputeError) {
      console.error('Error inserting dispute:', disputeError);
      return NextResponse.json({ error: disputeError.message }, { status: 500 });
    }

    // 3. Mark errand as disputed if not already completed
    if (errand.status !== 'completed' && errand.status !== 'cancelled') {
      await supabase
        .from('errands')
        .update({ status: 'disputed', updated_at: new Date().toISOString() })
        .eq('id', errandId);
    }

    return NextResponse.json({
      success: true,
      data: dispute,
      message: 'Dispute submitted. Our admin team will investigate and arbitrate.',
    });
  } catch (error: any) {
    console.error('Dispute filing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET: Fetch dispute for an errand
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const errandId = searchParams.get('errandId');

    if (!errandId) {
      return NextResponse.json({ error: 'errandId is required' }, { status: 400 });
    }

    const { data: dispute, error } = await supabase
      .from('disputes')
      .select('*')
      .eq('errand_id', errandId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: dispute || null });
  } catch (error: any) {
    console.error('Fetch dispute error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
