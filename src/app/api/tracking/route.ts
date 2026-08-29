import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function getErrandStatusFromUpdate(statusUpdate: string) {
  const normalized = statusUpdate.toLowerCase();

  if (normalized.includes('completed') || normalized.includes('delivered')) {
    return 'completed';
  }
  if (normalized.includes('in_progress') || normalized.includes('in progress') || normalized.includes('picked')) {
    return 'in_progress';
  }
  if (normalized.includes('assigned')) {
    return 'assigned';
  }
  if (normalized.includes('disputed')) {
    return 'disputed';
  }
  if (normalized.includes('cancelled') || normalized.includes('canceled')) {
    return 'cancelled';
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { errandId, runnerId, statusUpdate, currentLocation, runnerNotes } = body;

    if (!errandId || !runnerId || !statusUpdate) {
      return NextResponse.json(
        { error: 'Missing required fields: errandId, runnerId, statusUpdate' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.from('errand_tracking').insert([
      {
        errand_id: errandId,
        status_update: statusUpdate,
        current_location: currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : null,
        runner_notes: runnerNotes ?? null,
      },
    ]).select().single();

    if (error) {
      console.error('Tracking insert error:', error);
      return NextResponse.json({ error: 'Failed to save tracking update' }, { status: 500 });
    }

    const newStatus = getErrandStatusFromUpdate(statusUpdate);
    if (newStatus) {
      await supabase.from('errands').update({ status: newStatus }).eq('id', errandId);
    }

    return NextResponse.json({ success: true, tracking: data });
  } catch (error) {
    console.error('Tracking endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
