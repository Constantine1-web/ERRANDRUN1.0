const fs = require('fs');
const path = require('path');

const targetPath = path.join(process.cwd(), 'src/app/dashboard/user/errand/[id]/page.tsx');

const content = `'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { authFetch } from '@/lib/apiClient';
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
  Phone,
  User,
  Star,
  Copy,
  ChevronLeft,
  Navigation,
  MessageSquare,
  PackageCheck
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

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
        console.warn('Failed to load errand', err);
      } finally {
        setLoading(false);
      }
    };
    fetchErrand();

    // Subscribe to errand changes
    const sub = supabase
      .channel(\`errand_live_\${id}\`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'errands', filter: \`id.eq.\${id}\` },
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
    '🤝 Polite & Friendly',
    '📦 Careful Handling',
    '📞 Great Communication',
    '🎯 Perfect Instructions',
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
      authFetch(\`/api/ratings?errandId=\${errand.id}\`)
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.data && res.data.length > 0) {
            setExistingRating(res.data[0]);
          }
        })
        .catch(console.error);
    }

    authFetch(\`/api/disputes?errandId=\${errand.id}\`)
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
        const response = await authFetch(\`/api/payments?reference=\${encodeURIComponent(paymentReference)}\`);
        const result = await response.json();
        if (result?.success) {
          toast.success('Payment confirmed! Errand is now live.');
          setErrand((current) => (current ? { ...current, status: 'unassigned' } : current));
        }
      } catch (error) {
        console.warn('Payment verification failed', error);
      }
    };
    verifyPayment();
  }, [paymentReference]);

  const handleCancelErrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!errand) return;

    try {
      setCancellingErrand(true);
      const res = await authFetch('/api/errands/cancel', {
        method: 'POST',
        body: JSON.stringify({ errandId: errand.id, reason: cancelReason }),
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

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!errand) return;

    try {
      setSubmittingDispute(true);
      const res = await authFetch('/api/disputes', {
        method: 'POST',
        body: JSON.stringify({
          errandId: errand.id,
          reason: disputeReason,
          description: disputeDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to file dispute');

      toast.success('Dispute filed successfully. Support will contact you.');
      setExistingDispute({ id: 'new', reason: disputeReason, status: 'open' });
      setShowDisputeModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to file dispute');
    } finally {
      setSubmittingDispute(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!errand || !errand.runner_id) return;
    try {
      setSubmittingRating(true);
      const res = await authFetch('/api/ratings', {
        method: 'POST',
        body: JSON.stringify({
          errandId: errand.id,
          rateeId: errand.runner_id,
          rating: selectedStars,
          review: reviewComment,
          categories: selectedTags,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to submit rating');

      toast.success('Rating submitted successfully!');
      setExistingRating(data.rating);
      setShowRatingModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const copyPIN = () => {
    if (!errand?.delivery_pin) return;
    navigator.clipboard.writeText(errand.delivery_pin);
    toast.success('PIN copied to clipboard');
  };

  if (loading) return <CenteredPageLoader message="Connecting to secure campus link..." />;
  if (!errand) return <div className="text-center py-20 text-slate-500">Errand not found.</div>;

  const getStatusDisplay = () => {
    switch (errand.status) {
      case 'payment_pending': return { text: 'Awaiting Escrow', color: 'text-amber-500', icon: Clock };
      case 'unassigned': return { text: 'Finding Runner', color: 'text-blue-500', icon: SearchIcon };
      case 'assigned': return { text: 'Runner Accepted', color: 'text-indigo-500', icon: CheckCircle2 };
      case 'in_progress': return { text: 'In Progress', color: 'text-blue-600', icon: Navigation };
      case 'completed': return { text: 'Completed', color: 'text-emerald-500', icon: PackageCheck };
      case 'cancelled': return { text: 'Cancelled', color: 'text-slate-400', icon: X };
      case 'disputed': return { text: 'Disputed', color: 'text-rose-500', icon: AlertTriangle };
      default: return { text: errand.status, color: 'text-slate-500', icon: Clock };
    }
  };

  const StatusIcon = getStatusDisplay().icon;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* ── TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/errands')}
            className="p-2.5 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={\`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider \${getStatusDisplay().color}\`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {getStatusDisplay().text}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">• #{errand.id.slice(0, 8)}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {errand.title}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {errand.status !== 'completed' && errand.status !== 'cancelled' && (
            <>
              {errand.status === 'unassigned' && (
                <Button variant="outline" size="sm" onClick={() => setShowCancelModal(true)} className="text-rose-600 border-rose-200 hover:bg-rose-50">
                  Cancel Errand
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowDisputeModal(true)} className="text-amber-700 border-amber-300 hover:bg-amber-50">
                Report Issue
              </Button>
            </>
          )}
          {errand.status === 'completed' && !existingRating && runnerProfile && (
            <Button variant="primary" size="sm" onClick={() => setShowRatingModal(true)}>
              <Star className="w-4 h-4 mr-1" /> Rate Runner
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT COLUMN: TRACKING & DETAILS ── */}
        <div className="lg:col-span-7 space-y-6">

          {/* Progress Tracker Widget */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 bg-blue-600 h-full rounded-l-3xl"></div>
            
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-6">Live Status Timeline</h3>
            
            <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 space-y-8">
              {/* Event 1: Request Created */}
              <div className="relative pl-6">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-600 border-4 border-white dark:border-slate-900"></div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Request Created & Secured</h4>
                <p className="text-xs text-slate-500 mt-1">{formatCurrency(errand.total_fee)} held in escrow.</p>
              </div>

              {/* Event 2: Runner Assigned */}
              <div className="relative pl-6">
                <div className={\`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 \${['assigned', 'in_progress', 'completed'].includes(errand.status) ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}\`}></div>
                <h4 className={\`text-sm font-bold \${['assigned', 'in_progress', 'completed'].includes(errand.status) ? 'text-slate-900 dark:text-white' : 'text-slate-400'}\`}>Runner Matched</h4>
                {runnerProfile ? (
                  <p className="text-xs text-slate-500 mt-1">Matched with {runnerProfile.full_name}.</p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">Waiting for a runner to accept.</p>
                )}
              </div>

              {/* Event 3: In Progress (Live Updates) */}
              <div className="relative pl-6">
                <div className={\`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 \${['in_progress', 'completed'].includes(errand.status) ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}\`}></div>
                <h4 className={\`text-sm font-bold \${['in_progress', 'completed'].includes(errand.status) ? 'text-slate-900 dark:text-white' : 'text-slate-400'}\`}>In Progress</h4>
                
                {tracking.length > 0 && (
                  <div className="mt-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-2 border border-slate-100 dark:border-slate-700">
                    {tracking.map((t, idx) => (
                      <div key={t.id} className={\`text-xs flex gap-2 \${idx === 0 ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-500'}\`}>
                        <span className="text-[10px] opacity-70 shrink-0 mt-0.5">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>{t.status_update}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Event 4: Delivered */}
              <div className="relative pl-6">
                <div className={\`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 \${errand.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}\`}></div>
                <h4 className={\`text-sm font-bold \${errand.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}\`}>Delivered & Verified</h4>
                <p className="text-xs text-slate-400 mt-1">Waiting for PIN confirmation.</p>
              </div>
            </div>
          </div>

          {/* Locations */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Pickup</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{errand.pickup_location}</span>
              </div>
            </div>
            <div className="pl-5 border-l-2 border-dashed border-slate-200 dark:border-slate-800 ml-5 h-6"></div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <Navigation className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Dropoff</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{errand.delivery_location}</span>
                {errand.description && (
                  <p className="text-xs text-slate-500 mt-1 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                    "{errand.description}"
                  </p>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN: RUNNER & PIN ── */}
        <div className="lg:col-span-5 space-y-6">

          {/* PIN Security Capsule */}
          {errand.status !== 'completed' && errand.status !== 'cancelled' && (
            <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-blue-200" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">Delivery PIN</span>
              </div>
              <div className="bg-white/10 rounded-2xl p-4 text-center border border-white/20">
                <span className="text-[11px] text-blue-200 font-medium block mb-1">Give this to your runner to confirm delivery</span>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono text-4xl sm:text-5xl font-black tracking-[0.2em]">{errand.delivery_pin || '••••'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Runner Profile */}
          {runnerProfile ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-left">Your Runner</h3>
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto mb-3 flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-sm">
                <User className="w-8 h-8 text-slate-400" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">{runnerProfile.full_name}</h4>
              <div className="flex items-center justify-center gap-1 text-sm text-amber-500 font-bold mt-1">
                <Star className="w-4 h-4 fill-current" /> {runnerProfile.rating ? runnerProfile.rating.toFixed(1) : 'New'}
                <span className="text-slate-400 font-normal ml-1">({runnerProfile.total_ratings || 0} runs)</span>
              </div>
              
              {/* Contact Buttons */}
              <div className="flex gap-2 mt-6">
                <Button variant="secondary" className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700">
                  <MessageSquare className="w-4 h-4 mr-2" /> Message
                </Button>
                <Button variant="primary" className="flex-1 rounded-xl" onClick={() => window.open(\`tel:\${runnerProfile.phone_number}\`)}>
                  <Phone className="w-4 h-4 mr-2" /> Call
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-dashed rounded-3xl p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 mx-auto flex items-center justify-center animate-pulse mb-3">
                <SearchIcon className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Finding your runner...</p>
              <p className="text-xs text-slate-500 mt-1">We are pinging students nearby.</p>
            </div>
          )}

          {/* Pricing Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Escrow Settlement</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Escrow:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(errand.total_fee)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Runner Payout (80%):</span>
                <span className="font-mono font-bold text-emerald-600">{formatCurrency(errand.runner_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>Platform Assurance (20%):</span>
                <span className="font-mono">{formatCurrency(errand.platform_fee)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* MODALS RETAINED EXACTLY AS BEFORE... */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Cancel Errand</h3>
              <button onClick={() => setShowCancelModal(false)} className="text-slate-400">✕</button>
            </div>
            <p className="text-xs text-slate-500">Your locked escrow fee of <strong>{formatCurrency(errand.total_fee)}</strong> will be refunded immediately.</p>
            <form onSubmit={handleCancelErrand} className="space-y-4">
              <textarea placeholder="Reason (optional)..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm" rows={3} />
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setShowCancelModal(false)} className="flex-1">Keep Errand</Button>
                <Button type="submit" variant="danger" isLoading={cancellingErrand} className="flex-1">Confirm Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDisputeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Report Issue</h3>
              <button onClick={() => setShowDisputeModal(false)} className="text-slate-400">✕</button>
            </div>
            <form onSubmit={handleSubmitDispute} className="space-y-4">
              <select value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} className="w-full h-12 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm">
                <option>Item not delivered / Missing</option>
                <option>Wrong items delivered</option>
                <option>Damaged / Spoiled goods</option>
                <option>Runner unresponsive</option>
              </select>
              <textarea placeholder="Describe what happened..." value={disputeDescription} onChange={(e) => setDisputeDescription(e.target.value)} required className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm" rows={3} />
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setShowDisputeModal(false)} className="flex-1">Close</Button>
                <Button type="submit" variant="primary" isLoading={submittingDispute} className="flex-1">File Dispute</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRatingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-center">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Rate Runner</h3>
            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" onClick={() => setSelectedStars(s)} className={\`text-3xl \${s <= selectedStars ? 'text-amber-500' : 'text-slate-200 dark:text-slate-700'}\`}>★</button>
              ))}
            </div>
            <textarea placeholder="Leave a review..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm" rows={2} />
            <Button onClick={handleSubmitRating} variant="primary" className="w-full font-bold" isLoading={submittingRating}>Submit Review</Button>
          </div>
        </div>
      )}

    </div>
  );
}

// Just a dummy icon since I removed Search from imports above but used it for unassigned status
function SearchIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );
}
`;

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully refactored ErrandDetailPage to use a timeline instead of a map.');
