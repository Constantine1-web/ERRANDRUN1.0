'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { MapPin, Package, CheckCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/utils/pricing';

interface ErrandDetail {
  id: string;
  title: string;
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
        .select('id, title, pickup_location, delivery_location, total_fee, status')
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
      toast.success('Errand marked in progress. Head to delivery destination!');
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
        body: JSON.stringify({ errandId, runnerId: userData?.user?.id, pin })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to verify PIN');
      
      const { error } = await supabase
        .from('errands')
        .update({ status: 'completed' })
        .eq('id', errandId);

      if (error) throw error;
      
      setPhase('completed');
      toast.success('PIN verified! Delivery completed and payout credited.');
      
      setTimeout(() => {
         router.push('/dashboard/runner');
      }, 2000);

    } catch (err: any) {
      toast.error(err.message || 'Failed to complete errand');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-2" />
        <p className="text-slate-500 text-sm">Loading task details...</p>
      </div>
    );
  }

  if (error || !errand) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center text-red-600">
        <p>{error || 'Errand not found'}</p>
        <Link href="/dashboard/runner" className="text-blue-600 text-xs font-bold mt-3 block">
          ← Back to Runner Dashboard
        </Link>
      </div>
    );
  }

  const payout = Number(errand.total_fee) * 0.8;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/runner" className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Marketplace
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{errand.title}</h1>
          <p className="text-slate-500 text-xs mt-0.5">Execute your assigned delivery following the steps below.</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs text-slate-400 block font-semibold uppercase">Your Payout</span>
          <span className="text-2xl font-black text-green-600 font-mono">{formatCurrency(payout)}</span>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-4 rounded-xl border-2 transition-all ${
          phase === 'pickup' 
            ? 'border-blue-600 bg-blue-50/60 shadow-sm' 
            : phase === 'delivery' || phase === 'completed'
            ? 'border-green-300 bg-green-50/50'
            : 'border-slate-200 bg-white'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              phase === 'pickup' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
            }`}>
              {phase === 'delivery' || phase === 'completed' ? '✓' : '1'}
            </span>
            <span className="font-bold text-sm text-slate-900">Step 1: Pickup</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 truncate font-medium">📍 {errand.pickup_location}</p>
        </div>

        <div className={`p-4 rounded-xl border-2 transition-all ${
          phase === 'delivery' 
            ? 'border-blue-600 bg-blue-50/60 shadow-sm' 
            : phase === 'completed'
            ? 'border-green-300 bg-green-50/50'
            : 'border-slate-200 bg-white opacity-60'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              phase === 'delivery' ? 'bg-blue-600 text-white' : phase === 'completed' ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {phase === 'completed' ? '✓' : '2'}
            </span>
            <span className="font-bold text-sm text-slate-900">Step 2: Delivery & PIN</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 truncate font-medium">📦 {errand.delivery_location}</p>
        </div>
      </div>

      {/* Execution Actions */}
      {phase === 'pickup' && (
        <Card className="border-blue-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Head to Pickup Location
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <span className="text-slate-400 font-semibold uppercase block">Pickup Address</span>
              <p className="text-slate-900 font-medium text-sm">{errand.pickup_location}</p>
            </div>

            <p className="text-xs text-slate-600">
              When you have collected the items or arrived at the queue, click the button below to notify the customer.
            </p>

            <Button 
              variant="primary" 
              size="lg" 
              className="w-full font-bold"
              onClick={handleMarkInProgress}
              isLoading={submitting}
            >
              Confirm Item Picked Up → Start Delivery
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === 'delivery' && (
        <Card className="border-blue-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Deliver & Verify PIN
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <span className="text-slate-400 font-semibold uppercase block">Dropoff Destination</span>
              <p className="text-slate-900 font-medium text-sm">{errand.delivery_location}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5 uppercase tracking-wider">
                Customer's 4-Digit Delivery PIN
              </label>
              <Input 
                type="text"
                maxLength={4}
                placeholder="Enter 4 digits"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="text-center font-mono text-2xl tracking-[0.3em] font-black h-12"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Ask the customer for the 4-digit PIN displayed on their live tracking screen.
              </p>
            </div>

            <Button 
              variant="primary" 
              size="lg" 
              className="w-full font-bold"
              onClick={handleCompleteErrand}
              isLoading={submitting}
              disabled={pin.length !== 4}
            >
              Verify PIN & Complete Task
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === 'completed' && (
        <Card className="border-green-200 bg-green-50 text-center p-6">
          <CardContent className="pt-4 space-y-2">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
            <h2 className="text-xl font-bold text-slate-900">Task Completed!</h2>
            <p className="text-xs text-slate-600">
              Your wallet has been credited with {formatCurrency(payout)}. Returning to dashboard...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
