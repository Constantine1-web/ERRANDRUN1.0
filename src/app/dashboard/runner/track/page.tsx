'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RunnerTrackIndexPage() {
  const [errandId, setErrandId] = useState('');
  const router = useRouter();

  const handleGoToTracker = (event: React.FormEvent) => {
    event.preventDefault();
    if (!errandId.trim()) return;
    router.push(`/dashboard/runner/track/${errandId.trim()}`);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="glass-card rounded-3xl border border-white/10 p-8">
        <h1 className="text-3xl font-bold text-white mb-4">Runner Tracking Center</h1>
        <p className="text-white/60 mb-6">Enter the errand ID to send live status and location updates.</p>
        <form onSubmit={handleGoToTracker} className="space-y-4">
          <label className="block">
            <span className="text-sm text-white/60">Errand ID</span>
            <input
              value={errandId}
              onChange={(event) => setErrandId(event.target.value)}
              placeholder="Enter assigned errand ID"
              className="mt-2 input w-full"
            />
          </label>
          <button type="submit" className="btn-primary w-full">
            Go to Tracking Page
          </button>
        </form>
        <div className="mt-6 text-sm text-white/60">
          <p>If you were assigned an errand, use its ID here to update progress and location.</p>
          <p className="mt-2">Once accepted, send updates from the dedicated tracking page.</p>
        </div>
      </div>
    </div>
  );
}
