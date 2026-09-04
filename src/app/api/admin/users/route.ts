import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireAdmin } from '@/lib/serverAuth';
import { AdminUserUpdateSchema } from '@/lib/validations';
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

    const { data, error } = await query;

    if (error) {
      console.error('Admin users fetch error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch user profiles' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Admin users error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAdmin(request);
    if (authCheck.response) return authCheck.response;

    const body = await request.json();
    const parseResult = AdminUserUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid user update payload', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { userId, role, verificationStatus } = parseResult.data;

    const updates: any = { updated_at: new Date().toISOString() };
    if (role) updates.role = role;
    if (verificationStatus) updates.verification_status = verificationStatus;

    const { error } = await adminSupabase.from('profiles').update(updates).eq('id', userId);

    if (error) {
      console.error('Admin user update error:', error);
      return NextResponse.json({ success: false, error: 'Failed to update user profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'User profile updated successfully' });
  } catch (error: any) {
    console.error('Admin user update exception:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
