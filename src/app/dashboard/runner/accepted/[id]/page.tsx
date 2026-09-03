'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
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
  Package,
  KeyRound,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

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
        console.error(fetchError);
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
      const { data: userData } = await supabase.auth.getUser();
      const response = await fetch('/api/tracking/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errandId, runnerId: userData?.user?.id, pin }),
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
      }, 2500);
    } catch (err: any) {
      toast.error(err.message || 'Incorrect PIN entered');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center text-xs text-slate-400">
        Booting Mission Console…
      </div>
    );
  }

  if (error || !errand) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Task Not Found</h2>
        <p className="text-xs text-slate-500">{error || 'This assignment is unavailable.'}</p>
        <Button onClick={() => router.push('/dashboard/runner')}>Return to Radar</Button>
      </div>
    );
  }

  const payout = Number(errand.total_fee) * 0.8;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6 animate-fadeIn">

      {/* ── TOP MISSION HUD ── */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <Link
          href="/dashboard/runner"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Opportunity Radar
        </Link>
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
          Mission #{errand.id.slice(0, 8)}
        </span>
      </div>

      {/* ── MISSION TITLE & PAYOUT HERO ── */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-300 flex items-center gap-1.5">
            <Bike className="w-3.5 h-3.5" />
            Live On-Foot Console
          </span>
          <span className="text-xs font-black font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800">
            {formatCurrency(payout)} Payout
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-white">
          {errand.title}
        </h1>

        {errand.description && (
          <p className="text-xs text-slate-300 leading-relaxed pt-1 border-t border-slate-800">
            {errand.description}
          </p>
        )}
      </div>

      {/* ── TWO-STAGE TACTILE WORKFLOW ── */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className={`p-4 rounded-2xl border text-center transition-all ${
            phase === 'pickup'
              ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500'
              : 'border-slate-200 bg-white text-slate-400'
          }`}
        >
          <span className="text-[10px] font-black uppercase tracking-wider block">Stage 1</span>
          <p className="font-bold text-sm">Pickup Point</p>
        </div>

        <div
          className={`p-4 rounded-2xl border text-center transition-all ${
            phase === 'delivery'
              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500'
              : phase === 'completed'
              ? 'border-emerald-600 bg-emerald-100 text-emerald-900'
              : 'border-slate-200 bg-white text-slate-400'
          }`}
        >
          <span className="text-[10px] font-black uppercase tracking-wider block">Stage 2</span>
          <p className="font-bold text-sm">Customer Delivery</p>
        </div>
      </div>

      {/* ── STAGE 1: HEAD TO PICKUP ── */}
      {phase === 'pickup' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Action Required</span>
            <h2 className="text-lg font-bold text-slate-900">1. Head to Pickup Point</h2>
            <p className="text-xs text-slate-500">Go to the location below and secure the requested items.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pickup Location</span>
              <span className="text-base font-bold text-slate-900">{errand.pickup_location}</span>
            </div>
          </div>

          <Button
            size="lg"
            variant="primary"
            isLoading={submitting}
            onClick={handleMarkInProgress}
            className="w-full h-14 text-base font-black shadow-md"
          >
            Item Secured → Start Delivery <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}

      {/* ── STAGE 2: DELIVERY & PIN SETTLEMENT ── */}
      {phase === 'delivery' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Final Step</span>
            <h2 className="text-lg font-bold text-slate-900">2. Deliver & Verify Secret PIN</h2>
            <p className="text-xs text-slate-500">
              Meet the customer, hand over the items, and ask them for their 4-digit Delivery PIN.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Delivery Destination</span>
              <span className="text-base font-bold text-slate-900">{errand.delivery_location}</span>
            </div>
          </div>

          {/* 4-Digit PIN Input Box */}
          <div className="space-y-2 text-center pt-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-center gap-1.5">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              Enter Customer 4-Digit PIN
            </label>
            <input
              type="text"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-48 h-16 mx-auto text-center font-mono text-3xl font-black tracking-[0.3em] rounded-2xl border-2 border-emerald-400 bg-emerald-50/40 text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-200"
            />
          </div>

          <Button
            size="lg"
            variant="success"
            disabled={pin.length !== 4 || submitting}
            isLoading={submitting}
            onClick={handleCompleteErrand}
            className="w-full h-14 text-base font-black shadow-md bg-emerald-600 hover:bg-emerald-700"
          >
            Verify PIN & Release {formatCurrency(payout)} Payout
          </Button>
        </div>
      )}

      {/* ── STAGE 3: MISSION COMPLETE CELEBRATION ── */}
      {phase === 'completed' && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 shadow-sm animate-scaleIn">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Mission Accomplished!</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            The customer PIN was verified. <strong>{formatCurrency(payout)}</strong> has been credited to your wallet balance.
          </p>
          <Button onClick={() => router.push('/dashboard/runner')} variant="primary" className="font-bold">
            Return to Radar
          </Button>
        </div>
      )}

    </div>
  );
}
