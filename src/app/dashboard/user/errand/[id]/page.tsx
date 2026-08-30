'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { MapContainer, Marker, Polyline, TileLayer, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useErrandTracking } from '@/hooks/useRealtimeErrands';
import type { Errand } from '@/types';
import { formatCurrency } from '@/utils/pricing';
import toast from 'react-hot-toast';

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

export default function ErrandDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const { tracking, loading: trackingLoading } = useErrandTracking(id);
  const [errand, setErrand] = useState<Errand | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchErrand = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('errands').select('*').eq('id', id).single();
        if (error) throw error;
        setErrand(data as Errand);
      } catch (err) {
        console.error('Failed to load errand', err);
      } finally {
        setLoading(false);
      }
    };

    fetchErrand();
  }, [id]);

  const searchParams = useSearchParams();
  const paymentReference = searchParams.get('reference') || searchParams.get('payment_reference');

  useEffect(() => {
    if (!paymentReference) return;

    const verifyPayment = async () => {
      try {
        const response = await fetch(`/api/payments?reference=${encodeURIComponent(paymentReference)}`);
        const result = await response.json();
        if (result?.success) {
          toast.success('Payment confirmed! Your errand is now active.');
          setErrand((current) => (current ? { ...current, status: 'unassigned' } : current));
        }
      } catch (error) {
        console.error('Payment verification failed', error);
      }
    };

    verifyPayment();
  }, [paymentReference]);

  const handleComplete = async () => {
    if (!id) return;
    setCompletionMessage(null);
    setIsCompleting(true);

    try {
      const response = await fetch('/api/errands/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errandId: id }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to confirm completion');
      }

      setErrand((current) =>
        current
          ? { ...current, status: 'completed', actualCompletionTime: new Date().toISOString() }
          : current
      );
      setCompletionMessage('Delivery marked complete. Thank you for confirming.');
    } catch (error) {
      console.error('Completion confirmation failed', error);
      setCompletionMessage('Unable to confirm completion. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

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
    if (errand?.pickup_coordinates) {
      return [errand.pickup_coordinates.lat, errand.pickup_coordinates.lng] as [number, number];
    }
    return [6.5244, 3.3792] as [number, number];
  }, [latestTracking, errand]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Errand Details</h2>

      {loading ? (
        <p>Loading errand…</p>
      ) : !errand ? (
        <p>Errand not found</p>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <div className="glass-card p-4 rounded-3xl space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{errand.title}</h3>
                <p className="text-sm text-white/60">{errand.description}</p>
              </div>
              <div className="space-y-3 text-sm text-white/60">
                <div className="flex justify-between"><span>From</span><span>{errand.pickup_location}</span></div>
                <div className="flex justify-between"><span>To</span><span>{errand.delivery_location}</span></div>
                <div className="flex justify-between"><span>Status</span><span className="font-medium">{errand.status}</span></div>
              </div>
              <div className="space-y-3 text-sm text-white/60">
                <div className="flex justify-between"><span>Total</span><span className="font-semibold">{formatCurrency(Number(errand.total_fee))}</span></div>
                <div className="flex justify-between"><span>Priority</span><span>{errand.priority}</span></div>
                <div className="flex justify-between"><span>Platform fee</span><span>{formatCurrency(Number(errand.platform_fee))}</span></div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
            <div className="glass-card p-4 rounded-3xl">
              <h4 className="text-sm font-medium mb-4">Live Runner Map</h4>
              <div className="h-[420px] rounded-3xl overflow-hidden border border-white/10">
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
                        Latest runner position<br />
                        {new Date(latestTracking.timestamp).toLocaleString()}
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="glass-card p-4 rounded-3xl">
                <h4 className="text-sm text-white/60 mb-3">Latest Tracking</h4>
                {trackingLoading ? (
                  <p className="text-sm">Connecting…</p>
                ) : tracking.length === 0 ? (
                  <p className="text-sm text-white/60">No tracking updates yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {tracking.map((t: any) => (
                      <li key={t.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-sm text-white/80 font-medium">{t.status_update}</div>
                        {t.current_location && (
                          <div className="text-xs text-white/60 mt-2">Location: {t.current_location.lat.toFixed(5)}, {t.current_location.lng.toFixed(5)}</div>
                        )}
                        <div className="text-xs text-white/40 mt-2">{new Date(t.timestamp).toLocaleString()}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="glass-card p-4 rounded-3xl">
                <h4 className="text-sm text-white/60 mb-3">Confirm Delivery</h4>
                {errand.status === 'assigned' || errand.status === 'in_progress' ? (
                  <div className="space-y-3">
                    <p className="text-sm text-white/60">
                      Confirm delivery once your runner has completed the drop-off.
                    </p>
                    <button
                      type="button"
                      onClick={handleComplete}
                      disabled={isCompleting}
                      className="btn-primary w-full"
                    >
                      {isCompleting ? 'Confirming…' : 'Mark as Completed'}
                    </button>
                    {completionMessage ? (
                      <p className="text-sm text-white/70">{completionMessage}</p>
                    ) : null}
                  </div>
                ) : errand.status === 'completed' ? (
                  <p className="text-sm text-white/60">This errand has already been marked completed.</p>
                ) : (
                  <p className="text-sm text-white/60">
                    Delivery confirmation is available once a runner is assigned and in progress.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
