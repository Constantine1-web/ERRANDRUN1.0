import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const runnerId = request.nextUrl.searchParams.get('runnerId');
    if (!runnerId) {
      return NextResponse.json({ error: 'runnerId query parameter is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('errands')
      .select('id, title, pickup_location, delivery_location, total_fee, status, created_at')
      .eq('runner_id', runnerId)
      .in('status', ['assigned', 'in_progress'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching runner tasks:', error);
      return NextResponse.json({ error: 'Unable to load runner tasks' }, { status: 500 });
    }

    return NextResponse.json({ success: true, tasks: data });
  } catch (error) {
    console.error('Runner tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
