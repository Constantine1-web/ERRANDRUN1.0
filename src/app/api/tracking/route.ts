import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireRunner } from '@/lib/serverAuth';
import { TrackingUpdateSchema } from '@/lib/validations';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireRunner(request);
    if (authCheck.response) return authCheck.response;

    const runnerId = authCheck.auth.user.id;

    const ip = getClientIp(request);
    const rate = checkRateLimit(`tracking:${runnerId || ip}`, 60, 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    const body = await request.json();
    const parseResult = TrackingUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid tracking payload', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { errandId, statusUpdate, currentLocation, runnerNotes } = parseResult.data;

    // 1. Verify errand belongs to this runner
    const { data: errand, error: errandError } = await adminSupabase
      .from('errands')
      .select('id, runner_id, status')
      .eq('id', errandId)
      .single();

    if (errandError || !errand) {
      return NextResponse.json({ success: false, error: 'Errand not found' }, { status: 404 });
    }

    if (errand.runner_id !== runnerId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You are not the assigned runner for this errand' },
        { status: 403 }
      );
    }

    // 2. Insert tracking telemetry
    const { data, error } = await adminSupabase.from('errand_tracking').insert([
      {
        errand_id: errandId,
        status_update: statusUpdate,
        current_location: currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : null,
        runner_notes: runnerNotes || null,
        created_at: new Date().toISOString(),
      },
    ]).select().single();

    if (error) {
      console.error('Tracking telemetry insert error:', error);
      return NextResponse.json({ success: false, error: 'Failed to record tracking update' }, { status: 500 });
    }

    // 3. Update errand status if transitioning to in_progress
    const lowerUpdate = statusUpdate.toLowerCase();
    if (lowerUpdate.includes('pick') || lowerUpdate.includes('in_progress') || lowerUpdate.includes('in progress')) {
      if (errand.status === 'assigned') {
        await adminSupabase
          .from('errands')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', errandId);
      }
    }

    return NextResponse.json({ success: true, tracking: data });
  } catch (error: any) {
    console.error('Tracking update exception:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
