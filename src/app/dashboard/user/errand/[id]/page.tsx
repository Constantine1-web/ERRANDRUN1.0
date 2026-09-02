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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
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
  const [_isCompleting, setIsCompleting] = useState(false);
  const [_completionMessage, setCompletionMessage] = useState<string | null>(null);

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

  const _handleComplete = async () => {
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
    return [5.0377, 7.9128] as [number, number]; // Uyo coords default
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

    return [
      {
        label: 'Searching',
        status: status === 'unassigned' ? 'active' : currentIndex > 0 ? 'done' : 'pending'
      },
      {
        label: 'Assigned',
        status: status === 'assigned' ? 'active' : currentIndex > 1 ? 'done' : 'pending'
      },
      {
        label: 'In Progress',
        status: status === 'in_progress' ? 'active' : currentIndex > 2 ? 'done' : 'pending'
      },
      {
        label: 'Delivered',
        status: status === 'completed' ? 'done' : 'pending'
      }
    ] as any;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Live Delivery Tracking</h2>
          <p className="text-slate-500 text-sm mt-0.5">Real-time status updates and delivery verification.</p>
        </div>
        <div>
          {errand && getStatusBadge(errand.status)}
        </div>
      </div>

      {loading ? (
        <Card className="p-12 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-2" />
          <p className="text-slate-500 text-sm">Loading tracking details…</p>
        </Card>
      ) : !errand ? (
        <Card className="p-12 text-center">
          <p className="text-slate-500 text-sm">Errand not found.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Details & Timeline */}
          <div className="lg:col-span-1 space-y-6">
            {/* Status Timeline */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-bold">Progress Timeline</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <Timeline steps={getTimelineSteps(errand.status)} />
              </CardContent>
            </Card>

            {/* Delivery PIN Card */}
            {(errand.status === 'assigned' || errand.status === 'in_progress' || errand.status === 'unassigned') && (
              <Card className="border-2 border-blue-200 bg-blue-50/60 shadow-sm text-center">
                <CardContent className="p-5">
                  <p className="text-xs text-blue-700 font-bold uppercase tracking-widest mb-1.5">Secure 4-Digit Delivery PIN</p>
                  <div className="text-4xl font-mono font-black tracking-[0.3em] text-slate-900 bg-white py-3 px-6 rounded-xl border border-blue-200 inline-block shadow-sm">
                    {errand.delivery_pin || '----'}
                  </div>
                  <p className="text-xs text-slate-600 mt-2.5 max-w-xs mx-auto">
                    Provide this PIN to your runner <strong>only after</strong> you receive and inspect your items.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Errand Summary Card */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-bold">Errand Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 text-sm">
                <div>
                  <h3 className="font-bold text-slate-900">{errand.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{errand.description}</p>
                </div>
                
                <div className="space-y-2 py-3 border-y border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase">Pickup</span>
                    <span className="text-slate-800 font-medium">{errand.pickup_location}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase">Dropoff</span>
                    <span className="text-slate-800 font-medium">{errand.delivery_location}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Total Escrow</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">{formatCurrency(Number(errand.total_fee))}</span>
                </div>
              </CardContent>
            </Card>

            {/* Runner Card */}
            {runnerProfile && (
              <Card>
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-bold">Assigned Runner</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                      {runnerProfile.full_name?.charAt(0) || 'R'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{runnerProfile.full_name}</p>
                      <p className="text-xs text-slate-500">Rating: {runnerProfile.rating || '5.0'} ⭐</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Live Map & Actions */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="flex flex-col h-[400px] overflow-hidden">
              <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-bold">Live GPS Map</CardTitle>
              </CardHeader>
              <div className="flex-1 w-full relative z-0">
                <MapContainer center={mapCenter} zoom={14} scrollWheelZoom={false} className="h-full w-full">
                  <RecenterMap center={mapCenter} />
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {pathPositions.length > 1 && (
                    <Polyline positions={pathPositions} pathOptions={{ color: '#2563EB', weight: 4, opacity: 0.8 }} />
                  )}
                  {latestTracking?.current_location && (
                    <Marker position={[latestTracking.current_location.lat, latestTracking.current_location.lng]}> 
                      <Popup>
                        <span className="font-semibold text-sm">Runner Position</span><br />
                        <span className="text-xs">{new Date(latestTracking.timestamp).toLocaleTimeString()}</span>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Action Controls */}
              <Card>
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-bold">Actions & Resolution</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {errand.status === 'unassigned' || errand.status === 'payment_pending' ? (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500">
                        Waiting for an available runner. You can cancel for an instant full wallet refund.
                      </p>
                      <Button variant="danger" className="w-full text-xs font-bold" onClick={() => setShowCancelModal(true)}>
                        Cancel Errand (Instant Refund)
                      </Button>
                    </div>
                  ) : errand.status === 'assigned' || errand.status === 'in_progress' ? (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500">
                        Your runner is executing this task. Give them your 4-digit PIN when delivered.
                      </p>
                      {!existingDispute && (
                        <Button variant="outline" className="w-full text-xs text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => setShowDisputeModal(true)}>
                          Report Issue / File Dispute
                        </Button>
                      )}
                    </div>
                  ) : errand.status === 'completed' ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 text-green-700 rounded-lg text-xs font-medium text-center">
                        ✓ Delivery completed & funds released.
                      </div>
                      {!existingRating && (
                        <Button variant="primary" className="w-full text-xs font-bold" onClick={() => setShowRatingModal(true)}>
                          Rate Runner
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Errand is {errand.status}.</p>
                  )}
                </CardContent>
              </Card>

              {/* Status Log */}
              <Card>
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-bold">Status Log</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1 text-xs">
                    {trackingLoading ? (
                      <p className="text-slate-400">Loading activity...</p>
                    ) : tracking.length === 0 ? (
                      <p className="text-slate-400">No activity recorded yet.</p>
                    ) : (
                      tracking.map((t: any) => (
                        <div key={t.id} className="border-l-2 border-blue-500 pl-2.5 py-0.5">
                          <p className="font-semibold text-slate-800">{t.status_update}</p>
                          <p className="text-[10px] text-slate-400">{new Date(t.timestamp).toLocaleTimeString()}</p>
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
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="max-w-md w-full relative shadow-xl">
            <button
              type="button"
              onClick={() => setShowRatingModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">Rate Your Runner</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmitRating} className="space-y-4">
                <div className="flex justify-center gap-2 py-3 bg-slate-50 rounded-xl">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSelectedStars(star)}
                      className={`text-3xl transition-transform hover:scale-110 ${
                        star <= selectedStars ? 'text-amber-400' : 'text-slate-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">Feedback tags</label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                          selectedTags.includes(tag)
                            ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">Review (Optional)</label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Tell other students about your experience..."
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <Button type="submit" variant="primary" className="w-full font-bold" isLoading={submittingRating}>
                  Submit Rating
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* DISPUTE MODAL */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="max-w-md w-full relative shadow-xl">
            <button
              type="button"
              onClick={() => setShowDisputeModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-red-600">File a Dispute</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmitDispute} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Reason</label>
                  <select
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Detailed Explanation</label>
                  <textarea
                    required
                    value={disputeDescription}
                    onChange={(e) => setDisputeDescription(e.target.value)}
                    placeholder="Provide full details for admin review..."
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <Button type="submit" variant="danger" className="w-full font-bold" isLoading={submittingDispute} disabled={!disputeDescription}>
                  Submit Dispute to Admin
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CANCEL MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="max-w-md w-full relative shadow-xl">
            <button
              type="button"
              onClick={() => setShowCancelModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">Cancel Errand</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-600 mb-4">
                Are you sure you want to cancel? Since no runner has accepted yet, your funds ({formatCurrency(errand?.total_fee || 0)}) will be refunded immediately to your wallet.
              </p>
              <form onSubmit={handleCancelErrand} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Reason (Optional)</label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Changed my mind"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2.5">
                  <Button type="button" variant="secondary" className="flex-1 text-xs" onClick={() => setShowCancelModal(false)}>
                    Keep Errand
                  </Button>
                  <Button type="submit" variant="danger" className="flex-1 text-xs font-bold" isLoading={cancellingErrand}>
                    Confirm Cancel
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
