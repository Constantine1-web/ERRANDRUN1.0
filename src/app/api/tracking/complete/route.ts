import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { errandId, runnerId, pin } = await request.json();

    if (!errandId || !runnerId || !pin) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify PIN
    const { data: errand, error: fetchError } = await supabase
      .from('errands')
      .select('delivery_pin, status')
      .eq('id', errandId)
      .eq('runner_id', runnerId)
      .single();

    if (fetchError || !errand) {
      return NextResponse.json({ error: 'Errand not found or you are not the assigned runner' }, { status: 404 });
    }

    if (errand.status !== 'in_progress') {
      return NextResponse.json({ error: 'Errand is not in progress' }, { status: 400 });
    }

    if (errand.delivery_pin !== pin) {
      return NextResponse.json({ error: 'Invalid Delivery PIN' }, { status: 400 });
    }

    // PIN matched, update status to completed
    const { error: updateError } = await supabase
      .from('errands')
      .update({ status: 'completed', actual_completion_time: new Date().toISOString() })
      .eq('id', errandId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to complete errand' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Complete errand error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
