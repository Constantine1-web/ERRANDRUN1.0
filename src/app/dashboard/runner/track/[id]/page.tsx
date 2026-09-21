'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { authFetch } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { useErrandTracking } from '@/hooks/useRealtimeErrands';
import { useRunnerGPSBroadcaster } from '@/hooks/useLiveTracking';
import { LiveErrandRadar } from '@/components/maps/LiveErrandRadar';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  KeyRound,
  Compass
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { Errand } from '@/types';

export default function RunnerTelemetryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

  const { tracking, loading: trackingLoading, errand } = useErrandTracking(id);
  const { currentPosition, error: gpsError } = useRunnerGPSBroadcaster(id as string, true);

  const [statusUpdate, setStatusUpdate] = useState('En route to pickup location');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-sync form coordinates with live GPS if available
  useEffect(() => {
    if (currentPosition) {
      setLat(currentPosition.lat.toString());
      setLng(currentPosition.lng.toString());
    }
  }, [currentPosition]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !lat || !lng) {
      toast.error('Missing coordinates. Please auto-detect GPS.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errand_id: id,
          status_update: statusUpdate,
          current_location: { lat: parseFloat(lat), lng: parseFloat(lng) },
          runner_notes: notes
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      toast.success('Status broadcasted successfully');
      setNotes('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = () => {
    const pin = prompt('Enter the 4-digit PIN provided by the customer to securely unlock escrow:');
    if (!pin) return;
    
    toast.promise(
      authFetch('/api/errands/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errand_id: id, completion_pin: pin })
      }).then(async (res) => {
        const d = await res.json();
        if (!d.success) throw new Error(d.error);
        router.push('/dashboard/runner');
      }),
      {
        loading: 'Verifying PIN & Unlocking Escrow...',
        success: 'Errand Completed! Escrow unlocked.',
        error: (e) => e.message || 'Failed to complete errand'
      }
    );
  };

  const handleDispute = () => {
    const reason = prompt('Please explain why you are initiating a GPS Lock dispute:');
    if (!reason) return;
    
    toast.promise(
      authFetch('/api/tracking/dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errand_id: id, reason })
      }).then(async (res) => {
        const d = await res.json();
        if (!d.success) throw new Error(d.error);
        router.push('/dashboard/runner');
      }),
      {
        loading: 'Initiating dispute...',
        success: 'Dispute filed successfully.',
        error: (e) => e.message || 'Failed to file dispute'
      }
    );
  };

  if (!id) return <div>Invalid tracking ID</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6 animate-fadeIn">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/runner')}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Broadcaster Console
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Live GPS Telemetry
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {gpsError ? (
            <Badge variant="danger" className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              GPS Error
            </Badge>
          ) : (
            <Badge variant="info" className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
              Transmitter Active
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: Transmitter Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Transmit Status Broadcast
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Current Waypoint Status
                </label>
                <select
                  value={statusUpdate}
                  onChange={(e) => setStatusUpdate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Runner en route to pickup">En route to pickup location</option>
                  <option value="Arrived at pickup location / in queue">Arrived at pickup / waiting in queue</option>
                  <option value="Item secured, heading to dropoff">Item secured, in transit to destination</option>
                  <option value="Arrived at delivery location">Arrived at delivery spot / waiting outside</option>
                </select>
              </div>

              {/* GPS Coordinates (Read-only as they are auto-detected) */}
              <div className="space-y-1.5 opacity-80">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Location Coordinates</span>
                  <span className="text-[9px] text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Auto-Syncing
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={lat}
                    readOnly
                    placeholder="Lat..."
                    className="h-10 px-3 rounded-xl border border-slate-300 bg-slate-50 font-mono text-xs"
                  />
                  <input
                    type="text"
                    value={lng}
                    readOnly
                    placeholder="Lng..."
                    className="h-10 px-3 rounded-xl border border-slate-300 bg-slate-50 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Customer Note (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Wearing red jacket outside faculty gate"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={submitting}
                className="w-full font-bold text-xs shadow-md"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Log Official Checkpoint
              </Button>
            </form>
          </div>

          {/* Complete & Dispute Fast Actions */}
          <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200 space-y-2.5">
            <Button
              onClick={handleComplete}
              variant="success"
              size="md"
              className="w-full font-bold text-xs bg-emerald-600 hover:bg-emerald-700"
            >
              <KeyRound className="w-4 h-4 mr-1.5" />
              Enter Customer PIN & Complete
            </Button>
            <Button
              onClick={handleDispute}
              variant="outline"
              size="sm"
              className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-semibold"
            >
              Customer Refused PIN (GPS Lock Dispute)
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Leaflet Map & Broadcast History */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden h-[360px] shadow-sm relative">
             {errand?.pickup_coordinates && errand?.delivery_coordinates ? (
               <LiveErrandRadar 
                 pickup={errand.pickup_coordinates}
                 dropoff={errand.delivery_coordinates}
                 runnerPosition={currentPosition}
               />
             ) : (
               <div className="flex items-center justify-center h-full text-xs text-slate-400">
                 Loading mission coordinates...
               </div>
             )}
          </div>

          {/* Broadcast Logs */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Checkpoint Log History
            </h3>
            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto text-xs">
              {trackingLoading ? (
                <p className="text-slate-400 py-2">Loading logs…</p>
              ) : tracking.length === 0 ? (
                <p className="text-slate-400 py-2">No checkpoints sent yet. Use the transmitter on the left.</p>
              ) : (
                tracking.map((t: any) => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between">
                    <span className="font-medium text-slate-800">{t.status_update}</span>
                    <span suppressHydrationWarning className="text-[10px] text-slate-400 font-mono">
                      {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
