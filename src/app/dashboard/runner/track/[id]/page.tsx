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
    const pin = window.prompt("Enter the 4-digit Delivery PIN provided by the customer:");
    if (!pin || pin.trim().length !== 4) {
      toast.error("Valid 4-digit PIN required to complete delivery");
      return;
    }
    
    setSubmitting(true);
    try {
      // Verify PIN against backend before submitting tracking
      const response = await fetch('/api/tracking/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errandId, runnerId: (await supabase.auth.getUser()).data.user?.id, pin })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      await submitTracking('Runner has completed delivery');
      toast.success("PIN verified. Errand completed successfully!");
    } catch (e: any) {
      toast.error(e.message || "Failed to verify PIN");
      setSubmitting(false);
    }
  };

  const handleDispute = async () => {
    const reason = window.prompt("Customer refused PIN? Enter a reason to initiate a dispute (Requires GPS lock):");
    if (!reason) return;
    if (!lat || !lng) {
      toast.error("Please Auto-Detect GPS before initiating a dispute to prove your location.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/tracking/dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          errandId, 
          runnerId: (await supabase.auth.getUser()).data.user?.id, 
          reason,
          lat: Number(lat),
          lng: Number(lng)
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      await submitTracking(`Dispute initiated: ${reason}`);
      toast.success("Dispute filed successfully.");
    } catch (e: any) {
      toast.error(e.message || "Failed to file dispute");
      setSubmitting(false);
    }
  };

  const [detectingGps, setDetectingGps] = useState(false);

  const quickStatusPresets = [
    '🏃 Runner is heading to pickup point',
    '📍 Arrived at pickup location',
    '📦 Item/Order picked up, en route to you',
    '🏢 Arrived at delivery building/hostel',
    '✅ Handed over to recipient',
  ];

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
        toast.success('GPS location captured!');
        setDetectingGps(false);
      },
      (error) => {
        console.error('GPS error:', error);
        toast.error('Could not access GPS location. Check browser permissions.');
        setDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-[2fr_1fr]">
        <div className="glass-card rounded-3xl border border-white/10 p-6">
          <h1 className="text-3xl font-bold text-white mb-2">Runner Live Tracking</h1>
          <p className="text-white/60 mb-6 text-sm">
            Transmit live GPS position and step-by-step progress updates for errand #{errandId?.substring(0, 8)}.
          </p>

          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            <div className="space-y-4">
              {/* Quick Preset Badges */}
              <div>
                <span className="text-xs text-white/60 block mb-2 font-medium">Quick Status Presets:</span>
                <div className="flex overflow-x-auto scrollbar-none gap-2 pb-2">
                  {quickStatusPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setStatusUpdate(preset)}
                      className={`whitespace-nowrap px-2.5 py-1 rounded-xl text-[11px] font-medium border transition-all ${
                        statusUpdate === preset
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="text-xs text-white/60 font-medium">Custom Status Message</span>
                <input
                  value={statusUpdate}
                  onChange={(e) => setStatusUpdate(e.target.value)}
                  className="mt-1.5 input w-full text-xs"
                  placeholder="e.g. Standing in cafeteria queue, 3 mins away"
                />
              </label>

              {/* GPS Auto-Detect Bar */}
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Current GPS Coordinates</span>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingGps}
                    className="px-3 py-1 bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/40 text-primary-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <span>📍</span>
                    <span>{detectingGps ? 'Locating...' : 'Auto-Detect GPS'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-white/40 block">Latitude</span>
                    <input
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      className="mt-0.5 input w-full text-xs font-mono"
                      placeholder="6.5244"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 block">Longitude</span>
                    <input
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      className="mt-0.5 input w-full text-xs font-mono"
                      placeholder="3.3792"
                    />
                  </div>
                </div>
              </div>

              <label className="block">
                <span className="text-xs text-white/60 font-medium">Runner Notes (Optional)</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1.5 textarea w-full text-xs"
                  rows={3}
                  placeholder="e.g. Packed in insulated bag, at Faculty gate"
                />
              </label>

              <div className="flex flex-col gap-2 sm:flex-row pt-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary w-full sm:flex-1 py-3 text-xs"
                >
                  {submitting ? 'Broadcasting...' : 'Broadcast Tracking Update'}
                </button>
                <div className="flex flex-col w-full sm:flex-1 gap-2">
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={submitting}
                    className="btn-secondary w-full py-3 text-xs bg-brand-green/20 text-brand-green border-brand-green/30 hover:bg-brand-green/30"
                  >
                    {submitting ? 'Verifying…' : 'Arrived / Complete'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDispute}
                    disabled={submitting}
                    className="btn-secondary w-full py-2 text-[10px] bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                  >
                    ⚠️ Customer Refused PIN
                  </button>
                </div>
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

        <div className="glass-card rounded-3xl border border-white/10 p-6 flex flex-col">
          <h2 className="text-xl font-semibold text-white mb-4">Live map preview</h2>
          <div className="w-full aspect-[4/3] md:aspect-auto md:h-[520px] rounded-3xl overflow-hidden border border-white/10">
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
