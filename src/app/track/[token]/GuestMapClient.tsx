'use client';

import React from 'react';
import { useErrandRadar } from '@/hooks/useLiveTracking';
import { LiveErrandRadar } from '@/components/maps/LiveErrandRadar';

interface Location {
  lat: number;
  lng: number;
}

interface GuestMapClientProps {
  errandId: string;
  pickup?: Location;
  dropoff?: Location;
}

export function GuestMapClient({ errandId, pickup, dropoff }: GuestMapClientProps) {
  const { runnerPosition } = useErrandRadar(errandId);

  if (!pickup || !dropoff) return null;

  return (
    <div className="w-full h-48 rounded-xl overflow-hidden border border-white/10 mt-6 relative shadow-inner">
      <LiveErrandRadar 
        pickup={pickup} 
        dropoff={dropoff} 
        runnerPosition={runnerPosition || undefined} 
      />
    </div>
  );
}
