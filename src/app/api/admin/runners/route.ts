import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireAdmin } from '@/lib/serverAuth';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireAdmin(request);
    if (authCheck.response) return authCheck.response;

    const ip = getClientIp(request);
    const rate = checkRateLimit(`admin-runners:${ip}`, 60, 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = adminSupabase
      .from('runner_apps')
      .select(`
        id,
        user_id,
        reg_number,
        campus_record_checked,
        transport_method,
        availability_schedule,
        document_proof_url,
        status,
        admin_notes,
        created_at,
        updated_at,
        profiles:user_id (
          id,
          full_name,
          student_id,
          phone_number,
          role,
          verification_status,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching runner apps:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch runner applications' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Admin runner apps error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAdmin(request);
    if (authCheck.response) return authCheck.response;

    const body = await request.json();
    const { applicationId, action, notes } = body;

    if (!applicationId || typeof applicationId !== 'string' || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing applicationId or action' },
        { status: 400 }
      );
    }

    if (!['approve', 'deny'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Action must be approve or deny' }, { status: 400 });
    }

    // 1. Fetch the application to get user_id
    const { data: app, error: fetchError } = await adminSupabase
      .from('runner_apps')
      .select('id, user_id, status')
      .eq('id', applicationId)
      .single();

    if (fetchError || !app) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'denied';

    // 2. Update runner_apps record
    const { error: appUpdateError } = await adminSupabase
      .from('runner_apps')
      .update({
        status: newStatus,
        admin_notes: notes ? String(notes).slice(0, 500) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (appUpdateError) {
      console.error('Failed to update runner application:', appUpdateError);
      return NextResponse.json({ success: false, error: 'Failed to update application' }, { status: 500 });
    }

    // 3. Update user profile role and verification status
    if (action === 'approve') {
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      const { error: profileError } = await adminSupabase
        .from('profiles')
        .update({
          role: 'runner',
          verification_status: 'verified',
          verification_expires_at: oneYearFromNow.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', app.user_id);

      if (profileError) {
        console.error('Failed to elevate profile role to runner:', profileError);
        return NextResponse.json({ success: false, error: 'Failed to update user profile' }, { status: 500 });
      }
    } else {
      await adminSupabase
        .from('profiles')
        .update({
          verification_status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', app.user_id);
    }

    return NextResponse.json({
      success: true,
      message: `Runner application ${newStatus} successfully`,
    });
  } catch (error: any) {
    console.error('Admin runner action error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
