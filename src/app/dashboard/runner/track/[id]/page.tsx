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

  // ── STRIPPED: Awaiting redesign ──
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Runner GPS & Status Broadcast</h1>
      
      <div>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Status Message:</label>
            <select value={statusUpdate} onChange={(e) => setStatusUpdate(e.target.value)}>
              <option value="Runner en route to pickup">En route to pickup</option>
              <option value="Arrived at pickup location / in queue">Arrived at pickup / in queue</option>
              <option value="Item secured, heading to dropoff">Item secured, heading to dropoff</option>
              <option value="Arrived at delivery location">Arrived at delivery destination</option>
            </select>
          </div>
          <div>
            <label>Latitude:</label>
            <input value={lat} onChange={(e) => setLat(e.target.value)} />
          </div>
          <div>
            <label>Longitude:</label>
            <input value={lng} onChange={(e) => setLng(e.target.value)} />
          </div>
          <button type="button" onClick={handleDetectLocation}>Auto-Detect GPS</button>
          <div>
            <label>Notes:</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <button type="submit" disabled={submitting}>Send Status Broadcast</button>
        </form>

        <div>
          <button onClick={handleComplete} disabled={submitting}>Enter Delivery PIN & Complete</button>
          <button onClick={handleDispute} disabled={submitting}>Initiate Dispute</button>
        </div>
      </div>

      <div>
        <h2>Broadcasted Log</h2>
        {trackingLoading ? <p>Loading...</p> : tracking.length === 0 ? <p>No broadcasts sent yet.</p> : (
          tracking.map((t: any) => (
            <div key={t.id}>
              <span>{t.status_update}</span> - <span>{new Date(t.timestamp).toLocaleTimeString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
