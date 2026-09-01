import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; // Service role client

export async function GET() {
  try {
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
    
    // 3. If dynamic ratio is enabled, calculate limit based on total standard users
    if (settings.dynamic_ratio_enabled) {
      const { count: usersCount, error: usersCountError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'user');
        
      if (!usersCountError && usersCount !== null) {
        const dynamicLimit = Math.max(10, Math.floor(usersCount / settings.users_per_runner));
        // Use the smaller of the two limits as the absolute cap, or dynamic limit alone
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
      settings
    });
  } catch (error: any) {
    console.error('Runner Capacity Check Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
