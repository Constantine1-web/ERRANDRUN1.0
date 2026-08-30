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

          <div className="flex flex-col lg:grid lg:grid-cols-[1fr_380px] gap-6">
            <div className="order-3 lg:order-none glass-card p-4 rounded-3xl lg:row-span-3 flex flex-col">
              <h4 className="text-sm font-medium mb-4">Live Runner Map</h4>
              <div className="w-full aspect-[4/3] lg:aspect-auto lg:h-[400px] rounded-2xl overflow-hidden border border-white/10 flex-1">
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

            <div className="order-1 lg:order-none glass-card p-4 rounded-3xl space-y-4 lg:col-start-2 lg:row-start-1">
              <h4 className="text-sm text-white/60 mb-1">Actions & Delivery</h4>

              {/* Dispute Active Banner */}
              {existingDispute && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Dispute {existingDispute.status}
                    </span>
                    <span className="text-[10px] text-white/40">
                      {new Date(existingDispute.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 font-medium">{existingDispute.reason}</p>
                  <p className="text-[11px] text-white/60">{existingDispute.description}</p>
                  {existingDispute.admin_notes && (
                    <p className="text-[11px] text-primary-300 mt-1 pt-1 border-t border-white/5">
                      Admin Note: {existingDispute.admin_notes}
                    </p>
                  )}
                </div>
              )}

              {errand.status === 'unassigned' || errand.status === 'payment_pending' ? (
                <div className="space-y-3">
                  <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-2xl">
                    <p className="text-xs text-primary-300 font-semibold mb-0.5">Looking for Runner</p>
                    <p className="text-[11px] text-white/60">
                      Your errand is published to campus runners.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="w-full py-2.5 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all"
                  >
                    Cancel Errand & Refund
                  </button>
                </div>
              ) : errand.status === 'assigned' || errand.status === 'in_progress' ? (
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

                  {!existingDispute && (
                    <button
                      type="button"
                      onClick={() => setShowDisputeModal(true)}
                      className="w-full py-2 text-xs text-rose-300/80 hover:text-rose-300 hover:underline transition-all block text-center"
                    >
                      Need help? Report an issue / Dispute
                    </button>
                  )}
                </div>
              ) : errand.status === 'completed' ? (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                    <p className="text-xs text-emerald-300 font-semibold mb-1">✓ Errand Completed</p>
                    <p className="text-xs text-white/60">Payment released to runner wallet.</p>
                  </div>

                  {existingRating ? (
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/60 font-medium">Your Rating:</span>
                        <div className="flex text-amber-400 text-sm">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star}>
                              {star <= existingRating.rating ? '★' : '☆'}
                            </span>
                          ))}
                        </div>
                      </div>
                      {existingRating.review && (
                        <p className="text-xs text-white/80 italic mt-1 bg-white/5 p-2 rounded-xl">
                          "{existingRating.review}"
                        </p>
                      )}
                      {existingRating.categories && Array.isArray(existingRating.categories) && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {existingRating.categories.map((c: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-primary-500/10 border border-primary-500/20 text-primary-300 text-[10px] rounded-full"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowRatingModal(true)}
                      className="w-full btn-primary py-2.5 text-xs flex items-center justify-center gap-1.5"
                    >
                      ⭐ Rate & Review Runner
                    </button>
                  )}

                  {!existingDispute && (
                    <button
                      type="button"
                      onClick={() => setShowDisputeModal(true)}
                      className="w-full py-2 text-xs text-white/40 hover:text-white/80 hover:underline transition-all block text-center"
                    >
                      Report a Problem with this Errand
                    </button>
                  )}
                </div>
              ) : errand.status === 'cancelled' ? (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-300">
                  This errand was cancelled. Funds have been refunded to your wallet.
                </div>
              ) : (
                <p className="text-sm text-white/60">
                  Status: {errand.status}
                </p>
              )}
            </div>

            {runnerProfile && (
              <div className="order-4 lg:order-none glass-card p-4 rounded-3xl lg:col-start-2 lg:row-start-2">
                <h4 className="text-sm text-white/60 mb-3">Runner Info</h4>
                <div className="flex items-center gap-3">
                   {runnerProfile.avatar_url ? (
                     <img src={runnerProfile.avatar_url} alt="Runner" className="w-10 h-10 rounded-full bg-white/10 object-cover" />
                   ) : (
                     <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 font-medium">
                       {runnerProfile.full_name?.charAt(0) || 'R'}
                     </div>
                   )}
                   <div>
                     <p className="font-medium text-white">{runnerProfile.full_name}</p>
                     <p className="text-xs text-white/60">Rating: {runnerProfile.rating || 'N/A'} ⭐ ({runnerProfile.total_ratings || 0})</p>
                   </div>
                </div>
              </div>
            )}

            <div className="order-5 lg:order-none glass-card p-4 rounded-3xl lg:col-start-2 lg:row-start-3">
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
          </div>
        </div>
      )}

      {/* RATING MODAL */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="glass-card rounded-3xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto border border-white/20 relative">
            <button
              type="button"
              onClick={() => setShowRatingModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
            >
              ✕
            </button>

            <h3 className="text-2xl font-bold text-white mb-1">Rate Your Runner</h3>
            <p className="text-xs text-white/60 mb-6">
              How was your errand experience with {runnerProfile?.full_name || 'your campus runner'}?
            </p>

            <form onSubmit={handleSubmitRating} className="space-y-5">
              <div className="flex items-center justify-center gap-2 py-3 bg-white/5 rounded-2xl">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedStars(star)}
                    className={`text-3xl transition-transform hover:scale-125 ${
                      star <= selectedStars ? 'text-amber-400' : 'text-white/20'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs text-white/60 block mb-2 font-medium">
                  Select compliments:
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          active
                            ? 'bg-primary-500 text-white border-primary-500'
                            : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-white/60 block mb-1.5 font-medium">
                  Review Comment (optional):
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share details about the delivery or communication..."
                  className="input textarea w-full text-xs"
                  rows={3}
                />
              </div>

              <button
                type="submit"
                disabled={submittingRating}
                className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2"
              >
                {submittingRating ? 'Submitting...' : 'Submit Rating & Feedback'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DISPUTE MODAL */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="glass-card rounded-3xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto border border-rose-500/30 relative">
            <button
              type="button"
              onClick={() => setShowDisputeModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
            >
              ✕
            </button>

            <h3 className="text-2xl font-bold text-white mb-1">Report an Issue / Dispute</h3>
            <p className="text-xs text-white/60 mb-6">
              Our campus administration team will investigate and arbitrate within 24 hours.
            </p>

            <form onSubmit={handleSubmitDispute} className="space-y-4">
              <div>
                <label className="text-xs text-white/60 block mb-1.5 font-medium">
                  Reason for Dispute:
                </label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="input w-full text-xs bg-dark-base"
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
                <label className="text-xs text-white/60 block mb-1.5 font-medium">
                  Detailed Explanation:
                </label>
                <textarea
                  required
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  placeholder="Explain exactly what happened, what was missing, or what the issue is..."
                  className="input textarea w-full text-xs"
                  rows={4}
                />
              </div>

              <button
                type="submit"
                disabled={submittingDispute || !disputeDescription}
                className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 border-rose-500 disabled:opacity-50"
              >
                {submittingDispute ? 'Submitting Dispute...' : 'Submit Dispute Claim'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL ERRAND MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="glass-card rounded-3xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto border border-white/20 relative">
            <button
              type="button"
              onClick={() => setShowCancelModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold text-white mb-2">Cancel This Errand?</h3>
            <p className="text-xs text-white/60 mb-4">
              Since no runner has accepted this task yet, cancelling will immediately credit the full fee ({formatCurrency(errand?.total_fee || 0)}) back to your wallet.
            </p>

            <form onSubmit={handleCancelErrand} className="space-y-4">
              <div>
                <label className="text-xs text-white/60 block mb-1 font-medium">
                  Reason for cancelling (optional):
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Changed my mind, found another solution"
                  className="input w-full text-xs"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 btn-secondary py-2.5 text-xs"
                >
                  Keep Errand
                </button>
                <button
                  type="submit"
                  disabled={cancellingErrand}
                  className="flex-1 btn-primary py-2.5 text-xs bg-rose-600 hover:bg-rose-500 border-rose-500 disabled:opacity-50"
                >
                  {cancellingErrand ? 'Cancelling...' : 'Confirm & Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
