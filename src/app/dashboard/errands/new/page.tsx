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

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-6">
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-slate-900">Request an Errand</h2>
        <p className="text-slate-500 text-sm mt-1">Fill in the details below to dispatch a verified campus runner.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 space-y-6 w-full">
          {/* WHAT DO YOU NEED? */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base text-slate-900 font-bold uppercase tracking-wide">
                1. What do you need?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Category</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value as ErrandCategory)} 
                  className="flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="academic">Academic & Printing</option>
                  <option value="food_delivery">Food & Cafeteria Delivery</option>
                  <option value="campus_errand">Queue Standing & General Errand</option>
                  <option value="personal">Personal / Dorm Item</option>
                  <option value="custom">Custom Logistics</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Title</label>
                <Input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g. Buy fried rice from Faculty Cafe" 
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Description</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="flex w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                  rows={3} 
                  placeholder="Provide precise instructions for the runner..." 
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* WHERE SHOULD IT HAPPEN? */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base text-slate-900 font-bold uppercase tracking-wide">
                2. Where should it happen?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Pickup Location</label>
                <div className="flex gap-2">
                  <Input 
                    value={pickupLocation} 
                    readOnly 
                    className="bg-slate-50 text-slate-700 cursor-not-allowed" 
                    placeholder="Click Map to pin location..." 
                    required
                  />
                  <Button type="button" variant="secondary" onClick={() => setMapModalOpen('pickup')} className="shrink-0 gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-600" /> Pin on Map
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Delivery Location</label>
                <div className="flex gap-2">
                  <Input 
                    value={deliveryLocation} 
                    readOnly 
                    className="bg-slate-50 text-slate-700 cursor-not-allowed" 
                    placeholder="Click Map to pin location..." 
                    required
                  />
                  <Button type="button" variant="secondary" onClick={() => setMapModalOpen('delivery')} className="shrink-0 gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-600" /> Pin on Map
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* HOW SHOULD IT BE HANDLED? */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base text-slate-900 font-bold uppercase tracking-wide">
                3. How should it be handled?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Priority Level</label>
                <select 
                  value={priority} 
                  onChange={(e) => setPriority(e.target.value as ErrandPriority)} 
                  className="flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="low">Low (Standard pace)</option>
                  <option value="normal">Normal</option>
                  <option value="high">High priority</option>
                  <option value="urgent">Urgent (Express pickup)</option>
                </select>
              </div>

              <div className="space-y-2.5 pt-2">
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <input type="checkbox" checked={allowNegotiation} onChange={(e) => setAllowNegotiation(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-800">Allow Runner Negotiation</span>
                    <span className="text-xs text-slate-400">Runners can counter-offer if task requires extra time.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <input type="checkbox" checked={hasQueue} onChange={(e) => setHasQueue(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-slate-800">Pickup has active queue (+₦500 complexity fee)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <input type="checkbox" checked={isBulkyItem} onChange={(e) => setIsBulkyItem(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-slate-800">Item is bulky / heavy load (+₦500)</span>
                </label>
              </div>
            </CardContent>
          </Card>
          
          <div className="lg:hidden w-full">
            <Button disabled={submitting} isLoading={submitting} type="submit" size="lg" className="w-full font-bold">
              Create Errand & Secure Escrow
            </Button>
          </div>
        </div>

        {/* Live Price Summary Sidebar */}
        <div className="w-full lg:w-[340px] shrink-0 lg:sticky lg:top-6 space-y-4">
          <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
            <CardHeader className="pb-3 border-b border-blue-100">
              <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-bold">Live Price Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex justify-between items-end mb-4">
                <span className="text-slate-600 text-sm font-medium">Total Escrow</span>
                <strong className="text-3xl text-slate-900 font-black font-mono">{formatCurrency(pricing.totalFee)}</strong>
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Distance ({distanceKm ? Math.max(1, distanceKm).toFixed(1) : '1.0'} km)</span>
                  <span className="font-medium text-slate-800">{formatCurrency(pricing.baseFee)}</span>
                </div>
                {pricing.queueComplexityFee > 0 && <div className="flex justify-between text-amber-700"><span>Queue Surcharge</span><span>+{formatCurrency(pricing.queueComplexityFee)}</span></div>}
                {pricing.bulkyItemSurcharge > 0 && <div className="flex justify-between text-amber-700"><span>Bulky Item</span><span>+{formatCurrency(pricing.bulkyItemSurcharge)}</span></div>}
                {pricing.weatherSurge > 0 && <div className="flex justify-between"><span>Weather</span><span>+{formatCurrency(pricing.weatherSurge)}</span></div>}
                {pricing.urgencyMultiplier > 1 && <div className="flex justify-between text-blue-600 font-semibold"><span>Priority Multiplier</span><span>{(pricing.urgencyMultiplier - 1) * 100}%</span></div>}
                <div className="flex justify-between pt-2 mt-2 border-t border-blue-100 text-slate-400"><span>Platform fee (20%)</span><span>{formatCurrency(pricing.platformFee)}</span></div>
                <div className="flex justify-between pt-2 text-green-700 font-bold text-sm"><span>Runner gets</span><span className="font-mono">{formatCurrency(pricing.runnerAmount)}</span></div>
              </div>
            </CardContent>
          </Card>
          
          <div className="hidden lg:block w-full">
            <Button disabled={submitting} isLoading={submitting} type="submit" size="lg" className="w-full font-bold">
              Create Errand & Secure Escrow
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
