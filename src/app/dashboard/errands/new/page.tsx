'use client';

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { calculateDistance, calculatePricing, formatCurrency, estimateQueueComplexity } from '@/utils/pricing';
import type { ErrandCategory, ErrandPriority } from '@/types';
import toast from 'react-hot-toast';
import { MapPicker } from '@/components/MapPicker';
import {
  Utensils,
  Printer,
  Users,
  Package,
  Layers,
  MapPin,
  Clock,
  Zap,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Info,
  CheckCircle2,
  AlertTriangle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

function ErrandStudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = (searchParams.get('category') as ErrandCategory) || 'academic';

  // Form State
  const [step, setStep] = useState<number>(1);
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
  const [allowNegotiation, setAllowNegotiation] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Map Modal
  const [mapModalOpen, setMapModalOpen] = useState<'pickup' | 'delivery' | null>(null);

  // Synchronize category if searchParams change
  useEffect(() => {
    const paramCat = searchParams.get('category') as ErrandCategory;
    if (paramCat) setCategory(paramCat);
  }, [searchParams]);

  // Distance computation
  const distanceKm = useMemo(() => {
    if (pickupLat && pickupLng && deliveryLat && deliveryLng) {
      return calculateDistance(pickupLat, pickupLng, deliveryLat, deliveryLng);
    }
    return 1.2; // default campus distance estimate
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
    { id: 'academic', title: 'Academic & Print', desc: 'Handouts, photocopies, project binding', icon: Printer },
    { id: 'food_delivery', title: 'Food & Cafeteria', desc: 'Campus cafe orders, drinks & snacks', icon: Utensils },
    { id: 'campus_errand', title: 'Queue Standing', desc: 'Clearance queues, bursary, admin desks', icon: Users },
    { id: 'personal', title: 'Hostel & Dorm', desc: 'Supplies, medicine, hostel-to-hostel drop', icon: Package },
    { id: 'custom', title: 'Custom Logistics', desc: 'Any other specialized on-campus errand', icon: Layers },
  ];

  const canProceedStep1 = title.trim().length > 3 && description.trim().length > 5;
  const canProceedStep2 = pickupLocation.trim().length > 2 && deliveryLocation.trim().length > 2;

  const handleSubmit = async () => {
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
        toast.error(data.error || 'Failed to dispatch errand');
        setSubmitting(false);
        return;
      }

      toast.success('Errand dispatched! Escrow secured.');
      router.push(`/dashboard/user/errand/${data.errandId}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to dispatch errand');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 md:py-8 space-y-6 animate-fadeIn">

      {/* ── STUDIO HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Guided Errand Studio
            </span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Dispatch an Errand
          </h1>
        </div>

        {/* Step Stepper Indicator */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          {[
            { num: 1, label: 'What' },
            { num: 2, label: 'Where' },
            { num: 3, label: 'How' },
            { num: 4, label: 'Escrow' },
          ].map((s) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (s.num < step) setStep(s.num);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isDone
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{s.num}.</span>}
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ── LEFT: PROGRESSIVE WIZARD STUDIO ── */}
        <div className="lg:col-span-8 space-y-6">

          {/* STEP 1: WHAT NEEDS TO BE DONE? */}
          {step === 1 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6 animate-fadeIn">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Step 1 of 4</span>
                <h2 className="text-xl font-bold text-slate-900">What do you need done?</h2>
                <p className="text-xs text-slate-500">Choose the best category so the right runner accepts your mission.</p>
              </div>

              {/* Category Selector Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories.map((c) => {
                  const Icon = c.icon;
                  const isSelected = category === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setCategory(c.id as ErrandCategory)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-500'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                          {c.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                          {c.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Task Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pick up fried rice & bottle water from Faculty cafeteria"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Instructions Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Detailed Runner Instructions
                </label>
                <textarea
                  rows={4}
                  placeholder="Specify food spot name, order specifics, phone contact, or room number for delivery..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  size="lg"
                  disabled={!canProceedStep1}
                  onClick={() => setStep(2)}
                  className="font-bold text-sm"
                >
                  Continue to Locations <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: WHERE DOES IT START & END? */}
          {step === 2 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6 animate-fadeIn">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Step 2 of 4</span>
                <h2 className="text-xl font-bold text-slate-900">Where should it happen?</h2>
                <p className="text-xs text-slate-500">Pinpoint pickup and destination so your runner knows the exact route.</p>
              </div>

              {/* Route Waypoints */}
              <div className="space-y-4">
                {/* Pickup */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    1. Pickup Point (Origin)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Science Faculty Cafeteria / Library Quad"
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      className="flex-1 h-11 px-4 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMapModalOpen('pickup')}
                      className="text-xs font-bold gap-1.5 shrink-0"
                    >
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      {pickupLat ? 'Pinned' : 'Map Pin'}
                    </Button>
                  </div>
                  {pickupLat && (
                    <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Exact GPS coordinates locked
                    </p>
                  )}
                </div>

                {/* Delivery */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    2. Delivery Point (Destination)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Hall 4 Dorm, Room 212 / Main Gate"
                      value={deliveryLocation}
                      onChange={(e) => setDeliveryLocation(e.target.value)}
                      className="flex-1 h-11 px-4 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMapModalOpen('delivery')}
                      className="text-xs font-bold gap-1.5 shrink-0"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      {deliveryLat ? 'Pinned' : 'Map Pin'}
                    </Button>
                  </div>
                  {deliveryLat && (
                    <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Exact GPS coordinates locked
                    </p>
                  )}
                </div>

                {/* Estimated Route Strip */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Estimated Distance on Campus:</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {distanceKm.toFixed(1)} km (~{(distanceKm * 12).toFixed(0)} min walking)
                  </span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(1)} className="font-semibold text-xs">
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                </Button>
                <Button
                  size="lg"
                  disabled={!canProceedStep2}
                  onClick={() => setStep(3)}
                  className="font-bold text-sm"
                >
                  Continue to Logistics <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: LOGISTICS & URGENCY */}
          {step === 3 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6 animate-fadeIn">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Step 3 of 4</span>
                <h2 className="text-xl font-bold text-slate-900">Logistics & Urgency</h2>
                <p className="text-xs text-slate-500">Configure special handling so runners are fairly compensated.</p>
              </div>

              {/* Priority Dial */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Priority Level</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'normal', label: 'Standard', desc: 'Typical turnaround', multiplier: '1.0x' },
                    { id: 'high', label: 'High Priority', desc: 'Preferred queue', multiplier: '1.25x' },
                    { id: 'urgent', label: 'Urgent Dispatch', desc: 'Immediate runner alert', multiplier: '1.5x' },
                  ].map((p) => {
                    const isSelected = priority === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setPriority(p.id as ErrandPriority)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all text-center space-y-1 ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-500'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <p className="text-xs font-bold text-slate-900">{p.label}</p>
                        <p className="text-[10px] text-slate-400">{p.desc}</p>
                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-mono font-bold text-slate-600">
                          {p.multiplier}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                {/* Queue standing */}
                <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={hasQueue}
                    onChange={(e) => setHasQueue(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Queue Standing Required</span>
                    <span className="text-[11px] text-slate-500 leading-snug">
                      Check this if the runner will have to wait in line (e.g. food counter, bursary). Adds compensation for waiting time.
                    </span>
                  </div>
                </label>

                {/* Bulky cargo */}
                <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={isBulkyItem}
                    onChange={(e) => setIsBulkyItem(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Heavy or Bulky Package</span>
                    <span className="text-[11px] text-slate-500 leading-snug">
                      Items over 5kg or large parcels requiring extra transport care.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(2)} className="font-semibold text-xs">
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                </Button>
                <Button
                  size="lg"
                  onClick={() => setStep(4)}
                  className="font-bold text-sm"
                >
                  Review Escrow & Dispatch <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: ESCROW COMMITMENT & DISPATCH */}
          {step === 4 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6 animate-fadeIn">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Final Step 4 of 4</span>
                <h2 className="text-xl font-bold text-slate-900">Authorize Escrow Commitment</h2>
                <p className="text-xs text-slate-500">Review your task breakdown before dispatching to the campus network.</p>
              </div>

              {/* Summary Card */}
              <div className="rounded-2xl bg-slate-50 p-5 border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Task:</span>
                  <span className="font-bold text-slate-900 text-sm">{title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Route:</span>
                  <span className="font-semibold text-slate-800 text-right">
                    {pickupLocation} → {deliveryLocation}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Priority:</span>
                  <Badge variant="default" className="uppercase text-[9px] font-bold">
                    {priority}
                  </Badge>
                </div>
              </div>

              {/* Escrow Guarantee Notice */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 leading-relaxed">
                  <strong>Protected Escrow:</strong> Your payment of <strong>{formatCurrency(pricing.totalFee)}</strong> is held securely by ERRANDRUN. The runner receives their <strong>{formatCurrency(pricing.runnerAmount)}</strong> payout only after you verify the physical delivery with your secret 4-digit PIN.
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between gap-4">
                <Button variant="ghost" onClick={() => setStep(3)} className="font-semibold text-xs">
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                </Button>
                <Button
                  size="lg"
                  variant="primary"
                  isLoading={submitting}
                  onClick={handleSubmit}
                  className="font-bold text-sm shadow-md flex-1 sm:flex-initial"
                >
                  Authorize {formatCurrency(pricing.totalFee)} & Dispatch
                </Button>
              </div>
            </div>
          )}

        </div>

        {/* ── RIGHT: LIVE ESCROW TELEMETRY HUD ── */}
        <div className="lg:col-span-4 sticky top-24 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-blue-600" />
                Live Fee Breakdown
              </span>
              <Badge variant="info" className="text-[10px] font-bold">
                Dynamic
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Base Campus Fee:</span>
                <span className="font-mono text-slate-800">{formatCurrency(pricing.baseFee)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Distance Surcharge ({distanceKm.toFixed(1)} km):</span>
                <span className="font-mono text-slate-800">{formatCurrency(pricing.distanceSurcharge)}</span>
              </div>
              {hasQueue && (
                <div className="flex justify-between text-amber-600 font-semibold">
                  <span>Queue Wait Compensation:</span>
                  <span className="font-mono">{formatCurrency(pricing.queueComplexityFee)}</span>
                </div>
              )}
              {isBulkyItem && (
                <div className="flex justify-between text-slate-600 font-semibold">
                  <span>Bulky Package Surcharge:</span>
                  <span className="font-mono">₦200</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400 text-[11px] pt-1">
                <span>Platform Assurance (20%):</span>
                <span className="font-mono">{formatCurrency(pricing.platformFee)}</span>
              </div>
            </div>

            {/* Total Fee Highlight */}
            <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Total Secured
                </span>
                <span className="text-xs text-emerald-600 font-semibold">Runner receives 80%</span>
              </div>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {formatCurrency(pricing.totalFee)}
              </span>
            </div>
          </div>

          {/* Quick Help Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-500 space-y-1.5">
            <p className="font-bold text-slate-700 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              Need to cancel later?
            </p>
            <p className="text-[11px] leading-relaxed">
              If no runner accepts your task within 30 minutes, or you cancel before pickup, your escrow is immediately refunded to your wallet.
            </p>
          </div>
        </div>

      </div>

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
          onSelect={(lat: number, lng: number, address: string) => {
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
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Errand Studio...</div>}>
      <ErrandStudioContent />
    </Suspense>
  );
}
