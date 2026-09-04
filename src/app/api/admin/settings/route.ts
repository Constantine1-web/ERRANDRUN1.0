import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireAdmin } from '@/lib/serverAuth';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireAdmin(request);
    if (authCheck.response) return authCheck.response;

    const { data, error } = await adminSupabase
      .from('platform_settings')
      .select('*')
      .eq('setting_key', 'runner_limit')
      .single();

    if (error && error.code !== 'PGRST116') throw error; 
    
    const settings = data ? data.setting_value : { max_active_runners: 50, dynamic_ratio_enabled: true, users_per_runner: 5 };
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('Settings GET Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAdmin(request);
    if (authCheck.response) return authCheck.response;

    const ip = getClientIp(request);
    const rate = checkRateLimit(`admin-settings:${ip}`, 20, 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    const body = await request.json();
    
    // Validate body settings
    const maxActive = Number(body?.max_active_runners);
    const usersPerRunner = Number(body?.users_per_runner);
    const dynamicRatio = Boolean(body?.dynamic_ratio_enabled);

    if (isNaN(maxActive) || maxActive < 1 || maxActive > 1000) {
      return NextResponse.json({ success: false, error: 'max_active_runners must be between 1 and 1000' }, { status: 400 });
    }

    const sanitizedSettings = {
      max_active_runners: Math.floor(maxActive),
      dynamic_ratio_enabled: dynamicRatio,
      users_per_runner: isNaN(usersPerRunner) || usersPerRunner < 1 ? 5 : Math.floor(usersPerRunner),
    };

    const { error } = await adminSupabase
      .from('platform_settings')
      .upsert({ 
        setting_key: 'runner_limit', 
        setting_value: sanitizedSettings,
        updated_at: new Date().toISOString()
      }, { onConflict: 'setting_key' });

    if (error) throw error;
    return NextResponse.json({ success: true, settings: sanitizedSettings });
  } catch (error: any) {
    console.error('Settings POST Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
