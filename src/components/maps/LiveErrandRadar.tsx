'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import type { LiveErrandRadarInnerProps } from './LiveErrandRadarInner';

// Dynamically import the map to avoid SSR "window is not defined" errors
const LiveErrandRadarInner = dynamic(
  () => import('./LiveErrandRadarInner'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[400px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm relative flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Initializing Radar...</p>
        </div>
      </div>
    )
  }
);

export function LiveErrandRadar(props: LiveErrandRadarInnerProps) {
  return <LiveErrandRadarInner {...props} />;
}
