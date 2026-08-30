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

  // Fetch runner profile and existing rating when errand loads
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
                <h4 className="text-sm text-white/60 mb-3">Delivery & Runner Review</h4>
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
                  </div>
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

      {/* RATING MODAL */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="glass-card rounded-3xl p-6 max-w-md w-full border border-white/20 relative">
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
              {/* Star Selector */}
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

              {/* Quick Compliment Tags */}
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

              {/* Review Comment */}
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

              {/* Submit Button */}
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
    </div>
  );
}
