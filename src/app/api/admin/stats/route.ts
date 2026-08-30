import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
    // 1. Total & completed errands
    const { data: errands, error: errandsError } = await supabase
      .from('errands')
      .select('id, status, total_fee, platform_fee, runner_amount, created_at');

    if (errandsError) throw errandsError;

    const totalErrands = errands?.length || 0;
    const completedErrands = errands?.filter((e) => e.status === 'completed') || [];
    const activeErrands = errands?.filter((e) => ['assigned', 'in_progress', 'unassigned'].includes(e.status)) || [];

    const totalRevenue = completedErrands.reduce((sum, e) => sum + Number(e.platform_fee || 0), 0);
    const totalVolume = completedErrands.reduce((sum, e) => sum + Number(e.total_fee || 0), 0);
    const totalRunnerPayouts = completedErrands.reduce((sum, e) => sum + Number(e.runner_amount || 0), 0);

    // 2. Verified runners count
    const { count: runnerCount, error: runnerError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'runner');

    if (runnerError) throw runnerError;

    // 3. Pending applications count
    const { count: pendingAppsCount, error: pendingError } = await supabase
      .from('runner_apps')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (pendingError) throw pendingError;

    // 4. Total users count
    const { count: userCount, error: userError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (userError) throw userError;

    return NextResponse.json({
      success: true,
      stats: {
        totalErrands,
        completedCount: completedErrands.length,
        activeCount: activeErrands.length,
        totalRevenue,
        totalVolume,
        totalRunnerPayouts,
        totalRunners: runnerCount || 0,
        pendingApplications: pendingAppsCount || 0,
        totalUsers: userCount || 0,
      },
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
