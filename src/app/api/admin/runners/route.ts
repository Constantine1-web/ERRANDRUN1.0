import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET: Fetch all runner applications with associated profiles
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Admin runner apps error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST: Review application (Approve or Reject)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appId, userId, action, adminNotes } = body;

    if (!appId || !userId || !action) {
      return NextResponse.json(
        { error: 'appId, userId, and action (approve | reject) are required' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action. Must be approve or reject' }, { status: 400 });
    }

    if (action === 'approve') {
      // Fetch capacity dynamically using the new route logic
      // 1. Get current settings
      const { data: settingData, error: settingError } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'runner_limit')
        .single();

      let settings = { max_active_runners: 50, dynamic_ratio_enabled: true, users_per_runner: 5 };
      if (!settingError && settingData) {
        settings = { ...settings, ...settingData.setting_value };
      }

      // 2. Count active verified runners
      const { count: runnersCount, error: countError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'runner')
        .eq('verification_status', 'verified');

      if (countError) throw countError;
      
      let currentLimit = settings.max_active_runners;
      
      // 3. If dynamic ratio is enabled, calculate limit
      if (settings.dynamic_ratio_enabled) {
        const { count: usersCount, error: usersCountError } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'user');
          
        if (!usersCountError && usersCount !== null) {
          const dynamicLimit = Math.max(10, Math.floor(usersCount / settings.users_per_runner));
          currentLimit = Math.min(settings.max_active_runners, dynamicLimit);
        }
      }

      if ((runnersCount || 0) >= currentLimit) {
        return NextResponse.json(
          { error: `Cannot approve runner: Platform has reached its current maximum runner capacity of ${currentLimit}.` },
          { status: 403 }
        );
      }
    }

    const newAppStatus = action === 'approve' ? 'approved' : 'denied';
    const newProfileStatus = action === 'approve' ? 'verified' : 'rejected';
    const newProfileRole = action === 'approve' ? 'runner' : 'user';

    // 1. Update runner_apps record
    const { error: appError } = await supabase
      .from('runner_apps')
      .update({
        status: newAppStatus,
        admin_notes: adminNotes || null,
        campus_record_checked: action === 'approve',
        updated_at: new Date().toISOString(),
      })
      .eq('id', appId);

    if (appError) {
      console.error('Error updating runner app:', appError);
      return NextResponse.json({ error: appError.message }, { status: 500 });
    }

    // 2. Update profiles record
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role: newProfileRole,
        verification_status: newProfileStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Runner application has been ${newAppStatus}. Profile role set to ${newProfileRole}.`,
    });
  } catch (error: any) {
    console.error('Runner vetting error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
