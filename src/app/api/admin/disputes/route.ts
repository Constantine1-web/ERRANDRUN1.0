import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('disputes')
      .select(`
        *,
        initiator:initiator_id (id, full_name, phone_number, student_id),
        respondent:respondent_id (id, full_name, phone_number, student_id),
        errand:errand_id (id, title, total_fee, runner_amount, platform_fee, status, delivery_pin, pickup_photo_url, dropoff_photo_url)
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Admin disputes fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Admin disputes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { disputeId, resolutionType, resolutionAmount, adminNotes, status } = body;

    if (!disputeId) {
      return NextResponse.json({ error: 'disputeId is required' }, { status: 400 });
    }

    const updates: any = {
      status: status || 'resolved',
      resolution_type: resolutionType || 'no_action',
      resolution_amount: resolutionAmount ? Number(resolutionAmount) : null,
      admin_notes: adminNotes || null,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('disputes').update(updates).eq('id', disputeId);

    if (error) {
      console.error('Admin dispute update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Dispute updated successfully' });
  } catch (error: any) {
    console.error('Admin dispute resolution error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


