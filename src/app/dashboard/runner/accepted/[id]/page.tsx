'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import Link from 'next/link';
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

  // ── STRIPPED: Awaiting redesign ──
  if (loading) return <div>Loading task details...</div>;
  if (error || !errand) return <div>{error || 'Errand not found'} <Link href="/dashboard/runner">Back to Runner Dashboard</Link></div>;

  const payout = Number(errand.total_fee) * 0.8;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Link href="/dashboard/runner">Back to Marketplace</Link>
      <h1>{errand.title}</h1>
      <div>Your Payout: {formatCurrency(payout)}</div>

      <div>
        <p>Phase: {phase}</p>
        <p>Pickup: {errand.pickup_location}</p>
        <p>Dropoff: {errand.delivery_location}</p>
      </div>

      {phase === 'pickup' && (
        <div>
          <h3>Head to Pickup Location</h3>
          <button onClick={handleMarkInProgress} disabled={submitting}>Confirm Item Picked Up → Start Delivery</button>
        </div>
      )}

      {phase === 'delivery' && (
        <div>
          <h3>Deliver & Verify PIN</h3>
          <input type="text" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="Customer PIN" />
          <button onClick={handleCompleteErrand} disabled={submitting || pin.length !== 4}>Verify PIN & Complete Task</button>
        </div>
      )}

      {phase === 'completed' && (
        <div>
          <h3>Task Completed!</h3>
          <p>Your wallet has been credited with {formatCurrency(payout)}.</p>
        </div>
      )}
    </div>
  );
}
