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
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold mb-2">Runner Tracking Center</CardTitle>
          <p className="text-white/60">Enter the errand ID to send live status and location updates.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGoToTracker} className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-2">Errand ID</label>
              <Input
                value={errandId}
                onChange={(event) => setErrandId(event.target.value)}
                placeholder="Enter assigned errand ID"
              />
            </div>
            <Button type="submit" className="w-full">
              Go to Tracking Page
            </Button>
          </form>
          <div className="mt-6 text-sm text-white/60">
            <p>If you were assigned an errand, use its ID here to update progress and location.</p>
            <p className="mt-2">Once accepted, send updates from the dedicated tracking page.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
