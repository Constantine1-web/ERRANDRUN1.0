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

  // ── STRIPPED: Awaiting redesign ──
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Live Delivery Tracking</h1>
      
      {loading ? (
        <p>Loading tracking details…</p>
      ) : !errand ? (
        <p>Errand not found.</p>
      ) : (
        <div>
          <div>Status: {errand.status}</div>
          
          {(errand.status === 'assigned' || errand.status === 'in_progress' || errand.status === 'unassigned') && (
            <div>
              <h3>Secure 4-Digit Delivery PIN</h3>
              <p>{errand.delivery_pin || '----'}</p>
            </div>
          )}

          <div>
            <h3>Errand Summary</h3>
            <p>Title: {errand.title}</p>
            <p>Description: {errand.description}</p>
            <p>Pickup: {errand.pickup_location}</p>
            <p>Dropoff: {errand.delivery_location}</p>
            <p>Total Escrow: {formatCurrency(Number(errand.total_fee))}</p>
          </div>

          {runnerProfile && (
            <div>
              <h3>Assigned Runner</h3>
              <p>Name: {runnerProfile.full_name}</p>
              <p>Rating: {runnerProfile.rating || '5.0'} ⭐</p>
            </div>
          )}

          <div>
            <h3>Actions & Resolution</h3>
            {(errand.status === 'unassigned' || errand.status === 'payment_pending') && (
              <button onClick={() => setShowCancelModal(true)}>Cancel Errand</button>
            )}
            {(errand.status === 'assigned' || errand.status === 'in_progress') && !existingDispute && (
              <button onClick={() => setShowDisputeModal(true)}>Report Issue / File Dispute</button>
            )}
            {errand.status === 'completed' && !existingRating && (
              <button onClick={() => setShowRatingModal(true)}>Rate Runner</button>
            )}
          </div>

          <div>
            <h3>Status Log</h3>
            {trackingLoading ? (
              <p>Loading activity...</p>
            ) : tracking.length === 0 ? (
              <p>No activity recorded yet.</p>
            ) : (
              tracking.map((t: any) => (
                <div key={t.id}>
                  <p>{t.status_update}</p>
                  <p>{new Date(t.timestamp).toLocaleTimeString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showRatingModal && (
        <div style={{ border: '1px solid black', padding: '20px', marginTop: '20px' }}>
          <h2>Rate Your Runner</h2>
          <form onSubmit={handleSubmitRating}>
            <div>
              <label>Stars (1-5): </label>
              <input type="number" min="1" max="5" value={selectedStars} onChange={(e) => setSelectedStars(Number(e.target.value))} />
            </div>
            <div>
              <label>Tags: </label>
              {availableTags.map((tag) => (
                <label key={tag}>
                  <input type="checkbox" checked={selectedTags.includes(tag)} onChange={() => toggleTag(tag)} />
                  {tag}
                </label>
              ))}
            </div>
            <div>
              <label>Review: </label>
              <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
            </div>
            <button type="submit" disabled={submittingRating}>Submit Rating</button>
            <button type="button" onClick={() => setShowRatingModal(false)}>Cancel</button>
          </form>
        </div>
      )}

      {showDisputeModal && (
        <div style={{ border: '1px solid black', padding: '20px', marginTop: '20px' }}>
          <h2>File a Dispute</h2>
          <form onSubmit={handleSubmitDispute}>
            <div>
              <label>Reason: </label>
              <select value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}>
                <option value="Item not delivered / Missing">Item not delivered / Missing</option>
                <option value="Damaged or incorrect item">Damaged or incorrect item</option>
                <option value="Unreasonable delay or abandoned task">Unreasonable delay or abandoned task</option>
                <option value="Pricing / Payment discrepancy">Pricing / Payment discrepancy</option>
                <option value="Unprofessional behavior">Unprofessional behavior</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label>Detailed Explanation: </label>
              <textarea required value={disputeDescription} onChange={(e) => setDisputeDescription(e.target.value)} />
            </div>
            <button type="submit" disabled={submittingDispute || !disputeDescription}>Submit Dispute</button>
            <button type="button" onClick={() => setShowDisputeModal(false)}>Cancel</button>
          </form>
        </div>
      )}

      {showCancelModal && (
        <div style={{ border: '1px solid black', padding: '20px', marginTop: '20px' }}>
          <h2>Cancel Errand</h2>
          <form onSubmit={handleCancelErrand}>
            <div>
              <label>Reason (Optional): </label>
              <input type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            </div>
            <button type="submit" disabled={cancellingErrand}>Confirm Cancel</button>
            <button type="button" onClick={() => setShowCancelModal(false)}>Keep Errand</button>
          </form>
        </div>
      )}
    </div>
  );
}
