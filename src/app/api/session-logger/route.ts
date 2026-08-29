import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase with service role key for server-side operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await request.json();
    const { sessionId, logoutAt, durationSeconds } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    // Non-blocking update to sessions table
    const { error } = await supabase
      .from('sessions')
      .update({
        logout_at: logoutAt,
        duration_seconds: durationSeconds,
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Session logging error:', error);
      // Return success anyway - we don't want to block the user experience
      return NextResponse.json({ success: true, warning: 'Logging occurred with non-blocking update' });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in session logger:', error);
    // Always return success to avoid blocking the user
    return NextResponse.json({ success: true, warning: 'Unexpected error caught but handled gracefully' });
  }
}

// Handle keepalive requests (navigator.sendBeacon compatibility)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
