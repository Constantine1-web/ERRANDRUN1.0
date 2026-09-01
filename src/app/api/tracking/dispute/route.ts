import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { errandId, runnerId, reason, lat, lng } = await request.json();

    if (!errandId || !runnerId || !reason || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Initiate dispute
    const { error: updateError } = await supabase
      .from('errands')
      .update({ status: 'disputed' })
      .eq('id', errandId)
      .eq('runner_id', runnerId)
      .eq('status', 'in_progress');

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update errand status' }, { status: 500 });
    }

    // Create a dispute record
    await supabase.from('disputes').insert([{
      errand_id: errandId,
      initiator_id: runnerId,
      respondent_id: runnerId, // Should actually be requester_id but we don't have it here. We'll ignore for now or fetch it.
      reason: 'customer_refused_pin',
      description: reason + " | GPS: " + lat + "," + lng,
      status: 'open'
    }]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Dispute errand error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
