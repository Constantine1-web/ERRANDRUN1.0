import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { errandId, runnerId } = body || {};

    if (!errandId || !runnerId) {
      return NextResponse.json({ success: false, error: 'errandId and runnerId required' }, { status: 400 });
    }

    // Fetch errand to ensure it's unassigned and get fee
    const { data: errand, error: fetchError } = await supabase
      .from('errands')
      .select('id, total_fee, status')
      .eq('id', errandId)
      .single();

    if (fetchError) {
      console.error('Failed to fetch errand during accept:', fetchError);
      return NextResponse.json({ success: false, error: 'Failed to fetch errand' }, { status: 500 });
    }

    if (!errand || errand.status !== 'unassigned') {
      return NextResponse.json({ success: false, error: 'Errand is not available' }, { status: 409 });
    }

    // Compute fee split
    const totalFee = Number(errand.total_fee || 0);
    const runner_amount = Math.round(totalFee * 0.8);
    const platform_fee = totalFee - runner_amount;

    // Atomically assign runner only if still unassigned
    const { data: updated, error: updateError } = await supabase
      .from('errands')
      .update({ runner_id: runnerId, status: 'assigned', runner_amount, platform_fee })
      .eq('id', errandId)
      .eq('status', 'unassigned')
      .select()
      .single();

    if (updateError) {
      console.error('Failed to assign errand:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to assign errand' }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Errand already claimed' }, { status: 409 });
    }

    return NextResponse.json({ success: true, errand: updated });
  } catch (err) {
    console.error('Accept errand error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
