'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function RunnerTrackIndexPage() {
  const [errandId, setErrandId] = useState('');
  const router = useRouter();

  const handleGoToTracker = (event: React.FormEvent) => {
    event.preventDefault();
    if (!errandId.trim()) return;
    router.push(`/dashboard/runner/track/${errandId.trim()}`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-xl font-bold text-slate-900">Runner Location & Broadcast</CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">Enter an assigned errand ID to transmit live GPS updates.</p>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleGoToTracker} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Errand ID
              </label>
              <Input
                value={errandId}
                onChange={(event) => setErrandId(event.target.value)}
                placeholder="Paste errand UUID..."
                required
              />
            </div>
            <Button type="submit" variant="primary" className="w-full font-bold">
              Open Live Tracker
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
