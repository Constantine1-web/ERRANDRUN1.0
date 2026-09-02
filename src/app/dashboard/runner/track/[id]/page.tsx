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

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
        toast.success('Tracking update broadcasted');
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
    const pin = window.prompt('Enter the 4-digit Delivery PIN provided by the customer:');
    if (!pin || pin.trim().length !== 4) {
      toast.error('Valid 4-digit PIN required to complete delivery');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await fetch('/api/tracking/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errandId, runnerId: (await supabase.auth.getUser()).data.user?.id, pin })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      await submitTracking('Runner has completed delivery');
      toast.success('PIN verified. Errand completed successfully!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to verify PIN');
      setSubmitting(false);
    }
  };

  const handleDispute = async () => {
    const reason = window.prompt('Customer refused PIN? Enter a reason to initiate a dispute (Requires GPS lock):');
    if (!reason) return;
    if (!lat || !lng) {
      toast.error('Please detect GPS before initiating a dispute to verify location.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/tracking/dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errandId,
          runnerId: (await supabase.auth.getUser()).data.user?.id,
          reason,
          location: { lat: Number(lat), lng: Number(lng) }
        })
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

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        toast.success('GPS position detected');
      },
      () => toast.error('Unable to retrieve GPS coordinates')
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Runner GPS & Status Broadcast</h1>
          <p className="text-slate-500 text-xs mt-0.5">Transmitting live location for errand {errandId}</p>
        </div>
        <Badge variant="info">Live Transmitter Active</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Broadcast Form */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-bold">Transmit Update</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Status Message</label>
                  <select
                    value={statusUpdate}
                    onChange={(e) => setStatusUpdate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Runner en route to pickup">En route to pickup</option>
                    <option value="Arrived at pickup location / in queue">Arrived at pickup / in queue</option>
                    <option value="Item secured, heading to dropoff">Item secured, heading to dropoff</option>
                    <option value="Arrived at delivery location">Arrived at delivery destination</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Latitude</label>
                    <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="e.g. 5.0377" className="text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Longitude</label>
                    <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="e.g. 7.9128" className="text-xs" />
                  </div>
                </div>

                <Button type="button" variant="outline" size="sm" onClick={handleDetectLocation} className="w-full text-xs">
                  📍 Auto-Detect GPS
                </Button>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (Optional)</label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. In red shirt at main gate" className="text-xs" />
                </div>

                <Button type="submit" variant="primary" size="md" className="w-full font-bold text-xs" isLoading={submitting}>
                  Send Status Broadcast
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Completion & Dispute Actions */}
          <Card className="border-slate-200">
            <CardContent className="p-4 space-y-2">
              <Button onClick={handleComplete} variant="primary" size="md" className="w-full bg-green-600 hover:bg-green-700 font-bold text-xs">
                Enter Delivery PIN & Complete
              </Button>
              <Button onClick={handleDispute} variant="outline" size="sm" className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 text-xs">
                Initiate Dispute with GPS Lock
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Map & Log */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="h-[350px] overflow-hidden flex flex-col">
            <div className="flex-1 w-full relative z-0">
              <MapContainer center={mapCenter} zoom={14} scrollWheelZoom={false} className="h-full w-full">
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
          </Card>

          {/* Live Activity Log */}
          <Card>
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-bold">Broadcasted Log</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="space-y-2 max-h-[140px] overflow-y-auto text-xs">
                {trackingLoading ? (
                  <p className="text-slate-400">Loading...</p>
                ) : tracking.length === 0 ? (
                  <p className="text-slate-400">No broadcasts sent yet.</p>
                ) : (
                  tracking.map((t: any) => (
                    <div key={t.id} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                      <span className="font-medium text-slate-800">{t.status_update}</span>
                      <span className="text-[10px] text-slate-400">{new Date(t.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
