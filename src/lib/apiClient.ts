import { supabase } from '@/lib/supabaseClient';

/**
 * Enhanced fetch wrapper for frontend client requests.
 * Automatically attaches the current user's Supabase JWT Bearer token
 * to authenticate requests made to /api/* endpoints.
 */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    const headers = new Headers(init.headers || {});

    if (session?.access_token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }

    if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    return await fetch(input, {
      ...init,
      headers,
    });
  } catch (error) {
    console.error('authFetch error:', error);
    return await fetch(input, init);
  }
}
