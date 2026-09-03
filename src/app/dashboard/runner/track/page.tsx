'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, MapPin, ArrowRight, Radio } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function RunnerTrackIndexPage() {
  const [errandId, setErrandId] = useState('');
  const router = useRouter();

  const handleGoToTracker = (event: React.FormEvent) => {
    event.preventDefault();
    if (!errandId.trim()) return;
    router.push(`/dashboard/runner/track/${errandId.trim()}`);
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-12 space-y-6 animate-fadeIn">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
          <Radio className="w-6 h-6 animate-pulse" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Runner GPS Broadcaster
        </h1>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Enter an assigned errand UUID to stream live location coordinates and transit status updates to the customer.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
        <form onSubmit={handleGoToTracker} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Assigned Errand ID
            </label>
            <input
              type="text"
              value={errandId}
              onChange={(e) => setErrandId(e.target.value)}
              placeholder="Paste errand UUID (e.g. 550e8400-e29b-41d4-a716...)"
              required
              className="w-full h-11 px-4 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Button type="submit" size="lg" className="w-full font-bold text-xs shadow-md">
            Launch Broadcaster <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
