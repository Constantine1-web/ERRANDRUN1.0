'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { calculateDistance, calculatePricing, formatCurrency, estimateQueueComplexity } from '@/utils/pricing';
import type { ErrandCategory, ErrandPriority } from '@/types';
import toast from 'react-hot-toast';
import { MapPicker } from '@/components/MapPicker';

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
  const [isBulkyItem, setIsBulkyItem] = useState(false);
  
  const [mapModalOpen, setMapModalOpen] = useState<'pickup' | 'delivery' | null>(null);
  const [allowNegotiation, setAllowNegotiation] = useState(true);

  const distanceKm = useMemo(() => {
    if (pickupLat && pickupLng && deliveryLat && deliveryLng) {
      return calculateDistance(pickupLat, pickupLng, deliveryLat, deliveryLng);
    }
    return 0;
  }, [pickupLat, pickupLng, deliveryLat, deliveryLng]);

  const pricing = useMemo(() => {
    return calculatePricing(category, priority, distanceKm, hasQueue, false, isBulkyItem);
  }, [category, priority, distanceKm, hasQueue, isBulkyItem]);

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

      const payload = {
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
        min_runner_rating: (priority === 'high' || priority === 'urgent') ? 4.5 : 0,
      };

      const res = await fetch('/api/errands/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Failed to create errand');
        setSubmitting(false);
        return;
      }

      toast.success('Errand created and fee secured in escrow!');
      router.push('/dashboard/user/errand/' + data.errandId);
      return;
    } catch (err: any) {
      console.warn(err);
      toast.error(err.message || 'Failed to create errand');
    } finally {
      setSubmitting(false);
    }
  };

  // ── STRIPPED: Awaiting redesign ──
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>Request an Errand</h1>
      <p style={{ color: '#666', marginBottom: '16px' }}>Total: {formatCurrency(pricing.totalFee)} (Runner gets {formatCurrency(pricing.runnerAmount)})</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <select value={category} onChange={(e) => setCategory(e.target.value as ErrandCategory)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}>
          <option value="academic">Academic & Printing</option>
          <option value="food_delivery">Food & Cafeteria Delivery</option>
          <option value="campus_errand">Queue Standing & General</option>
          <option value="personal">Personal / Dorm Item</option>
          <option value="custom">Custom Logistics</option>
        </select>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={3} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
        <input placeholder="Pickup Location" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
        <button type="button" onClick={() => setMapModalOpen('pickup')} style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }}>📍 Pick on Map</button>
        <input placeholder="Delivery Location" value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }} />
        <button type="button" onClick={() => setMapModalOpen('delivery')} style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }}>📍 Pick on Map</button>
        <select value={priority} onChange={(e) => setPriority(e.target.value as ErrandPriority)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <button type="submit" disabled={submitting} style={{ padding: '10px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          {submitting ? 'Submitting...' : 'Create Errand'}
        </button>
      </form>

      {mapModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', width: '90%', maxWidth: '600px', maxHeight: '80vh' }}>
            <MapPicker
              onSelect={(lat: number, lng: number, address: string) => {
                if (mapModalOpen === 'pickup') {
                  setPickupLat(lat); setPickupLng(lng); setPickupLocation(address);
                } else {
                  setDeliveryLat(lat); setDeliveryLng(lng); setDeliveryLocation(address);
                }
                setMapModalOpen(null);
              }}
            />
            <button onClick={() => setMapModalOpen(null)} style={{ marginTop: '8px', padding: '8px 16px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
