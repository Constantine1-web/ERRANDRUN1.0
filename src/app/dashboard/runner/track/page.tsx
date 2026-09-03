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

  // ── STRIPPED: Awaiting redesign ──
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Runner Location & Broadcast</h1>
      <form onSubmit={handleGoToTracker}>
        <label>Errand ID:</label>
        <input 
          value={errandId}
          onChange={(event) => setErrandId(event.target.value)}
          placeholder="Paste errand UUID..."
          required
        />
        <button type="submit">Open Live Tracker</button>
      </form>
    </div>
  );
}
