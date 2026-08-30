'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { calculateDistance, calculatePricing, formatCurrency, estimateQueueComplexity } from '@/utils/pricing';
import type { ErrandCategory, ErrandPriority } from '@/types';
import toast from 'react-hot-toast';

export default function NewErrandPage() {
  const router = useRouter();

  const [category, setCategory] = useState<ErrandCategory>('academic');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [priority, setPriority] = useState<ErrandPriority>('normal');
  const [hasQueue, setHasQueue] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const distanceKm = useMemo(() => {
    if (pickupLat && pickupLng && deliveryLat && deliveryLng) {
      return calculateDistance(pickupLat, pickupLng, deliveryLat, deliveryLng);
    }
    return 2;
  }, [pickupLat, pickupLng, deliveryLat, deliveryLng]);

  const pricing = useMemo(() => {
    return calculatePricing(category, priority, distanceKm, hasQueue, false);
  }, [category, priority, distanceKm, hasQueue]);

  useEffect(() => {
    setHasQueue(estimateQueueComplexity(pickupLocation));
  }, [pickupLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        toast.error('Please sign in to create an errand');
        router.push('/login');
        return;
      }

      const payload: any = {
        requester_id: user.id,
        category,
        title,
        description,
        pickup_location: pickupLocation,
        delivery_location: deliveryLocation,
        pickup_coordinates: pickupLat && pickupLng ? { lat: pickupLat, lng: pickupLng } : null,
        delivery_coordinates: deliveryLat && deliveryLng ? { lat: deliveryLat, lng: deliveryLng } : null,
        base_fee: pricing.baseFee,
        distance_surcharge: pricing.distanceSurcharge,
        queue_complexity_fee: pricing.queueComplexityFee,
        weather_surge: pricing.weatherSurge,
        urgency_multiplier: pricing.urgencyMultiplier,
        total_fee: pricing.totalFee,
        platform_fee: pricing.platformFee,
        runner_amount: pricing.runnerAmount,
        priority,
        status: 'payment_pending',
      };

      const { data, error } = await supabase
        .from('errands')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      const email = user.email;
      if (!email) {
        toast.error('Your account needs an email to process payment.');
        return;
      }

      const paymentResponse = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email,
          amount: pricing.totalFee,
          errandId: data.id,
          metadata: {
            errandTitle: title,
          },
        }),
      });

      const paymentResult = await paymentResponse.json();
      if (!paymentResponse.ok || !paymentResult.success) {
        console.error('Payment init failed', paymentResult);
        toast.error(paymentResult.error || 'Could not initialize payment.');
        router.push(`/dashboard/user/errand/${data.id}`);
        return;
      }

      toast.success('Redirecting to Paystack for payment');
      window.location.href = paymentResult.data.authorization_url;
      return;
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create errand');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Create New Errand</h2>

      <form onSubmit={handleSubmit} className="flex flex-col lg:grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        <div className="space-y-5 order-1 w-full">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-white/80">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as ErrandCategory)} className="select w-full">
              <option value="academic">Academic</option>
              <option value="food_delivery">Food delivery</option>
              <option value="campus_errand">Campus errand</option>
              <option value="personal">Personal</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-white/80">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input w-full" placeholder="Short title for your errand" />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-white/80">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="textarea w-full" rows={4} placeholder="Details for the runner" />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-white/80">Pickup Location</span>
            <input value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} className="input w-full" placeholder="e.g., Main Library" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <input value={pickupLat ?? ''} onChange={(e) => setPickupLat(e.target.value ? parseFloat(e.target.value) : null)} placeholder="Pickup lat" className="input w-full min-w-0" />
            <input value={pickupLng ?? ''} onChange={(e) => setPickupLng(e.target.value ? parseFloat(e.target.value) : null)} placeholder="Pickup lng" className="input w-full min-w-0" />
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-white/80">Delivery Location</span>
            <input value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} className="input w-full" placeholder="e.g., Hostel A" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <input value={deliveryLat ?? ''} onChange={(e) => setDeliveryLat(e.target.value ? parseFloat(e.target.value) : null)} placeholder="Delivery lat" className="input w-full min-w-0" />
            <input value={deliveryLng ?? ''} onChange={(e) => setDeliveryLng(e.target.value ? parseFloat(e.target.value) : null)} placeholder="Delivery lng" className="input w-full min-w-0" />
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-white/80">Priority</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value as ErrandPriority)} className="select w-full">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>

          <div className="flex items-center gap-3 pt-2">
            <input id="queue" type="checkbox" checked={hasQueue} onChange={(e) => setHasQueue(e.target.checked)} className="w-5 h-5 rounded border-white/20 bg-dark-base text-primary-500 focus:ring-primary-500/50" />
            <label htmlFor="queue" className="text-sm font-medium text-white/80">Pickup may have queue / complex process</label>
          </div>
        </div>

        <aside className="space-y-4 order-2 lg:order-none w-full">
          <div className="glass-card p-5 rounded-2xl">
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Price Estimate</h3>
            <div>
              <div className="flex justify-between text-white items-end mb-4">
                <span className="opacity-80">Total</span>
                <strong className="text-2xl">{formatCurrency(pricing.totalFee)}</strong>
              </div>
              <div className="space-y-2.5 text-sm text-white/60">
                <div className="flex justify-between"><span>Base fee</span><span>{formatCurrency(pricing.baseFee)}</span></div>
                <div className="flex justify-between"><span>Distance</span><span>{formatCurrency(pricing.distanceSurcharge)}</span></div>
                {pricing.queueComplexityFee > 0 && <div className="flex justify-between"><span>Queue</span><span>{formatCurrency(pricing.queueComplexityFee)}</span></div>}
                {pricing.weatherSurge > 0 && <div className="flex justify-between"><span>Weather</span><span>{formatCurrency(pricing.weatherSurge)}</span></div>}
                <div className="flex justify-between pt-3 mt-3 border-t border-white/10 text-white/80"><span>Platform fee (20%)</span><span>{formatCurrency(pricing.platformFee)}</span></div>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Distance</h4>
              <p className="text-white font-medium">{distanceKm.toFixed(2)} km</p>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-white/10">
              <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Runner gets</h4>
              <p className="text-green-400 font-bold text-lg">{formatCurrency(pricing.runnerAmount)}</p>
            </div>
          </div>
        </aside>

        <div className="order-3 lg:col-start-1 lg:row-start-2 w-full mt-2 lg:mt-0">
          <button disabled={submitting} type="submit" className="btn-primary w-full py-3.5 text-base font-semibold">
            {submitting ? 'Creating…' : 'Create Errand'}
          </button>
        </div>
      </form>
    </div>
  );
}
