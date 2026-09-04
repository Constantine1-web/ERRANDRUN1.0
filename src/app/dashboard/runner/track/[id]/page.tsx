'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MapContainer, Marker, TileLayer, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { supabase } from '@/lib/supabaseClient';
import { authFetch } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { useErrandTracking } from '@/hooks/useRealtimeErrands';
import {
  Radio,
  MapPin,
  Send,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  KeyRound,
  Compass,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

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

export default function RunnerTrackDynamicPage() {
  const params = useParams();
  const router = useRouter();
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
    return [5.0377, 7.9128] as [number, number];
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

      const response = await authFetch('/api/tracking', {
        method: 'POST',
        body: JSON.stringify({
          errandId,
          statusUpdate: message,
          currentLocation: lat && lng ? { lat: Number(lat), lng: Number(lng) } : null,
          runnerNotes: notes,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.error || 'Failed to send tracking broadcast');
      } else {
        toast.success('Location update broadcasted to customer!');
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

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        toast.success('Live GPS coordinates locked!');
      },
      () => toast.error('Unable to retrieve GPS coordinates')
    );
  };

  const handleComplete = async () => {
    const pin = window.prompt('Enter the 4-digit Delivery PIN provided by the customer:');
    if (!pin || pin.trim().length !== 4) {
      toast.error('Valid 4-digit PIN required to complete delivery');
      return;
    }

    setSubmitting(true);
    try {
      const response = await authFetch('/api/tracking/complete', {
        method: 'POST',
        body: JSON.stringify({ errandId, pin }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      await submitTracking('Runner has verified PIN and completed delivery');
      toast.success('PIN verified. Errand completed successfully!');
      router.push('/dashboard/runner');
    } catch (e: any) {
      toast.error(e.message || 'Failed to verify PIN');
      setSubmitting(false);
    }
  };

  const handleDispute = async () => {
    const reason = window.prompt('Customer refused PIN? Enter dispute reason (Requires GPS lock):');
    if (!reason) return;
    if (!lat || !lng) {
      toast.error('Please detect GPS before initiating a dispute to prove your physical location.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await authFetch('/api/tracking/dispute', {
        method: 'POST',
        body: JSON.stringify({
          errandId,
          reason,
          lat: Number(lat),
          lng: Number(lng),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Dispute ticket raised. GPS lock logged.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to raise dispute');
    } finally {
      setSubmitting(false);
    }
  };

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
          <Badge variant="info" className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
            Transmitter Active
          </Badge>
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

              {/* GPS Coordinates & Auto-Detect */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Location Coordinates
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="Lat (e.g. 5.0377)"
                    className="h-10 px-3 rounded-xl border border-slate-300 font-mono text-xs"
                  />
                  <input
                    type="text"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="Lng (e.g. 7.9128)"
                    className="h-10 px-3 rounded-xl border border-slate-300 font-mono text-xs"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDetectLocation}
                  className="w-full text-xs font-bold gap-1.5 mt-1"
                >
                  <Compass className="w-3.5 h-3.5 text-blue-600" />
                  Auto-Detect GPS
                </Button>
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
                Send Status Broadcast
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
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden h-[360px] shadow-sm relative">
            <MapContainer center={mapCenter} zoom={14} scrollWheelZoom={false} className="h-full w-full z-0">
              <RecenterMap center={mapCenter} />
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {pathPositions.length > 1 && (
                <Polyline positions={pathPositions} pathOptions={{ color: '#2563EB', weight: 4 }} />
              )}
              {latestTracking?.current_location && (
                <Marker position={[latestTracking.current_location.lat, latestTracking.current_location.lng]}>
                  <Popup>Current Broadcast Point</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>

          {/* Broadcast Logs */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Broadcast Log History
            </h3>
            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto text-xs">
              {trackingLoading ? (
                <p className="text-slate-400 py-2">Loading broadcast logs…</p>
              ) : tracking.length === 0 ? (
                <p className="text-slate-400 py-2">No broadcasts sent yet. Use the transmitter on the left.</p>
              ) : (
                tracking.map((t: any) => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between">
                    <span className="font-medium text-slate-800">{t.status_update}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
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
