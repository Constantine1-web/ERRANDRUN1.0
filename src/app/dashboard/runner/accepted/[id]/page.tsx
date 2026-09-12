'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { authFetch } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { formatCurrency } from '@/utils/pricing';
import {
  MapPin,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  ChevronLeft,
  Bike,
  Navigation,
  KeyRound,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CenteredPageLoader } from '@/components/CenteredPageLoader';

interface ErrandDetail {
  id: string;
  title: string;
  description?: string;
  pickup_location: string;
  delivery_location: string;
  total_fee: number;
  status: string;
}

export default function AcceptedMissionPage() {
  const params = useParams();
  const errandId = params?.id as string | undefined;
  const router = useRouter();

  const [errand, setErrand] = useState<ErrandDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [phase, setPhase] = useState<'pickup' | 'delivery' | 'completed'>('pickup');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!errandId) return;

    const fetchErrand = async () => {
      const { data, error: fetchError } = await supabase
        .from('errands')
        .select('id, title, description, pickup_location, delivery_location, total_fee, status')
        .eq('id', errandId)
        .single();

      if (fetchError) {
        console.warn(fetchError);
        setError('Unable to load task details.');
      } else {
        setErrand(data);
        if (data.status === 'in_progress') setPhase('delivery');
        if (data.status === 'completed') setPhase('completed');
      }
      setLoading(false);
    };

    fetchErrand();
  }, [errandId]);

  const handleMarkInProgress = async () => {
    if (!errandId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('errands')
        .update({ status: 'in_progress' })
        .eq('id', errandId);

      if (error) throw error;

      setPhase('delivery');
      toast.success('Pickup confirmed! Head to delivery destination.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteErrand = async () => {
    if (!errandId) return;
    if (pin.trim().length !== 4) {
      toast.error('Valid 4-digit PIN required from customer');
      return;
    }

    setSubmitting(true);
    try {
      const response = await authFetch('/api/tracking/complete', {
        method: 'POST',
        body: JSON.stringify({ errandId, pin }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to verify PIN');

      const { error } = await supabase
        .from('errands')
        .update({ status: 'completed' })
        .eq('id', errandId);

      if (error) throw error;

      setPhase('completed');
      toast.success('PIN verified! Payout credited to your wallet.');

      setTimeout(() => {
        router.push('/dashboard/runner');
      }, 3000);
    } catch (err: any) {
      toast.error(err.message || 'Incorrect PIN entered');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <CenteredPageLoader message="Booting Mission Console…" />;
  }

  if (error || !errand) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Task Not Found</h2>
        <p className="text-sm text-slate-500">{error || 'This assignment is unavailable.'}</p>
        <Button onClick={() => router.push('/dashboard/runner')}>Return to Radar</Button>
      </div>
    );
  }

  const payout = Number(errand.total_fee) * 0.8;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6 animate-fadeIn">

      {/* ── TOP MISSION HUD ── */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <Link
          href="/dashboard/runner"
          className="flex items-center gap-2 p-2 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </Link>
        <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
          Mission #{errand.id.slice(0, 8)}
        </span>
      </div>

      {/* ── MISSION TITLE & PAYOUT HERO ── */}
      <div className="bg-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-xl space-y-4 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full pointer-events-none"></div>
        
        <div className="flex items-center justify-between relative z-10">
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-300 flex items-center gap-1.5 bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-800">
            <Bike className="w-4 h-4" /> Live Console
          </span>
          <span className="text-sm font-black font-mono text-emerald-400">
            {formatCurrency(payout)} Payout
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white relative z-10 leading-tight">
          {errand.title}
        </h1>

        {errand.description && (
          <p className="text-sm text-slate-300 leading-relaxed pt-3 border-t border-slate-800 relative z-10">
            "{errand.description}"
          </p>
        )}
      </div>

      {/* ── TWO-STAGE TACTILE WORKFLOW ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
            phase === 'pickup'
              ? 'border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-300 shadow-sm'
              : 'border-slate-200 bg-slate-50 text-slate-400 dark:bg-slate-800 dark:border-slate-700'
          }`}
        >
          <span className="text-[10px] font-black uppercase tracking-widest block mb-1 opacity-70">Stage 1</span>
          <p className="font-bold text-sm">Pickup Target</p>
        </div>

        <div className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
            phase === 'delivery'
              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-500 dark:text-emerald-300 shadow-sm'
              : phase === 'completed'
              ? 'border-emerald-600 bg-emerald-500 text-white shadow-md'
              : 'border-slate-200 bg-slate-50 text-slate-400 dark:bg-slate-800 dark:border-slate-700'
          }`}
        >
          <span className="text-[10px] font-black uppercase tracking-widest block mb-1 opacity-70">Stage 2</span>
          <p className="font-bold text-sm">{phase === 'completed' ? 'Mission Success' : 'Customer Delivery'}</p>
        </div>
      </div>

      {/* ── STAGE 1: HEAD TO PICKUP ── */}
      {phase === 'pickup' && (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Action Required</span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">1. Secure the Package</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Proceed to the pickup coordinate below and retrieve the requested items.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Pickup Location</span>
              <span className="text-base font-bold text-slate-900 dark:text-white">{errand.pickup_location}</span>
            </div>
          </div>

          <Button
            size="lg"
            variant="primary"
            isLoading={submitting}
            onClick={handleMarkInProgress}
            className="w-full h-14 text-base font-black shadow-md bg-blue-600 hover:bg-blue-700 border-none"
          >
            Item Secured → Start Delivery <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}

      {/* ── STAGE 2: DELIVERY & PIN SETTLEMENT ── */}
      {phase === 'delivery' && (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Final Step</span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">2. Deliver & Verify PIN</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Meet the customer at the destination. Ask them for their 4-digit secret PIN to unlock your escrow payout.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Delivery Destination</span>
              <span className="text-base font-bold text-slate-900 dark:text-white">{errand.delivery_location}</span>
            </div>
          </div>

          {/* 4-Digit PIN Vault Input */}
          <div className="space-y-4 text-center bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700">
            <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Customer 4-Digit PIN
            </label>
            <input
              type="text"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-48 h-16 mx-auto text-center font-mono text-3xl font-black tracking-[0.3em] rounded-2xl border-2 border-emerald-400 dark:border-emerald-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-900/50 transition-all shadow-inner"
            />
            <p className="text-[10px] text-slate-400">Ask the customer to check their tracking screen.</p>
          </div>

          <Button
            size="lg"
            variant="success"
            disabled={pin.length !== 4 || submitting}
            isLoading={submitting}
            onClick={handleCompleteErrand}
            className="w-full h-14 text-base font-black shadow-lg bg-emerald-600 hover:bg-emerald-700 border-none"
          >
            Verify PIN & Release {formatCurrency(payout)} Payout
          </Button>
        </div>
      )}

      {/* ── STAGE 3: MISSION COMPLETE CELEBRATION ── */}
      {phase === 'completed' && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-[2rem] p-10 border border-emerald-200 dark:border-emerald-800/50 text-center space-y-5 animate-scaleIn">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <Check className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-emerald-900 dark:text-emerald-300 mb-2">Mission Accomplished!</h2>
            <p className="text-sm text-emerald-700 dark:text-emerald-500/80 max-w-xs mx-auto">
              Customer PIN verified. <strong className="font-mono">{formatCurrency(payout)}</strong> has been securely credited to your wallet.
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard/runner')} className="w-full h-12 font-bold bg-emerald-600 hover:bg-emerald-700 text-white mt-4 border-none">
            Return to Radar
          </Button>
        </div>
      )}

    </div>
  );
}
