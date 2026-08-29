'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { MapContainer, Marker, TileLayer, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { useErrandTracking } from '@/hooks/useRealtimeErrands';

const defaultIcon = L.Icon.Default;
defaultIcon.mergeOptions({
  iconRetinaUrl: markerIcon2x.src || markerIcon2x,
  iconUrl: markerIcon.src || markerIcon,
  shadowUrl: markerShadow.src || markerShadow,
});

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    if (!center) return;
    map.setView(center, map.getZoom());
  }, [center, map]);

  return null;
}

export default function RunnerTrackPage() {
  const params = useParams();
  const errandId = params?.id as string | undefined;
  const [statusUpdate, setStatusUpdate] = useState('Runner en route to pickup');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { tracking, loading: trackingLoading } = useErrandTracking(errandId);

  const latestTracking = tracking[0] || null;
  const pathPositions = useMemo(
    () =>
      tracking
        .filter((item) => item.current_location)
        .map((item) => [item.current_location.lat, item.current_location.lng] as [number, number])
        .reverse(),
    [tracking]
  );

  const mapCenter = useMemo(() => {
    if (latestTracking?.current_location) {
      return [latestTracking.current_location.lat, latestTracking.current_location.lng] as [number, number];
    }
    if (lat && lng) {
      const parsedLat = Number(lat);
      const parsedLng = Number(lng);
      if (!Number.isNaN(parsedLat) && !Number.isNaN(parsedLng)) {
        return [parsedLat, parsedLng] as [number, number];
      }
    }
    return [6.5244, 3.3792] as [number, number];
  }, [latestTracking, lat, lng]);

  const submitTracking = async (message: string) => {
    if (!errandId) {
      toast.error('Invalid errand ID');
      return;
    }

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const runnerId = userData?.user?.id;
      if (!runnerId) {
        toast.error('Please sign in first');
        return;
      }

      const response = await fetch('/api/tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errandId,
          runnerId,
          statusUpdate: message,
          currentLocation: lat && lng ? { lat: Number(lat), lng: Number(lng) } : null,
          runnerNotes: notes,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.error || 'Failed to send tracking update');
      } else {
        toast.success('Tracking update sent');
      }
    } catch (error) {
      console.error(error);
      toast.error('Unable to send tracking update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await submitTracking(statusUpdate);
  };

  const handleComplete = async () => {
    await submitTracking('Runner has completed delivery');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="glass-card rounded-3xl border border-white/10 p-6">
          <h1 className="text-3xl font-bold text-white mb-4">Runner Tracking</h1>
          <p className="text-white/60 mb-6">Send live status and location updates for errand <strong>{errandId}</strong>.</p>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm text-white/60">Status update</span>
                <input
                  value={statusUpdate}
                  onChange={(e) => setStatusUpdate(e.target.value)}
                  className="mt-2 input w-full"
                  placeholder="Runner is heading to pickup"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm text-white/60">Latitude</span>
                  <input
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="mt-2 input w-full"
                    placeholder="6.5244"
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-white/60">Longitude</span>
                  <input
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="mt-2 input w-full"
                    placeholder="3.3792"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm text-white/60">Notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-2 textarea w-full"
                  rows={4}
                  placeholder="Optional runner notes"
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={handleSubmit} disabled={submitting} className="btn-primary w-full sm:w-auto">
                  {submitting ? 'Sending update…' : 'Send Tracking Update'}
                </button>
                <button type="button" onClick={handleComplete} disabled={submitting} className="btn-secondary w-full sm:w-auto">
                  {submitting ? 'Processing…' : 'Mark as Completed'}
                </button>
              </div>
            </div>

            <div className="glass-card rounded-3xl border border-white/10 p-5">
              <h2 className="text-xl font-semibold text-white mb-4">Live status</h2>
              <p className="text-white/60 mb-4">Latest updates are streamed in real-time from Supabase.</p>
              {trackingLoading ? (
                <p className="text-white/60">Connecting to live tracking…</p>
              ) : tracking.length === 0 ? (
                <p className="text-white/60">No tracking updates yet. Send the first update now.</p>
              ) : (
                <div className="space-y-4">
                  {tracking.slice(0, 4).map((update) => (
                    <div key={update.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-semibold text-white">{update.status_update}</div>
                      {update.current_location && (
                        <div className="text-xs text-white/60 mt-2">
                          {update.current_location.lat.toFixed(5)}, {update.current_location.lng.toFixed(5)}
                        </div>
                      )}
                      <div className="text-xs text-white/40 mt-2">{new Date(update.timestamp).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-3xl border border-white/10 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Live map preview</h2>
          <div className="h-[520px] rounded-3xl overflow-hidden border border-white/10">
            <MapContainer center={mapCenter} zoom={14} scrollWheelZoom={false} className="h-full w-full">
              <RecenterMap center={mapCenter} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {pathPositions.length > 1 && (
                <Polyline positions={pathPositions} pathOptions={{ color: '#38bdf8', weight: 4, opacity: 0.8 }} />
              )}
              {latestTracking?.current_location && (
                <Marker position={[latestTracking.current_location.lat, latestTracking.current_location.lng]}>
                  <Popup>
                    Last known location<br />{new Date(latestTracking.timestamp).toLocaleString()}
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
