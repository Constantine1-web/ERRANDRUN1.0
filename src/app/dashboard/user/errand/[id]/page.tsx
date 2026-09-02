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

import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Timeline } from '@/components/ui/Timeline';

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

  // Fetch runner profile, existing rating, and existing dispute when errand loads
  useEffect(() => {
    if (!errand) return;

    if (errand.runner_id) {
      supabase
        .from('profiles')
        .select('id, full_name, student_id, rating, total_ratings, avatar_url')
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

    // Fetch dispute if any
    fetch(`/api/disputes?errandId=${errand.id}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setExistingDispute(res.data);
        }
      })
      .catch(console.error);
  }, [errand]);

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
        body: JSON.stringify({
          errandId: errand.id,
          userId,
          reason: cancelReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel errand');
      }

      toast.success(data.message || 'Errand cancelled');
      setErrand((current) => (current ? { ...current, status: 'cancelled' } : current));
      setShowCancelModal(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to cancel errand');
    } finally {
      setCancellingErrand(false);
    }
  };

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
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to file dispute');
      }

      toast.success('Dispute filed successfully. Admin will review within 24 hours.');
      setExistingDispute(data.data);
      setErrand((current) => (current ? { ...current, status: 'disputed' } : current));
      setShowDisputeModal(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to file dispute');
    } finally {
      setSubmittingDispute(false);
    }
  };

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
          ? { ...current, status: 'completed', actual_completion_time: new Date().toISOString() }
          : current
      );
      setCompletionMessage('Delivery marked complete. Thank you for confirming.');
      toast.success('Errand marked completed! Runner wallet credited.');
      setShowRatingModal(true);
    } catch (error: any) {
      console.error('Completion confirmation failed', error);
      setCompletionMessage(error.message || 'Unable to confirm completion. Please try again.');
      toast.error('Failed to mark completed');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!errand || !errand.runner_id) return;

    try {
      setSubmittingRating(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        toast.error('Please sign in');
        return;
      }

      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errandId: errand.id,
          raterId: userId,
          rateeId: errand.runner_id,
          rating: selectedStars,
          review: reviewComment,
          categories: selectedTags,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit rating');
      }

      toast.success('Thank you for rating your runner!');
      setExistingRating(data.data);
      setShowRatingModal(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Could not submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
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

  const getStatusBadge = (status: string) => {
      switch (status) {
          case 'completed': return <Badge variant="success">Completed</Badge>;
          case 'in_progress': return <Badge variant="info">In Progress</Badge>;
          case 'assigned': return <Badge variant="info">Assigned</Badge>;
          case 'unassigned': return <Badge variant="warning">Looking for Runner</Badge>;
          case 'cancelled': return <Badge variant="danger">Cancelled</Badge>;
          case 'disputed': return <Badge variant="danger">Disputed</Badge>;
          default: return <Badge variant="outline">{status}</Badge>;
      }
  };

  const getTimelineSteps = (status: string) => {
    const statuses = ['unassigned', 'assigned', 'in_progress', 'completed'];
    
    let currentIndex = statuses.indexOf(status);
    if (status === 'payment_pending') currentIndex = -1;
    if (status === 'cancelled' || status === 'disputed') {
       return [
         {
           id: 'unassigned',
           label: 'Searching for Runner',
           status: 'completed'
         },
         {
           id: 'cancelled_disputed',
           label: status === 'cancelled' ? 'Cancelled' : 'Disputed',
           description: status === 'cancelled' ? 'Errand was cancelled.' : 'Errand is under dispute.',
           status: 'error'
         }
       ] as any;
    }

    return [
      {
        id: 'unassigned',
        label: 'Searching for Runner',
        description: 'Publishing errand to campus runners.',
        status: status === 'unassigned' ? 'current' : currentIndex > 0 ? 'completed' : 'upcoming'
      },
      {
        id: 'assigned',
        label: 'Runner Assigned',
        description: 'A runner has accepted your errand.',
        status: status === 'assigned' ? 'current' : currentIndex > 1 ? 'completed' : 'upcoming'
      },
      {
        id: 'in_progress',
        label: 'In Progress',
        description: 'The runner is actively completing the errand.',
        status: status === 'in_progress' ? 'current' : currentIndex > 2 ? 'completed' : 'upcoming'
      },
      {
        id: 'completed',
        label: 'Completed',
        description: 'Errand delivered successfully.',
        status: status === 'completed' ? 'completed' : 'upcoming'
      }
    ] as any;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Mission Control</h2>
          <p className="text-white/60">Live tracking and details for your errand.</p>
        </div>
        <div>
          {errand && getStatusBadge(errand.status)}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <p className="text-white/60">Loading mission data…</p>
        </div>
      ) : !errand ? (
        <div className="flex items-center justify-center p-12">
          <p className="text-white/60">Mission not found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Details & Timeline */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Mission Brief</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg text-white">{errand.title}</h3>
                  <p className="text-sm text-white/60 mt-1">{errand.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/10">
                  <div>
                    <p className="text-xs text-white/40 mb-1">Pickup</p>
                    <p className="text-sm font-medium text-white">{errand.pickup_location}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1">Dropoff</p>
                    <p className="text-sm font-medium text-white">{errand.delivery_location}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Total Fee</span>
                    <span className="font-semibold text-white">{formatCurrency(Number(errand.total_fee))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Priority</span>
                    <span className="text-white capitalize">{errand.priority}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <Timeline steps={getTimelineSteps(errand.status)} />
              </CardContent>
            </Card>

            {runnerProfile && (
              <Card>
                <CardHeader>
                  <CardTitle>Operative Assigned</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                     {runnerProfile.avatar_url ? (
                       <img src={runnerProfile.avatar_url} alt="Runner" className="w-12 h-12 rounded-full bg-white/10 object-cover border-2 border-primary-500/30" />
                     ) : (
                       <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold border-2 border-primary-500/30">
                         {runnerProfile.full_name?.charAt(0) || 'R'}
                       </div>
                     )}
                     <div>
                       <p className="font-semibold text-white">{runnerProfile.full_name}</p>
                       <p className="text-sm text-white/60">Rating: {runnerProfile.rating || 'N/A'} ⭐ ({runnerProfile.total_ratings || 0})</p>
                     </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Map & Actions */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="flex flex-col h-[500px]">
              <CardHeader className="pb-4">
                <CardTitle>Live Map</CardTitle>
              </CardHeader>
              <div className="flex-1 w-full bg-dark-base relative z-0">
                <MapContainer center={mapCenter} zoom={14} scrollWheelZoom={false} className="h-full w-full rounded-b-2xl">
                  <RecenterMap center={mapCenter} />
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {pathPositions.length > 1 && (
                    <Polyline positions={pathPositions} pathOptions={{ color: '#38bdf8', weight: 4, opacity: 0.8 }} />
                  )}
                  {latestTracking?.current_location && (
                    <Marker position={[latestTracking.current_location.lat, latestTracking.current_location.lng]}> 
                      <Popup>
                        <span className="font-semibold">Operative Location</span><br />
                        {new Date(latestTracking.timestamp).toLocaleString()}
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Action Center</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {existingDispute && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                          Dispute {existingDispute.status}
                        </span>
                        <span className="text-xs text-white/40">
                          {new Date(existingDispute.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-white/90 font-medium">{existingDispute.reason}</p>
                      <p className="text-xs text-white/60">{existingDispute.description}</p>
                      {existingDispute.admin_notes && (
                        <p className="text-xs text-primary-300 mt-2 pt-2 border-t border-white/10">
                          Admin Note: {existingDispute.admin_notes}
                        </p>
                      )}
                    </div>
                  )}

                  {errand.status === 'unassigned' || errand.status === 'payment_pending' ? (
                    <div className="space-y-4">
                      <p className="text-sm text-white/60">
                        Waiting for an operative to accept your mission. You can abort and get a full refund if it's taking too long.
                      </p>
                      <Button variant="danger" className="w-full" onClick={() => setShowCancelModal(true)}>
                        Abort Mission (Refund)
                      </Button>
                    </div>
                  ) : errand.status === 'assigned' || errand.status === 'in_progress' ? (
                    <div className="space-y-4">
                      <div className="p-6 bg-dark-base border-2 border-brand-green/30 rounded-xl text-center shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                        <p className="text-xs text-brand-green font-bold mb-3 uppercase tracking-widest">Secure Delivery PIN</p>
                        <div className="text-4xl font-mono font-bold tracking-[0.25em] text-white filter blur-md hover:blur-none transition-all duration-300 cursor-help select-none bg-black/40 py-3 rounded-lg border border-white/5 inline-block px-8">
                          {errand.delivery_pin || '----'}
                        </div>
                        <p className="text-xs text-white/40 mt-4 max-w-[250px] mx-auto">
                          Hover to reveal. Provide this to your operative ONLY upon receiving your items.
                        </p>
                      </div>

                      {!existingDispute && (
                        <Button variant="ghost" className="w-full text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" onClick={() => setShowDisputeModal(true)}>
                          Report Issue / Dispute
                        </Button>
                      )}
                    </div>
                  ) : errand.status === 'completed' ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                        <p className="text-emerald-400 font-semibold">Mission Accomplished</p>
                        <p className="text-sm text-white/60 mt-1">Funds have been released.</p>
                      </div>

                      {existingRating ? (
                        <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-white/60 font-medium">Your Rating</span>
                            <div className="flex text-amber-400">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span key={star}>
                                  {star <= existingRating.rating ? '★' : '☆'}
                                </span>
                              ))}
                            </div>
                          </div>
                          {existingRating.review && (
                            <p className="text-sm text-white/80 italic bg-black/20 p-3 rounded-lg">
                              "{existingRating.review}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <Button variant="primary" className="w-full" onClick={() => setShowRatingModal(true)}>
                          Rate Operative
                        </Button>
                      )}

                      {!existingDispute && (
                        <Button variant="ghost" className="w-full text-white/40" onClick={() => setShowDisputeModal(true)}>
                          Report a Problem
                        </Button>
                      )}
                    </div>
                  ) : errand.status === 'cancelled' ? (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
                      <p className="text-rose-400 font-medium">Mission Aborted</p>
                      <p className="text-sm text-white/60 mt-1">Funds have been refunded.</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Mission Log</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {trackingLoading ? (
                      <p className="text-sm text-white/40">Syncing logs…</p>
                    ) : tracking.length === 0 ? (
                      <p className="text-sm text-white/40">No logs recorded yet.</p>
                    ) : (
                      tracking.map((t: any) => (
                        <div key={t.id} className="relative pl-4 border-l-2 border-white/10 pb-4 last:pb-0">
                          <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary-500" />
                          <p className="text-sm font-medium text-white/90">{t.status_update}</p>
                          <p className="text-xs text-white/40 mt-1">
                            {new Date(t.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* RATING MODAL */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="max-w-md w-full relative">
            <button
              type="button"
              onClick={() => setShowRatingModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white z-50"
            >
              ✕
            </button>
            <CardHeader>
              <CardTitle>Rate Operative</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitRating} className="space-y-6">
                <div className="flex justify-center gap-2 py-4 bg-black/20 rounded-xl border border-white/5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSelectedStars(star)}
                      className={`text-4xl transition-transform hover:scale-110 ${
                        star <= selectedStars ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'text-white/20'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-sm text-white/80 block mb-2 font-medium">Commendations</label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          selectedTags.includes(tag)
                            ? 'bg-primary-500/20 text-primary-300 border-primary-500/50'
                            : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-white/80 block mb-2 font-medium">After Action Report (Optional)</label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Details about the mission execution..."
                    className="w-full bg-dark-base border border-white/10 rounded-xl p-3 text-sm text-white placeholder-white/30 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none"
                    rows={3}
                  />
                </div>

                <Button type="submit" variant="primary" className="w-full" isLoading={submittingRating}>
                  Submit Report
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* DISPUTE MODAL */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="max-w-md w-full relative border-rose-500/30">
            <button
              type="button"
              onClick={() => setShowDisputeModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white z-50"
            >
              ✕
            </button>
            <CardHeader>
              <CardTitle className="text-rose-400">File a Dispute</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitDispute} className="space-y-4">
                <div>
                  <label className="text-sm text-white/80 block mb-2 font-medium">Reason</label>
                  <select
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    className="w-full bg-dark-base border border-white/10 rounded-xl p-3 text-sm text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                  >
                    <option value="Item not delivered / Missing">Item not delivered / Missing</option>
                    <option value="Damaged or incorrect item">Damaged or incorrect item</option>
                    <option value="Unreasonable delay or abandoned task">Unreasonable delay or abandoned task</option>
                    <option value="Pricing / Payment discrepancy">Pricing / Payment discrepancy</option>
                    <option value="Unprofessional behavior">Unprofessional behavior</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-white/80 block mb-2 font-medium">Detailed Explanation</label>
                  <textarea
                    required
                    value={disputeDescription}
                    onChange={(e) => setDisputeDescription(e.target.value)}
                    placeholder="Provide full details for command review..."
                    className="w-full bg-dark-base border border-white/10 rounded-xl p-3 text-sm text-white placeholder-white/30 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                    rows={4}
                  />
                </div>

                <Button type="submit" variant="danger" className="w-full" isLoading={submittingDispute} disabled={!disputeDescription}>
                  Submit Dispute
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CANCEL MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="max-w-md w-full relative">
            <button
              type="button"
              onClick={() => setShowCancelModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white z-50"
            >
              ✕
            </button>
            <CardHeader>
              <CardTitle>Abort Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/60 mb-6">
                Are you sure you want to abort? As no operative has accepted yet, your funds ({formatCurrency(errand?.total_fee || 0)}) will be instantly refunded to your wallet.
              </p>
              <form onSubmit={handleCancelErrand} className="space-y-6">
                <div>
                  <label className="text-sm text-white/80 block mb-2 font-medium">Reason (Optional)</label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. No longer needed"
                    className="w-full bg-dark-base border border-white/10 rounded-xl p-3 text-sm text-white placeholder-white/30 focus:border-white/30 focus:ring-1 focus:ring-white/30 outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowCancelModal(false)}>
                    Hold
                  </Button>
                  <Button type="submit" variant="danger" className="flex-1" isLoading={cancellingErrand}>
                    Confirm Abort
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
