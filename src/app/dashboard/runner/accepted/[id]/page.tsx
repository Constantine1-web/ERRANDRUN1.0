'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { MapPin, Package, CheckCircle, Navigation, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

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
      toast.success('Errand marked in progress. Head to delivery!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteErrand = async () => {
    if (!errandId) return;
    if (pin.trim().length !== 4) {
      toast.error('Valid 4-digit PIN required');
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
      toast.success('PIN verified! Errand completed.');
      
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
    return <div className="p-8 text-center text-white/60">Loading mission briefing...</div>;
  }

  if (error || !errand) {
    return <div className="p-8 text-center text-rose-400">{error || 'Errand not found'}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Active Mission</h1>
          <p className="text-white/60 text-sm">Follow the steps to complete this errand.</p>
        </div>
        <Badge variant="info">
          {phase === 'pickup' ? 'Phase 1: Pickup' : phase === 'delivery' ? 'Phase 2: Delivery' : 'Mission Complete'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Phase 1: PICKUP */}
        <Card className={`transition-all duration-300 ${phase === 'pickup' ? 'ring-2 ring-primary-500 scale-[1.02]' : 'opacity-50 grayscale'}`}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${phase === 'pickup' ? 'bg-primary-500/20 text-primary-400' : 'bg-white/10 text-white/50'}`}>
                <Package className="w-5 h-5" />
              </div>
              <CardTitle>Phase 1: Pickup</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
             <div>
               <p className="text-xs text-white/50 mb-1 uppercase tracking-wider">Pickup Location</p>
               <p className="text-sm font-medium text-white flex items-start gap-2">
                 <MapPin className="w-4 h-4 text-white/40 shrink-0 mt-0.5" />
                 {errand.pickup_location}
               </p>
             </div>
             <div>
               <p className="text-xs text-white/50 mb-1 uppercase tracking-wider">Errand Details</p>
               <p className="text-sm font-medium text-white">{errand.title}</p>
             </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={handleMarkInProgress} 
              disabled={phase !== 'pickup' || submitting}
              isLoading={submitting && phase === 'pickup'}
            >
              {phase === 'pickup' ? 'Confirm Pickup' : 'Picked Up'}
            </Button>
          </CardFooter>
        </Card>

        {/* Phase 2: DELIVERY */}
        <Card className={`transition-all duration-300 ${phase === 'delivery' ? 'ring-2 ring-emerald-500 scale-[1.02]' : phase === 'completed' ? 'border-emerald-500/50 bg-emerald-500/5' : 'opacity-50 grayscale'}`}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${phase === 'delivery' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/50'}`}>
                <Navigation className="w-5 h-5" />
              </div>
              <CardTitle>Phase 2: Delivery</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
             <div>
               <p className="text-xs text-white/50 mb-1 uppercase tracking-wider">Delivery Destination</p>
               <p className="text-sm font-medium text-white flex items-start gap-2">
                 <MapPin className="w-4 h-4 text-white/40 shrink-0 mt-0.5" />
                 {errand.delivery_location}
               </p>
             </div>
             
             {phase === 'delivery' && (
               <div className="pt-4 border-t border-white/10">
                 <label className="text-xs text-white/60 mb-2 block flex items-center gap-1.5">
                   <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                   Customer Delivery PIN
                 </label>
                 <Input 
                   placeholder="Enter 4-digit PIN"
                   value={pin}
                   onChange={(e) => setPin(e.target.value)}
                   maxLength={4}
                   className="font-mono text-center tracking-widest text-lg"
                 />
               </div>
             )}
          </CardContent>
          <CardFooter>
            {phase === 'completed' ? (
              <Button className="w-full bg-emerald-500/20 text-emerald-400 border-emerald-500/20" disabled>
                <CheckCircle className="w-4 h-4 mr-2" />
                Delivery Complete
              </Button>
            ) : (
              <Button 
                variant="primary"
                className={`w-full ${phase === 'delivery' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 border-emerald-500/50' : ''}`}
                onClick={handleCompleteErrand} 
                disabled={phase !== 'delivery' || submitting || pin.length !== 4}
                isLoading={submitting && phase === 'delivery'}
              >
                Complete Delivery
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
         <p className="text-sm text-white/60">Total Earnings</p>
         <p className="text-xl font-bold text-emerald-400">₦{Number(errand.total_fee).toLocaleString()}</p>
      </div>
    </div>
  );
}
