import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireAdmin } from '@/lib/serverAuth';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireAdmin(request);
    if (authCheck.response) return authCheck.response;

    const ip = getClientIp(request);
    const rate = checkRateLimit(`admin-users:${ip}`, 60, 60 * 1000);
    if (!rate.allowed) return rateLimitExceededResponse(rate.resetTime);

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const verificationStatus = searchParams.get('verification_status');
    const search = searchParams.get('search');

    let query = adminSupabase
      .from('profiles')
      .select(`
        *,
        wallets (id, balance, total_earned, total_spent)
      `)
      .order('created_at', { ascending: false });

    if (role && role !== 'all') {
      query = query.eq('role', role);
    }
    
    if (verificationStatus && verificationStatus !== 'all') {
      query = query.eq('verification_status', verificationStatus);
    }
    
    if (search) {
      // Basic search on name, student_id, or email
      query = query.or(`full_name.ilike.%${search}%,student_id.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Admin users fetch error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch user profiles' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.warn('Admin users error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
