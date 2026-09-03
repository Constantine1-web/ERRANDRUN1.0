'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
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
import { CenteredPageLoader } from '@/components/CenteredPageLoader';
import {
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Phone,
  User,
  Star,
  Copy,
  ChevronLeft,
  X,
  ExternalLink
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

export default function ErrandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const { tracking, loading: trackingLoading } = useErrandTracking(id);
  const [errand, setErrand] = useState<Errand | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch Errand
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

    // Subscribe to errand changes
    const sub = supabase
      .channel(`errand_live_${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'errands', filter: `id.eq.${id}` },
        (payload) => {
          if (payload.new) setErrand(payload.new as Errand);
        }
      )
      .subscribe();

    return () => {
      sub.unsubscribe();
    };
  }, [id]);

  const searchParams = useSearchParams();
  const paymentReference = searchParams.get('reference') || searchParams.get('payment_reference');
  const [existingRating, setExistingRating] = useState<any>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedStars, setSelectedStars] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [runnerProfile, setRunnerProfile] = useState<any>(null);

  const availableTags = [
    '⚡ Super Fast Delivery',
    '🤝 Very Polite & Friendly',
    '📦 Handled Items Carefully',
    '📞 Great Communication',
    '🎯 Followed All Instructions',
  ];

  const [existingDispute, setExistingDispute] = useState<any>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('Item not delivered / Missing');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingErrand, setCancellingErrand] = useState(false);

  useEffect(() => {
    if (!errand) return;

    if (errand.runner_id) {
      supabase
        .from('profiles')
        .select('id, full_name, student_id, phone_number, rating, total_ratings, avatar_url')
        .eq('id', errand.runner_id)
        .single()
        .then(({ data }) => setRunnerProfile(data));
    }

    if (errand.status === 'completed') {
      fetch(`/api/ratings?errandId=${errand.id}`)
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.data && res.data.length > 0) {
            setExistingRating(res.data[0]);
          }
        })
        .catch(console.error);
    }

    fetch(`/api/disputes?errandId=${errand.id}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setExistingDispute(res.data);
        }
      })
      .catch(console.error);
  }, [errand]);

  // Payment Verification
  useEffect(() => {
    if (!paymentReference) return;
    const verifyPayment = async () => {
      try {
        const response = await fetch(`/api/payments?reference=${encodeURIComponent(paymentReference)}`);
        const result = await response.json();
        if (result?.success) {
          toast.success('Payment confirmed! Errand is now live.');
          setErrand((current) => (current ? { ...current, status: 'unassigned' } : current));
        }
      } catch (error) {
        console.error('Payment verification failed', error);
      }
    };
    verifyPayment();
  }, [paymentReference]);

  // Cancel Handler
  const handleCancelErrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!errand) return;

    try {
      setCancellingErrand(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        toast.error('Please sign in');
        return;
      }

      const res = await fetch('/api/errands/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errandId: errand.id, userId, reason: cancelReason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to cancel errand');

      toast.success(data.message || 'Errand cancelled. Funds refunded to wallet.');
      setErrand((current) => (current ? { ...current, status: 'cancelled' } : current));
      setShowCancelModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel errand');
    } finally {
      setCancellingErrand(false);
    }
  };

  // Dispute Handler
  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!errand) return;

    try {
      setSubmittingDispute(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        toast.error('Please sign in');
        return;
      }

      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errandId: errand.id,
          initiatorId: userId,
          reason: disputeReason,
          description: disputeDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to file dispute');

      toast.success('Dispute filed. Campus ops team will review.');
      setExistingDispute(data.data);
      setErrand((current) => (current ? { ...current, status: 'disputed' } : current));
      setShowDisputeModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to file dispute');
    } finally {
      setSubmittingDispute(false);
    }
  };

  // Rating Handler
  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!errand || !errand.runner_id) return;

    try {
      setSubmittingRating(true);
      const { data: userData } = await supabase.auth.getUser();
      const raterId = userData?.user?.id;
      if (!raterId) {
        toast.error('Please sign in');
        return;
      }

      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errandId: errand.id,
          raterId,
          rateeId: errand.runner_id,
          rating: selectedStars,
          review: reviewComment,
          tags: selectedTags,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to submit rating');

      toast.success('Runner rated! Thank you.');
      setExistingRating(data.data);
      setShowRatingModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setSubmittingRating(false);
    }
  };

  // Map Coordinates & Center
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
    return [5.0377, 7.9128] as [number, number]; // UniUyo campus coords
  }, [latestTracking, errand]);

  const copyPIN = () => {
    if (errand?.delivery_pin) {
      navigator.clipboard.writeText(errand.delivery_pin);
      toast.success('PIN copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <CenteredPageLoader
        text="ERRANDRUN"
        subtext="Tracking live mission & GPS flight telemetry…"
      />
    );
  }

  if (!errand) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Errand Not Found</h2>
        <p className="text-xs text-slate-500">The requested errand could not be retrieved.</p>
        <Button onClick={() => router.push('/dashboard/user')}>Return to Hub</Button>
      </div>
    );
  }

  // Journey Steps
  const journeySteps = [
    { key: 'unassigned', label: 'Dispatched', desc: 'Awaiting runner claim' },
    { key: 'assigned', label: 'Assigned', desc: 'Runner en route to pickup' },
    { key: 'in_progress', label: 'In Transit', desc: 'Item secured / delivering' },
    { key: 'completed', label: 'Completed', desc: 'Verified & escrow released' },
  ];

  const currentStepIndex =
    errand.status === 'completed' ? 3 :
    errand.status === 'in_progress' ? 2 :
    errand.status === 'assigned' ? 1 : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6 animate-fadeIn">

      {/* ── TOP BREADCRUMB & STATUS BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/errands')}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  errand.status === 'completed' ? 'success' :
                  errand.status === 'in_progress' || errand.status === 'assigned' ? 'info' :
                  errand.status === 'cancelled' || errand.status === 'disputed' ? 'danger' : 'warning'
                }
                className="text-[10px] uppercase font-black tracking-wider"
              >
                {errand.status.replace('_', ' ')}
              </Badge>
              <span className="text-xs text-slate-400 font-mono">#{errand.id.slice(0, 8)}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {errand.title}
            </h1>
          </div>
        </div>

        {/* Dispute / Cancel Buttons */}
        <div className="flex items-center gap-2">
          {errand.status !== 'completed' && errand.status !== 'cancelled' && (
            <>
              {errand.status === 'unassigned' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancelModal(true)}
                  className="text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  Cancel Errand
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDisputeModal(true)}
                className="text-xs font-semibold text-amber-700 border-amber-300 hover:bg-amber-50"
              >
                Report Issue
              </Button>
            </>
          )}
          {errand.status === 'completed' && !existingRating && runnerProfile && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowRatingModal(true)}
              className="text-xs font-bold"
            >
              <Star className="w-3.5 h-3.5 mr-1" /> Rate Runner
            </Button>
          )}
        </div>
      </div>

      {/* ── ERRAND JOURNEY STEPPER RIBBON ── */}
      {errand.status !== 'cancelled' && errand.status !== 'disputed' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Live Flight Journey
          </span>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
            {journeySteps.map((s, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div key={s.key} className="flex flex-col space-y-1.5 relative z-10">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                        isPast
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-blue-600 text-white shadow-sm ring-4 ring-blue-100'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className={`text-xs font-bold ${isCurrent ? 'text-blue-700' : isPast ? 'text-slate-900' : 'text-slate-400'}`}>
                      {s.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 pl-9 leading-tight">
                    {s.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MAIN 2-COLUMN DISPLAY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: Map & Route Details */}
        <div className="lg:col-span-7 space-y-6">

          {/* Leaflet Map Surface */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden h-[340px] relative">
            <MapContainer
              center={mapCenter}
              zoom={14}
              scrollWheelZoom={false}
              className="h-full w-full z-0"
            >
              <RecenterMap center={mapCenter} />
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {pathPositions.length > 1 && (
                <Polyline positions={pathPositions} pathOptions={{ color: '#2563EB', weight: 4 }} />
              )}
              {errand.pickup_coordinates && (
                <Marker position={[errand.pickup_coordinates.lat, errand.pickup_coordinates.lng]}>
                  <Popup>📍 Pickup: {errand.pickup_location}</Popup>
                </Marker>
              )}
              {errand.delivery_coordinates && (
                <Marker position={[errand.delivery_coordinates.lat, errand.delivery_coordinates.lng]}>
                  <Popup>📦 Destination: {errand.delivery_location}</Popup>
                </Marker>
              )}
              {latestTracking?.current_location && (
                <Marker position={[latestTracking.current_location.lat, latestTracking.current_location.lng]}>
                  <Popup>🏃 Runner Broadcast Location</Popup>
                </Marker>
              )}
            </MapContainer>

            {/* Map Telemetry Overlay */}
            <div className="absolute top-3 left-3 z-[400] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-sm">
              <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              Live Route Radar
            </div>
          </div>

          {/* Route & Instructions Strip */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Route & Task Directives
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pickup Location</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">{errand.pickup_location}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Delivery Destination</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">{errand.delivery_location}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Instructions</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{errand.description}</p>
              </div>
            </div>
          </div>

          {/* Live Activity Broadcast Log */}
          {tracking.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Runner Broadcast Feed
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                {tracking.map((t) => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      <span className="font-medium text-slate-800">{t.status_update}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: PIN Security Capsule, Runner Info & Escrow */}
        <div className="lg:col-span-5 space-y-6">

          {/* ── PROMINENT DELIVERY PIN SECURITY CAPSULE ── */}
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-6 text-white shadow-md relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-300" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">
                  Delivery PIN Verification
                </span>
              </div>
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                Do Not Share Early
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center border border-white/20 space-y-1">
              <span className="text-[11px] text-blue-200 font-medium">Your 4-Digit Secret Code</span>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-4xl sm:text-5xl font-black tracking-[0.25em] text-white select-all">
                  {errand.delivery_pin || '••••'}
                </span>
                {errand.delivery_pin && (
                  <button
                    onClick={copyPIN}
                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
                    title="Copy PIN"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-blue-100 leading-relaxed text-center">
              ⚠️ Give this PIN to your runner <strong>ONLY</strong> when they arrive and place your item into your hands. This releases their payout.
            </p>
          </div>

          {/* Runner Profile Strip (If Assigned) */}
          {runnerProfile ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Assigned Campus Runner
                </span>
                <Badge variant="success" className="text-[10px] font-bold">
                  Verified Student
                </Badge>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-black flex items-center justify-center text-base shrink-0 border border-emerald-200 dark:border-emerald-800">
                  {runnerProfile.full_name?.charAt(0) || <User className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                    {runnerProfile.full_name}
                  </h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {runnerProfile.student_id}
                  </p>
                  <div className="flex items-center gap-1 text-amber-500 text-xs font-bold mt-1">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <span>{runnerProfile.rating?.toFixed(1) || '5.0'}</span>
                    <span className="text-slate-400 font-normal">({runnerProfile.total_ratings || 0} reviews)</span>
                  </div>
                </div>
              </div>

              {runnerProfile.phone_number && (
                <a
                  href={`tel:${runnerProfile.phone_number}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Call Runner ({runnerProfile.phone_number})
                </a>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm text-center space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto">
                <Clock className="w-5 h-5 animate-spin" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Broadcasting on Campus Grid</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Nearby verified runners are notified. A runner will accept and lock your mission shortly.
              </p>
            </div>
          )}

          {/* Financial Settlement Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Escrow Settlement
            </span>
            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="flex justify-between text-slate-500 pt-1">
                <span>Total Amount Secured:</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(errand.total_fee)}</span>
              </div>
              <div className="flex justify-between text-slate-500 pt-2">
                <span>Runner Payout (80%):</span>
                <span className="font-mono font-bold text-emerald-600">{formatCurrency(errand.runner_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-400 pt-2 text-[11px]">
                <span>Platform Assurance (20%):</span>
                <span className="font-mono">{formatCurrency(errand.platform_fee)}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ── CANCEL MODAL ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Cancel Errand</h3>
              <button onClick={() => setShowCancelModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <p className="text-xs text-slate-500">
              Your locked escrow fee of <strong>{formatCurrency(errand.total_fee)}</strong> will be refunded immediately to your wallet.
            </p>
            <form onSubmit={handleCancelErrand} className="space-y-4">
              <textarea
                placeholder="Reason for cancellation (optional)..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 text-xs"
                rows={3}
              />
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setShowCancelModal(false)} className="flex-1">
                  Keep Errand
                </Button>
                <Button type="submit" variant="danger" isLoading={cancellingErrand} className="flex-1 font-bold">
                  Confirm Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DISPUTE MODAL ── */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Report an Issue / Dispute</h3>
              <button onClick={() => setShowDisputeModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <p className="text-xs text-slate-500">
              Our campus operations team will freeze escrow and review runner tracking logs within 24 hours.
            </p>
            <form onSubmit={handleSubmitDispute} className="space-y-4">
              <select
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs"
              >
                <option value="Item not delivered / Missing">Item not delivered / Missing</option>
                <option value="Wrong items delivered">Wrong items delivered</option>
                <option value="Damaged / Spoiled goods">Damaged / Spoiled goods</option>
                <option value="Runner unresponsive">Runner unresponsive</option>
                <option value="Runner demanded extra cash">Runner demanded extra cash</option>
              </select>
              <textarea
                placeholder="Describe what happened..."
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                required
                className="w-full p-3 rounded-xl border border-slate-300 text-xs"
                rows={3}
              />
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setShowDisputeModal(false)} className="flex-1">
                  Close
                </Button>
                <Button type="submit" variant="primary" isLoading={submittingDispute} className="flex-1 font-bold">
                  File Dispute
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RATING MODAL ── */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <h3 className="font-bold text-base text-slate-900">Rate Your Runner</h3>
            <p className="text-xs text-slate-500">How did {runnerProfile?.full_name} handle your errand?</p>

            {/* Stars */}
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedStars(star)}
                  className={`text-2xl transition-transform hover:scale-110 ${
                    star <= selectedStars ? 'text-amber-500' : 'text-slate-200'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 justify-center py-2">
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setSelectedTags((prev) =>
                        isSelected ? prev.filter((t) => t !== tag) : [...prev, tag]
                      );
                    }}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            <textarea
              placeholder="Leave a friendly review..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 text-xs"
              rows={3}
            />

            <Button
              onClick={handleSubmitRating}
              variant="primary"
              size="lg"
              className="w-full font-bold"
              isLoading={submittingRating}
            >
              Submit Review
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
