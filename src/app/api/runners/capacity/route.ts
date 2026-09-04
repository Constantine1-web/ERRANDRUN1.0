import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/serverAuth';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit(`capacity-check:${ip}`, 30, 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    // 1. Get current settings
    const { data: settingData, error: settingError } = await adminSupabase
      .from('platform_settings')
      .select('setting_value')
      .eq('setting_key', 'runner_limit')
      .single();

    let settings = { max_active_runners: 50, dynamic_ratio_enabled: true, users_per_runner: 5 };
    if (!settingError && settingData) {
      settings = { ...settings, ...settingData.setting_value };
    }

    // 2. Count active verified runners
    const { count: runnersCount, error: countError } = await adminSupabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'runner')
      .eq('verification_status', 'verified');
      
    if (countError) throw countError;
    
    let currentLimit = settings.max_active_runners;
    
    // 3. If dynamic ratio is enabled, calculate limit based on total standard users
    if (settings.dynamic_ratio_enabled) {
      const { count: usersCount, error: usersCountError } = await adminSupabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'user');
        
      if (!usersCountError && usersCount !== null) {
        const dynamicLimit = Math.max(10, Math.floor(usersCount / settings.users_per_runner));
        currentLimit = Math.min(settings.max_active_runners, dynamicLimit);
      }
    }

    const currentRunners = runnersCount || 0;
    const isAtCapacity = currentRunners >= currentLimit;

    return NextResponse.json({
      success: true,
      currentRunners,
      limit: currentLimit,
      isAtCapacity,
    });
  } catch (error: any) {
    console.error('Runner Capacity Check Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to verify capacity' }, { status: 500 });
  }
}
