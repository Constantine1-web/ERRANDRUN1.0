import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireAdmin } from '@/lib/serverAuth';

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAdmin(request);
    if (authCheck.response) return authCheck.response;
    
    const adminId = authCheck.auth.user.id;

    const body = await request.json();
    const { userId, action, reason } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing userId or action' },
        { status: 400 }
      );
    }

    const updates: any = { updated_at: new Date().toISOString() };
    
    if (action === 'approve_student') {
      updates.verification_status = 'verified';
    } else if (action === 'reject_student') {
      updates.verification_status = 'rejected';
      if (!reason) return NextResponse.json({ success: false, error: 'Rejection reason required' }, { status: 400 });
    } else if (action === 'suspend_user') {
      updates.account_status = 'suspended';
      if (!reason) return NextResponse.json({ success: false, error: 'Suspension reason required' }, { status: 400 });
    } else if (action === 'reactivate_user') {
      updates.account_status = 'active'; 
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const { error: updateError } = await adminSupabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (updateError) {
      console.warn('Failed to update user profile:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to update user profile' }, { status: 500 });
    }

    // Try to record audit log (fire and forget, don't fail if table doesn't exist yet)
    adminSupabase.from('audit_logs').insert({
      admin_id: adminId,
      action: action.toUpperCase(),
      target_user_id: userId,
      reason: reason || null,
      metadata: { timestamp: new Date().toISOString() }
    }).then(({ error }) => {
      if (error && error.code !== '42P01') { // Ignore relation does not exist
        console.warn('Failed to insert audit log:', error);
      }
    });

    return NextResponse.json({ success: true, message: `User ${action.replace('_', ' ')} successfully` });
  } catch (error: any) {
    console.warn('Admin user action exception:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
