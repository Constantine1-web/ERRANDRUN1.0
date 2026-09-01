import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { errandId, runnerPayout, customerRefund, addRunnerStrike, addCustomerStrike, adminNotes } = body;

    if (!errandId) {
      return NextResponse.json({ success: false, error: 'errandId is required' }, { status: 400 });
    }

    // 1. Fetch errand and dispute
    const { data: errand, error: fetchError } = await supabase
      .from('errands')
      .select('*, disputes(*)')
      .eq('id', errandId)
      .single();

    if (fetchError || !errand) {
      return NextResponse.json({ success: false, error: 'Errand not found' }, { status: 404 });
    }

    // 2. Process Runner Strike
    if (addRunnerStrike && errand.runner_id) {
      const { data: runnerProfile } = await supabase.from('profiles').select('strikes').eq('id', errand.runner_id).single();
      const currentStrikes = runnerProfile?.strikes || 0;
      await supabase.from('profiles').update({ strikes: currentStrikes + 1 }).eq('id', errand.runner_id);
    }

    // 3. Process Customer Strike
    if (addCustomerStrike && errand.user_id) {
      const { data: customerProfile } = await supabase.from('profiles').select('strikes').eq('id', errand.user_id).single();
      const currentStrikes = customerProfile?.strikes || 0;
      await supabase.from('profiles').update({ strikes: currentStrikes + 1 }).eq('id', errand.user_id);
    }

    // 4. Resolve the errand status (mark as resolved)
    // Here we can mark it as 'completed' or 'cancelled' depending on if anyone was paid, but let's use 'resolved'
    const newStatus = runnerPayout > 0 ? 'completed' : 'cancelled';

    await supabase
      .from('errands')
      .update({
        status: newStatus,
        runner_amount: runnerPayout,
        // Calculate platform fee if any, or 0 if refunded
        platform_fee: errand.total_fee - runnerPayout - customerRefund
      })
      .eq('id', errandId);

    // 5. Update dispute record if it exists
    if (errand.disputes && errand.disputes.length > 0) {
      await supabase
        .from('disputes')
        .update({
          status: 'resolved',
          resolution_notes: adminNotes,
          resolved_at: new Date().toISOString()
        })
        .eq('errand_id', errandId);
    }

    // NOTE: Actual wallet transfers will happen here once the wallet logic is fully built
    // For now, this just resolves the contract state perfectly.

    return NextResponse.json({ success: true, message: 'Dispute resolved successfully' });
  } catch (error: any) {
    console.error('Dispute resolution error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
