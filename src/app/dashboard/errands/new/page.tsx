'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { calculateDistance, calculatePricing, formatCurrency, estimateQueueComplexity } from '@/utils/pricing';
import type { ErrandCategory, ErrandPriority } from '@/types';
import toast from 'react-hot-toast';

import { MapPicker } from '@/components/MapPicker';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

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
      router.push('/dashboard/user/errand/' + data.errandId);
      return;
    } catch (err: any) {
      console.warn(err);
      toast.error(err.message || 'Failed to create errand');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Create New Errand</h2>
        <p className="text-white/60 text-sm mt-1">Fill in the details below to request a runner.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6 items-start relative">
        <div className="flex-1 space-y-6 w-full">
          {/* WHAT DO YOU NEED? */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">WHAT DO YOU NEED?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/80">Category</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value as ErrandCategory)} 
                  className="flex h-12 w-full rounded-xl border border-white/10 bg-dark-base px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                >
                  <option value="academic">Academic</option>
                  <option value="food_delivery">Food delivery</option>
                  <option value="campus_errand">Campus errand</option>
                  <option value="personal">Personal</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/80">Title</label>
                <Input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Short title for your errand" 
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/80">Description</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="flex w-full rounded-xl border border-white/10 bg-dark-base px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all" 
                  rows={4} 
                  placeholder="Details for the runner" 
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* WHERE SHOULD IT HAPPEN? */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">WHERE SHOULD IT HAPPEN?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/80">Pickup Location</label>
                <div className="flex gap-2">
                  <Input 
                    value={pickupLocation} 
                    readOnly 
                    className="bg-dark-secondary/50 text-white/60 cursor-not-allowed" 
                    placeholder="Select on map..." 
                    required
                  />
                  <Button type="button" variant="secondary" onClick={() => setMapModalOpen('pickup')} className="shrink-0">
                    <MapPin className="w-4 h-4 mr-2" /> Map
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/80">Delivery Location</label>
                <div className="flex gap-2">
                  <Input 
                    value={deliveryLocation} 
                    readOnly 
                    className="bg-dark-secondary/50 text-white/60 cursor-not-allowed" 
                    placeholder="Select on map..." 
                    required
                  />
                  <Button type="button" variant="secondary" onClick={() => setMapModalOpen('delivery')} className="shrink-0">
                    <MapPin className="w-4 h-4 mr-2" /> Map
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* HOW SHOULD IT BE HANDLED? */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">HOW SHOULD IT BE HANDLED?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/80">Priority</label>
                <select 
                  value={priority} 
                  onChange={(e) => setPriority(e.target.value as ErrandPriority)} 
                  className="flex h-12 w-full rounded-xl border border-white/10 bg-dark-base px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={allowNegotiation} onChange={(e) => setAllowNegotiation(e.target.checked)} className="w-5 h-5 rounded border-white/20 bg-dark-base text-primary-500 focus:ring-primary-500/50" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">Allow Runners to Negotiate</span>
                    <span className="text-xs text-white/60">Runners can counter-offer if standard fee is too low.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={hasQueue} onChange={(e) => setHasQueue(e.target.checked)} className="w-5 h-5 rounded border-white/20 bg-dark-base text-primary-500 focus:ring-primary-500/50" />
                  <span className="text-sm font-medium text-white/80">Pickup may have queue / complex process</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={isBulkyItem} onChange={(e) => setIsBulkyItem(e.target.checked)} className="w-5 h-5 rounded border-white/20 bg-dark-base text-primary-500 focus:ring-primary-500/50" />
                  <span className="text-sm font-medium text-white/80">Item is heavy or bulky (e.g. mattress)</span>
                </label>
              </div>
            </CardContent>
          </Card>
          
          <div className="lg:hidden w-full">
            <Button disabled={submitting} isLoading={submitting} type="submit" size="lg" className="w-full">
              {submitting ? 'Creating...' : 'Create Errand'}
            </Button>
          </div>
        </div>

        {/* Live Price Summary */}
        <div className="w-full lg:w-[380px] shrink-0 lg:sticky lg:top-6 space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm uppercase tracking-wider text-white/80">Live Price Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end mb-6">
                <span className="text-white/80 font-medium">Total</span>
                <strong className="text-3xl text-white">{formatCurrency(pricing.totalFee)}</strong>
              </div>
              <div className="space-y-3 text-sm text-white/60">
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
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-semibold text-white/80 uppercase tracking-wider">Distance</span>
                <span className="text-white font-medium">{distanceKm.toFixed(2)} km</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <span className="text-sm font-semibold text-white/80 uppercase tracking-wider">Runner gets</span>
                <span className="text-green-400 font-bold text-lg">{formatCurrency(pricing.runnerAmount)}</span>
              </div>
            </CardContent>
          </Card>
          
          <div className="hidden lg:block w-full">
            <Button disabled={submitting} isLoading={submitting} type="submit" size="lg" className="w-full">
              {submitting ? 'Creating...' : 'Create Errand'}
            </Button>
          </div>
        </div>

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
      </form>
    </div>
  );
}
