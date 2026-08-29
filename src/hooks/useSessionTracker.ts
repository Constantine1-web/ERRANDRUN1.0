import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabaseClient';

/**
 * Hook for tracking user sessions with non-blocking logging
 */
export function useSessionTracker() {
  const { user, session, setSession } = useAppStore();
  const sessionIdRef = useRef<string | null>(null);

  // Initialize session on mount
  useEffect(() => {
    if (!user) return;

    const initializeSession = async () => {
      try {
        // Create new session entry
        const { data, error } = await supabase.from('sessions').insert([
          {
            user_id: user.id,
            login_at: new Date().toISOString(),
            ip_address: await getClientIP(),
            user_agent: navigator.userAgent,
            device_type: getDeviceType(),
          },
        ]).select('id').single();

        if (error) throw error;

        if (data) {
          sessionIdRef.current = data.id;
          setSession({
            id: data.id,
            loginAt: new Date().toISOString(),
            userId: user.id,
          });
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
      }
    };

    initializeSession();
  }, [user, setSession]);

  // Handle visibility change (backgrounding on mobile)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        logoutSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      logoutSession();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const logoutSession = useCallback(async () => {
    if (!sessionIdRef.current || !user) return;

    const loginAt = session?.loginAt;
    const loginTime = loginAt ? new Date(loginAt) : new Date();
    const logoutTime = new Date();
    const durationSeconds = Math.floor((logoutTime.getTime() - loginTime.getTime()) / 1000);

    // Use sendBeacon for non-blocking logout logging
    const payload = {
      sessionId: sessionIdRef.current,
      logoutAt: logoutTime.toISOString(),
      durationSeconds,
    };

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/session-logger`,
        JSON.stringify(payload)
      );
    } else {
      // Fallback for browsers without sendBeacon support
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/session-logger`, {
          method: 'POST',
          body: JSON.stringify(payload),
          keepalive: true,
        });
      } catch (error) {
        console.error('Failed to log session logout:', error);
      }
    }

    sessionIdRef.current = null;
  }, [session, user]);

  return { sessionIdRef, logoutSession };
}

/**
 * Get client IP address (requires backend support)
 */
async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Detect device type
 */
function getDeviceType(): string {
  if (/mobile|android|iphone|ipad|phone/i.test(navigator.userAgent)) {
    return 'mobile';
  }
  if (/tablet|ipad|android/i.test(navigator.userAgent)) {
    return 'tablet';
  }
  return 'desktop';
}
