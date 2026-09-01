'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { calculateDistance, calculatePricing, formatCurrency, estimateQueueComplexity } from '@/utils/pricing';
import type { ErrandCategory, ErrandPriority } from '@/types';
import toast from 'react-hot-toast';

import { MapPicker } from '@/components/MapPicker';
import { MapPin } from 'lucide-react';

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
    return 0; // default to 0 if not set, distance calculation has Math.max(1, distance) inside
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
        router.push(/dashboard/user/errand/ + data.errandId);
        return;
    } catch (err: any) {
      console.warn(err);
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

          {/* Map Modals */}
          {mapModalOpen === 'pickup' && (
            <MapPicker 
              title="Select Pickup Location"
              initialLat={pickupLat || undefined}
              initialLng={pickupLng || undefined}
              onConfirm={(lat: number, lng: number, address: string) => {
                setPickupLat(lat);
                setPickupLng(lng);
                setPickupLocation(address);
                setMapModalOpen(null);
              }}
              onCancel={() => setMapModalOpen(null)}
            />
          )}

          {mapModalOpen === 'delivery' && (
            <MapPicker 
              title="Select Delivery Location"
              initialLat={deliveryLat || undefined}
              initialLng={deliveryLng || undefined}
              onConfirm={(lat: number, lng: number, address: string) => {
                setDeliveryLat(lat);
                setDeliveryLng(lng);
                setDeliveryLocation(address);
                setMapModalOpen(null);
              }}
              onCancel={() => setMapModalOpen(null)}
            />
          )}

          <div className="space-y-1.5">
            <span className="text-sm font-medium text-white/80">Pickup Location</span>
            <div className="flex gap-2">
              <input value={pickupLocation} readOnly className="input w-full bg-dark-secondary/50 text-white/60 cursor-not-allowed" placeholder="Select on map..." />
              <button type="button" onClick={() => setMapModalOpen('pickup')} className="btn-secondary whitespace-nowrap">
                <MapPin className="w-4 h-4 mr-2 inline" /> Map
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium text-white/80">Delivery Location</span>
            <div className="flex gap-2">
              <input value={deliveryLocation} readOnly className="input w-full bg-dark-secondary/50 text-white/60 cursor-not-allowed" placeholder="Select on map..." />
              <button type="button" onClick={() => setMapModalOpen('delivery')} className="btn-secondary whitespace-nowrap">
                <MapPin className="w-4 h-4 mr-2 inline" /> Map
              </button>
            </div>
          </div>

          <label className="flex items-center gap-3 p-4 bg-brand-blue/5 border border-brand-blue/20 rounded-xl cursor-pointer">
            <input type="checkbox" checked={allowNegotiation} onChange={(e) => setAllowNegotiation(e.target.checked)} className="w-5 h-5 rounded border-white/20 bg-dark-secondary text-brand-blue focus:ring-brand-blue focus:ring-offset-dark-base" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white">Allow Runners to Negotiate</span>
              <span className="text-xs text-white/60">Runners can counter-offer if they think the standard fee is too low for this distance.</span>
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-white/80">Priority</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value as ErrandPriority)} className="select w-full">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>

          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center gap-3">
              <input id="queue" type="checkbox" checked={hasQueue} onChange={(e) => setHasQueue(e.target.checked)} className="w-5 h-5 rounded border-white/20 bg-dark-base text-primary-500 focus:ring-primary-500/50" />
              <label htmlFor="queue" className="text-sm font-medium text-white/80">Pickup may have queue / complex process</label>
            </div>
            <div className="flex items-center gap-3">
              <input id="bulky" type="checkbox" checked={isBulkyItem} onChange={(e) => setIsBulkyItem(e.target.checked)} className="w-5 h-5 rounded border-white/20 bg-dark-base text-primary-500 focus:ring-primary-500/50" />
              <label htmlFor="bulky" className="text-sm font-medium text-white/80">Item is heavy or bulky (e.g. mattress, gas cylinder)</label>
            </div>
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
                <div className="flex justify-between">
                  <span>Distance Fee ({distanceKm ? Math.max(1, distanceKm).toFixed(1) : '1.0'} km)</span>
                  <span>{formatCurrency(pricing.baseFee)}</span>
                </div>
                {pricing.queueComplexityFee > 0 && <div className="flex justify-between"><span>Queue</span><span>{formatCurrency(pricing.queueComplexityFee)}</span></div>}
                {pricing.bulkyItemSurcharge > 0 && <div className="flex justify-between text-brand-yellow"><span>Bulky Item</span><span>{formatCurrency(pricing.bulkyItemSurcharge)}</span></div>}
                {pricing.weatherSurge > 0 && <div className="flex justify-between"><span>Weather</span><span>{formatCurrency(pricing.weatherSurge)}</span></div>}
                {pricing.rushHourSurge > 0 && <div className="flex justify-between text-rose-400"><span>Campus Rush Hour Surge (1.5x)</span><span>{formatCurrency(pricing.rushHourSurge)}</span></div>}
                {pricing.urgencyMultiplier > 1 && <div className="flex justify-between text-brand-blue"><span>High Priority</span><span>{(pricing.urgencyMultiplier - 1) * 100}%</span></div>}
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

