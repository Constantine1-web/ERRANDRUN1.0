const fs = require('fs');
const path = require('path');

const pagePath1 = path.join('src', 'app', 'dashboard', 'runner', 'track', 'page.tsx');
const pagePath2 = path.join('src', 'app', 'dashboard', 'runner', 'track', '[id]', 'page.tsx');

const content1 = `'use client';

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
    router.push(\`/dashboard/runner/track/\${errandId.trim()}\`);
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
`;

const content2 = `'use client';

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
      
      await submitTracking(\`Dispute initiated: \${reason}\`);
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
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl mb-2">Runner Live Tracking</CardTitle>
            <p className="text-white/60 text-sm">
              Transmit live GPS position and step-by-step progress updates for errand #{errandId?.substring(0, 8)}.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
              <div className="space-y-4">
                {/* Quick Preset Badges */}
                <div>
                  <span className="text-xs text-white/60 block mb-2 font-medium">Quick Status Presets:</span>
                  <div className="flex overflow-x-auto scrollbar-none gap-2 pb-2">
                    {quickStatusPresets.map((preset) => (
                      <Badge
                        key={preset}
                        variant={statusUpdate === preset ? 'info' : 'outline'}
                        onClick={() => setStatusUpdate(preset)}
                        className="cursor-pointer whitespace-nowrap"
                      >
                        {preset}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-white/60 font-medium block mb-1.5">Custom Status Message</span>
                  <Input
                    value={statusUpdate}
                    onChange={(e) => setStatusUpdate(e.target.value)}
                    placeholder="e.g. Standing in cafeteria queue, 3 mins away"
                  />
                </div>

                {/* GPS Auto-Detect Bar */}
                <Card className="bg-white/5 border-white/10 shadow-none">
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">Current GPS Coordinates</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleDetectLocation}
                        disabled={detectingGps}
                        className="text-primary-300 bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/40 text-xs py-1 h-auto"
                      >
                        <span className="mr-1.5">📍</span>
                        <span>{detectingGps ? 'Locating...' : 'Auto-Detect GPS'}</span>
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-white/40 block mb-0.5">Latitude</span>
                        <Input
                          value={lat}
                          onChange={(e) => setLat(e.target.value)}
                          placeholder="6.5244"
                          className="font-mono h-9 text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-white/40 block mb-0.5">Longitude</span>
                        <Input
                          value={lng}
                          onChange={(e) => setLng(e.target.value)}
                          placeholder="3.3792"
                          className="font-mono h-9 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                <div>
                  <span className="text-xs text-white/60 font-medium block mb-1.5">Runner Notes (Optional)</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="flex w-full rounded-xl border bg-dark-base px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all border-white/10"
                    rows={3}
                    placeholder="e.g. Packed in insulated bag, at Faculty gate"
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row pt-2">
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    isLoading={submitting}
                    className="w-full sm:flex-1 h-auto py-3 text-xs"
                  >
                    Broadcast Tracking Update
                  </Button>
                  <div className="flex flex-col w-full sm:flex-1 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleComplete}
                      disabled={submitting}
                      className="w-full h-auto py-3 text-xs bg-brand-green/20 text-brand-green border-brand-green/30 hover:bg-brand-green/30 hover:text-brand-green"
                    >
                      {submitting ? 'Verifying…' : 'Arrived / Complete'}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={handleDispute}
                      disabled={submitting}
                      className="w-full h-auto py-2 text-[10px]"
                    >
                      ⚠️ Customer Refused PIN
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Card className="h-full border-white/10 bg-white/5 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-xl">Live status</CardTitle>
                    <p className="text-white/60 text-sm">Latest updates are streamed in real-time from Supabase.</p>
                  </CardHeader>
                  <CardContent>
                    {trackingLoading ? (
                      <p className="text-white/60">Connecting to live tracking…</p>
                    ) : tracking.length === 0 ? (
                      <p className="text-white/60">No tracking updates yet. Send the first update now.</p>
                    ) : (
                      <div className="space-y-4">
                        {tracking.slice(0, 4).map((update) => (
                          <Card key={update.id} className="bg-white/5 border-white/10 shadow-none">
                            <div className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <Badge variant="info">{update.status_update}</Badge>
                              </div>
                              {update.current_location && (
                                <div className="text-xs text-white/60">
                                  {update.current_location.lat.toFixed(5)}, {update.current_location.lng.toFixed(5)}
                                </div>
                              )}
                              <div className="text-xs text-white/40 mt-2">{new Date(update.timestamp).toLocaleString()}</div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-xl">Live map preview</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pb-6 relative min-h-[400px]">
            <div className="absolute inset-0 mx-6 mb-6 rounded-3xl overflow-hidden border border-white/10">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(pagePath1, content1);
fs.writeFileSync(pagePath2, content2);
console.log('Files successfully replaced!');
