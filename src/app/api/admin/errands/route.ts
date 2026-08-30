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
      .from('errands')
      .select(`
        *,
        requester:requester_id (id, full_name, phone_number, student_id),
        runner:runner_id (id, full_name, phone_number, student_id, rating)
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Admin errands fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Admin errands error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { errandId, action, notes } = body;

    if (!errandId || !action) {
      return NextResponse.json({ error: 'errandId and action are required' }, { status: 400 });
    }

    if (action === 'cancel') {
      const { error } = await supabase
        .from('errands')
        .update({ status: 'cancelled', notes: notes || 'Cancelled by admin', updated_at: new Date().toISOString() })
        .eq('id', errandId);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Errand cancelled by admin.' });
    }

    if (action === 'complete') {
      const { error } = await supabase
        .from('errands')
        .update({ status: 'completed', actual_completion_time: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', errandId);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Errand manually marked completed.' });
    }

    if (action === 'unassign') {
      const { error } = await supabase
        .from('errands')
        .update({ status: 'unassigned', runner_id: null, updated_at: new Date().toISOString() })
        .eq('id', errandId);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Runner unassigned. Errand returned to open pool.' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin errand update error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
