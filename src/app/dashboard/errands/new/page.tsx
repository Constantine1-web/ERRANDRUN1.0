'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { calculatePricing, calculateDistance, estimateQueueComplexity, formatCurrency } from '@/utils/pricing';
import type { ErrandCategory, ErrandPriority } from '@/types';
import toast from 'react-hot-toast';
import {
  MapPin,
  Utensils,
  Printer,
  Clock,
  Package,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Navigation,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MapPicker } from '@/components/MapPicker';

function ErrandBookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = (searchParams.get('category') as ErrandCategory) || 'food_delivery';

  // Form State
  const [category, setCategory] = useState<ErrandCategory>(initialCategory);
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
  const [isBulkyItem, setIsBulkyItem] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Map Modal
  const [mapModalOpen, setMapModalOpen] = useState<'pickup' | 'delivery' | null>(null);

  useEffect(() => {
    const paramCat = searchParams.get('category') as ErrandCategory;
    if (paramCat) setCategory(paramCat);
  }, [searchParams]);

  // Distance computation
  const distanceKm = useMemo(() => {
    if (pickupLat && pickupLng && deliveryLat && deliveryLng) {
      return calculateDistance(pickupLat, pickupLng, deliveryLat, deliveryLng);
    }
    return 1.2;
  }, [pickupLat, pickupLng, deliveryLat, deliveryLng]);

  // Live Pricing
  const pricing = useMemo(() => {
    return calculatePricing(category, priority, distanceKm, hasQueue, false, isBulkyItem);
  }, [category, priority, distanceKm, hasQueue, isBulkyItem]);

  // Auto-detect queue complexity based on location text
  useEffect(() => {
    if (pickupLocation) {
      setHasQueue(estimateQueueComplexity(pickupLocation));
    }
  }, [pickupLocation]);

  const categories = [
    { id: 'food_delivery', title: 'Food & Meals', icon: Utensils },
    { id: 'academic', title: 'Print & Handouts', icon: Printer },
    { id: 'campus_errand', title: 'Queue Standing', icon: Clock },
    { id: 'personal', title: 'Package / Dorm', icon: Package },
  ];

  const quickLandmarks = [
    { label: '🏛️ Main Gate', name: 'Main Campus Gate' },
    { label: '📚 Central Library', name: 'University Central Library' },
    { label: '⚙️ Engineering Complex', name: 'Faculty of Engineering' },
    { label: '🍲 Cafeteria', name: 'Campus Central Cafeteria' },
    { label: '🛏️ Hall 6 Hostels', name: 'Hall 6 Hostel' },
    { label: '📍 Town Gate (Ikpa)', name: 'Town Campus Gate' },
  ];

  const canSubmit =
    title.trim().length >= 3 &&
    pickupLocation.trim().length >= 2 &&
    deliveryLocation.trim().length >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.error('Please fill in pickup, destination, and what to deliver');
      return;
    }

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        toast.error('Please sign in to dispatch an errand');
        router.push('/login');
        return;
      }

      const payload = {
        requester_id: user.id,
        category,
        title: title.trim(),
        description: description.trim() || 'No additional notes provided.',
        pickup_location: pickupLocation.trim(),
        delivery_location: deliveryLocation.trim(),
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
        min_runner_rating: priority === 'urgent' ? 4.5 : 0,
      };

      const res = await fetch('/api/errands/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Failed to dispatch errand');
        setSubmitting(false);
        return;
      }

      toast.success('Runner requested! Escrow secured.');
      router.push(`/dashboard/user/errand/${data.errandId}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to dispatch errand');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-6 sm:py-8 space-y-6 animate-fadeIn">
      
      {/* ── HEADER ── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Request a Campus Runner
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Upfront pricing • Escrow protected • Delivered in minutes
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── LEFT: BOOKING FORM (Uber/Bolt Style) ── */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Card 1: Route (From ➔ To) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-blue-600" />
              1. Delivery Route
            </h2>

            {/* Pickup Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Pickup Location (Where from?)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. Science Faculty Cafeteria"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMapModalOpen('pickup')}
                  className="text-xs font-bold shrink-0 border-slate-300 dark:border-slate-700 h-11 gap-1"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  {pickupLat ? 'Pinned' : 'Map'}
                </Button>
              </div>
            </div>

            {/* Destination Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Dropoff Location (Where to deliver?)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="w-3 h-3 rounded-full bg-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. Hall 6 Female Hostel, Room 204"
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMapModalOpen('delivery')}
                  className="text-xs font-bold shrink-0 border-slate-300 dark:border-slate-700 h-11 gap-1"
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  {deliveryLat ? 'Pinned' : 'Map'}
                </Button>
              </div>
            </div>

            {/* Fast Campus Snaps */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                Quick Campus Landmarks:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickLandmarks.map((lm) => (
                  <button
                    key={lm.name}
                    type="button"
                    onClick={() => {
                      if (!pickupLocation) setPickupLocation(lm.name);
                      else setDeliveryLocation(lm.name);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors"
                  >
                    {lm.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: What are you requesting? */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-blue-600" />
              2. Items & Details
            </h2>

            {/* Category Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {categories.map((c) => {
                const Icon = c.icon;
                const active = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id as ErrandCategory)}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                      active
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold shadow-sm ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs leading-tight">{c.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Title Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                What should the runner do?
              </label>
              <input
                type="text"
                placeholder="e.g. Pick up 2 plates of Jollof rice and cold drink"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Instructions Textarea */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Instructions & Room Details
              </label>
              <textarea
                rows={2}
                placeholder="Specific vendors, phone contact, or room number for delivery..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Priority & Toggles */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setPriority(priority === 'normal' ? 'urgent' : 'normal')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  priority === 'urgent'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                {priority === 'urgent' ? '⚡ Express Delivery (+20%)' : 'Standard Speed'}
              </button>

              <button
                type="button"
                onClick={() => setIsBulkyItem(!isBulkyItem)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  isBulkyItem
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                Heavy Package (+₦300)
              </button>
            </div>
          </div>

        </div>

        {/* ── RIGHT: UPFRONT FARE CARD (Uber Style) ── */}
        <div className="lg:col-span-5 sticky top-20 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Upfront Total Fare
              </span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-full">
                ~{distanceKm.toFixed(1)} km route
              </span>
            </div>

            <div className="text-center py-2 space-y-1">
              <span className="text-3xl sm:text-4xl font-black font-mono text-slate-900 dark:text-white">
                {formatCurrency(pricing.totalFee)}
              </span>
              <p className="text-xs text-emerald-600 font-semibold flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Runner receives {formatCurrency(pricing.runnerAmount)} upon delivery
              </p>
            </div>

            {/* Breakdown */}
            <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800 pt-2 text-slate-500 dark:text-slate-400">
              <div className="flex justify-between pt-2">
                <span>Base Campus Fee</span>
                <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(pricing.baseFee)}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span>Distance Surcharge</span>
                <span className="font-mono text-slate-900 dark:text-white">+{formatCurrency(pricing.distanceSurcharge)}</span>
              </div>
              {pricing.queueComplexityFee > 0 && (
                <div className="flex justify-between pt-2 text-amber-600">
                  <span>Queue Wait Fee</span>
                  <span className="font-mono">+{formatCurrency(pricing.queueComplexityFee)}</span>
                </div>
              )}
            </div>

            {/* Escrow Guarantee Pill */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Payment held in escrow until you verify your 4-digit PIN.</span>
            </div>

            {/* Big Primary Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!canSubmit}
              isLoading={submitting}
              className="w-full h-14 text-base font-black shadow-lg"
            >
              Request Campus Runner <ArrowRight className="w-5 h-5 ml-1.5" />
            </Button>
          </div>
        </div>

      </form>

      {/* ── MAP PICKER MODAL ── */}
      {mapModalOpen && (
        <MapPicker
          title={`Pinpoint ${mapModalOpen === 'pickup' ? 'Pickup Location' : 'Delivery Destination'}`}
          initialLat={mapModalOpen === 'pickup' ? pickupLat : deliveryLat}
          initialLng={mapModalOpen === 'pickup' ? pickupLng : deliveryLng}
          onCancel={() => setMapModalOpen(null)}
          onConfirm={(lat: number, lng: number, address: string) => {
            if (mapModalOpen === 'pickup') {
              setPickupLat(lat);
              setPickupLng(lng);
              setPickupLocation(address);
            } else {
              setDeliveryLat(lat);
              setDeliveryLng(lng);
              setDeliveryLocation(address);
            }
            setMapModalOpen(null);
            toast.success('Campus location locked!');
          }}
        />
      )}

    </div>
  );
}

export default function NewErrandPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Loading booking console…</div>}>
      <ErrandBookingContent />
    </Suspense>
  );
}
