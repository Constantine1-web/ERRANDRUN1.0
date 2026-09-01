import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('setting_key', 'runner_limit')
      .single();

    if (error && error.code !== 'PGRST116') throw error; 
    
    const settings = data ? data.setting_value : { max_active_runners: 50, dynamic_ratio_enabled: true, users_per_runner: 5 };
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('Settings GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { error } = await supabase
      .from('platform_settings')
      .upsert({ 
        setting_key: 'runner_limit', 
        setting_value: body,
        updated_at: new Date().toISOString()
      }, { onConflict: 'setting_key' });

    if (error) throw error;
    return NextResponse.json({ success: true, settings: body });
  } catch (error: any) {
    console.error('Settings POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
