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

    // Verify the errand is currently assigned to this runner
    const { data: existing, error: fetchError } = await supabase
      .from('errands')
      .select('id, runner_id, status')
      .eq('id', errandId)
      .single();

    if (fetchError) {
      console.error('Failed to fetch errand before decline:', fetchError);
      return NextResponse.json({ success: false, error: 'Failed to fetch errand' }, { status: 500 });
    }

    if (!existing || existing.runner_id !== runnerId) {
      return NextResponse.json({ success: false, error: 'Errand not assigned to this runner' }, { status: 403 });
    }

    // Clear runner assignment and mark as unassigned
    const { error: updateError } = await supabase
      .from('errands')
      .update({ runner_id: null, status: 'unassigned' })
      .eq('id', errandId);

    if (updateError) {
      console.error('Failed to decline errand:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to update errand' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Decline errand error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
