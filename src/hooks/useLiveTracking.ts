'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Location {
  lat: number;
  lng: number;
}

/**
 * Hook for Customers/Guests to SUBSCRIBE to live runner locations.
 */
export function useErrandRadar(errandId: string) {
  const [runnerPosition, setRunnerPosition] = useState<Location | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!errandId) return;

    const channel = supabase.channel(`errand-tracking-${errandId}`, {
      config: {
        broadcast: { ack: false },
      },
    });

    channel
      .on('broadcast', { event: 'location_update' }, (payload) => {
        if (payload.payload?.lat && payload.payload?.lng) {
          setRunnerPosition({ lat: payload.payload.lat, lng: payload.payload.lng });
          setIsLive(true);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to live tracking for errand:', errandId);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [errandId]);

  return { runnerPosition, isLive };
}

/**
 * Hook for Runners to BROADCAST their live location.
 */
export function useRunnerGPSBroadcaster(errandId: string, isActive: boolean = true) {
  const [currentPosition, setCurrentPosition] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Set up the Supabase channel for broadcasting
  useEffect(() => {
    if (!errandId || !isActive) return;

    const channel = supabase.channel(`errand-tracking-${errandId}`, {
      config: {
        broadcast: { ack: false },
      },
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Runner broadcasting live GPS for errand:', errandId);
      }
    });

    // We store the channel on the window object temporarily to use it inside the watchPosition callback
    (window as any)._errandBroadcastChannel = channel;

    return () => {
      supabase.removeChannel(channel);
      delete (window as any)._errandBroadcastChannel;
    };
  }, [errandId, isActive]);

  // Start watching GPS position
  useEffect(() => {
    if (!isActive || !navigator.geolocation) {
      if (!navigator.geolocation) setError('Geolocation is not supported by your browser.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newPos = { lat: latitude, lng: longitude };
        setCurrentPosition(newPos);
        setError(null);

        // Broadcast immediately
        const channel = (window as any)._errandBroadcastChannel;
        if (channel) {
          channel.send({
            type: 'broadcast',
            event: 'location_update',
            payload: newPos,
          });
        }
      },
      (err) => {
        console.error('GPS Watch error:', err);
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isActive]);

  return { currentPosition, error };
}
