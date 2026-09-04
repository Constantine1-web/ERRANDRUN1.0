import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireAdmin } from '@/lib/serverAuth';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireAdmin(request);
    if (authCheck.response) return authCheck.response;

    const ip = getClientIp(request);
    const rate = checkRateLimit(`admin-stats:${ip}`, 30, 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    // 1. Total & completed errands
    const { data: errands, error: errandsError } = await adminSupabase
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
    const { count: runnerCount, error: runnerError } = await adminSupabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'runner');

    if (runnerError) throw runnerError;

    // 3. Pending applications count
    const { count: pendingAppsCount, error: pendingError } = await adminSupabase
      .from('runner_apps')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (pendingError) throw pendingError;

    // 4. Total users count
    const { count: userCount, error: userError } = await adminSupabase
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
    console.error('Admin stats fetch error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
