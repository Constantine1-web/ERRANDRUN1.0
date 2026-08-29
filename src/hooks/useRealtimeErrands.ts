import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Errand } from '@/types';

/**
 * Hook for real-time errand updates using Supabase Realtime
 */
export function useRealtimeErrands(userId?: string) {
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initial fetch
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchErrands = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('errands')
          .select('*')
          .or(`requester_id.eq.${userId},runner_id.eq.${userId}`)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setErrands(data || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch errands'));
        setErrands([]);
      } finally {
        setLoading(false);
      }
    };

    fetchErrands();
  }, [userId]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const subscription = supabase
      .channel(`errands_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'errands',
          filter: `or(requester_id.eq.${userId},runner_id.eq.${userId})`,
        },
        (payload) => {
            setErrands((prev) => {
              const newErrands = [...prev];
              const newItem = payload.new as Errand | null;

              if (!newItem || typeof newItem !== 'object' || !('id' in newItem)) return prev;

              const index = newErrands.findIndex((e) => e.id === (newItem as Errand).id);

              if (index > -1) {
                // Update existing errand
                newErrands[index] = newItem as Errand;
              } else if (payload.eventType === 'INSERT') {
                // Add new errand
                newErrands.unshift(newItem as Errand);
              }

              return newErrands;
            });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  return { errands, loading, error };
}

/**
 * Hook for real-time errand tracking updates
 */
export function useErrandTracking(errandId?: string) {
  const [tracking, setTracking] = useState<any[]>([]);
  const [loading, setLoading] = useState(!!errandId);

  useEffect(() => {
    if (!errandId) return;

    const fetchTracking = async () => {
      try {
        const { data, error } = await supabase
          .from('errand_tracking')
          .select('*')
          .eq('errand_id', errandId)
          .order('timestamp', { ascending: false });

        if (error) throw error;
        setTracking(data || []);
      } catch (err) {
        console.error('Failed to fetch tracking:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTracking();

    const subscription = supabase
      .channel(`tracking_${errandId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'errand_tracking',
          filter: `errand_id.eq.${errandId}`,
        },
        (payload) => {
          setTracking((prev) => [payload.new as any, ...prev]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [errandId]);

  return { tracking, loading };
}

/**
 * Hook for user profile updates in real-time
 */
export function useRealtimeProfile(userId?: string) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(!!userId);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    const subscription = supabase
      .channel(`profile_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id.eq.${userId}`,
        },
        (payload) => {
          setProfile(payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  return { profile, loading };
}
