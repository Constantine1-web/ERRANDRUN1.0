import { NextRequest, NextResponse } from 'next/server';
import { createClient, User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Service-role Supabase client for administrative/bypass operations on server
export const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export interface AuthContext {
  user: User;
  profile?: {
    id: string;
    role: 'user' | 'runner' | 'admin';
    verification_status: string;
    full_name?: string;
  };
}

/**
 * Extracts and cryptographically verifies the Supabase session token from the incoming request.
 * Checks Authorization header: 'Bearer <token>' or fallback to cookie tokens.
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<{ user: User | null; error?: string }> {
  try {
    let token: string | null = null;

    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    // Fallback: check Supabase cookie tokens if bearer header not present
    if (!token) {
      const cookies = request.cookies;
      for (const cookie of cookies.getAll()) {
        if (cookie.name.includes('-auth-token') || cookie.name === 'sb-access-token') {
          try {
            if (cookie.value.startsWith('[')) {
              const parsed = JSON.parse(cookie.value);
              if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
                token = parsed[0];
                break;
              }
            } else if (cookie.value.startsWith('{')) {
              const parsed = JSON.parse(cookie.value);
              if (parsed?.access_token) {
                token = parsed.access_token;
                break;
              }
            } else if (cookie.value.length > 20) {
              token = cookie.value;
              break;
            }
          } catch {
            // Continue checking next cookie
          }
        }
      }
    }

    if (!token) {
      return { user: null, error: 'No authorization token provided' };
    }

    // Verify token with Supabase Auth server
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await authClient.auth.getUser(token);

    if (error || !data.user) {
      return { user: null, error: error?.message || 'Invalid or expired session token' };
    }

    return { user: data.user };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Authentication error' };
  }
}

/**
 * Middleware function that mandates an authenticated user session.
 * Returns either AuthContext or an immediate 401 NextResponse.
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ auth: AuthContext; response?: never } | { auth?: never; response: NextResponse }> {
  const { user, error } = await getAuthenticatedUser(request);

  if (!user || error) {
    return {
      response: NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required', details: error },
        { status: 401 }
      ),
    };
  }

  // Fetch verified profile role from database using service client
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('id, role, verification_status, full_name')
    .eq('id', user.id)
    .single();

  return {
    auth: {
      user,
      profile: profile || {
        id: user.id,
        role: 'user',
        verification_status: 'unverified',
      },
    },
  };
}

/**
 * Enforces that the request caller is an authenticated Administrator.
 * Returns 401 if unauthenticated, 403 if authenticated but not admin.
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ auth: AuthContext; response?: never } | { auth?: never; response: NextResponse }> {
  const authResult = await requireAuth(request);
  if (authResult.response) {
    return authResult;
  }

  const { auth } = authResult;
  if (auth.profile?.role !== 'admin') {
    return {
      response: NextResponse.json(
        { success: false, error: 'Forbidden: Administrator privileges required' },
        { status: 403 }
      ),
    };
  }

  return { auth };
}

/**
 * Enforces that the request caller is a registered Runner or Admin.
 */
export async function requireRunner(
  request: NextRequest
): Promise<{ auth: AuthContext; response?: never } | { auth?: never; response: NextResponse }> {
  const authResult = await requireAuth(request);
  if (authResult.response) {
    return authResult;
  }

  const { auth } = authResult;
  if (auth.profile?.role !== 'runner' && auth.profile?.role !== 'admin') {
    return {
      response: NextResponse.json(
        { success: false, error: 'Forbidden: Runner permissions required' },
        { status: 403 }
      ),
    };
  }

  return { auth };
}
