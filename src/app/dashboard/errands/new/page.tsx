'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { authFetch } from '@/lib/apiClient';
import { calculatePricing, calculateDistance, estimateQueueComplexity, formatCurrency } from '@/utils/pricing';
import type { ErrandCategory, ErrandPriority } from '@/types';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Utensils, Printer, Clock, Package, ArrowRight, ShieldCheck, Zap,
  CheckCircle2, Navigation, MoreHorizontal, ArrowLeft, Building2, Map, Check
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MapPicker } from '@/components/MapPicker';

function ErrandBookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = (searchParams.get('category') as ErrandCategory) || 'food_delivery';

  // Wizard State
  const [step, setStep] = useState(1);

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

  const distanceKm = useMemo(() => {
    if (pickupLat && pickupLng && deliveryLat && deliveryLng) {
      return calculateDistance(pickupLat, pickupLng, deliveryLat, deliveryLng);
    }
    return 1.0;
  }, [pickupLat, pickupLng, deliveryLat, deliveryLng]);

  const pricing = useMemo(() => {
    return calculatePricing(category, priority, distanceKm, hasQueue, false, isBulkyItem);
  }, [category, priority, distanceKm, hasQueue, isBulkyItem]);

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
    { id: 'custom', title: 'Others', icon: MoreHorizontal },
  ];

  const quickLandmarks = [
    { label: '🏛️ Main Gate', name: 'Main Campus Gate', lat: 5.0385, lng: 7.9892 },
    { label: '📚 Library', name: 'University Central Library', lat: 5.0392, lng: 7.9880 },
    { label: '⚙️ Engineering', name: 'Faculty of Engineering', lat: 5.0410, lng: 7.9865 },
    { label: '🍲 Cafeteria', name: 'Central Cafeteria', lat: 5.0405, lng: 7.9878 },
    { label: '🛏️ Hall 6', name: 'Hall 6 Hostels', lat: 5.0438, lng: 7.9870 },
  ];

  const handleNext = () => {
    if (step === 1 && title.trim().length < 3) return toast.error("Please enter what you need done.");
    if (step === 2 && pickupLocation.trim().length < 2) return toast.error("Please enter a pickup location.");
    if (step === 3 && deliveryLocation.trim().length < 2) return toast.error("Please enter a delivery location.");
    setStep((s) => Math.min(s + 1, 5));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        toast.error('Please sign in to dispatch an errand');
        router.push('/login');
        return;
      }

      const payload = {
        requester_id: userData.user.id,
        category,
        title: title.trim(),
        description: description.trim() || 'No additional notes provided.',
        pickup_location: pickupLocation.trim(),
        delivery_location: deliveryLocation.trim(),
        pickup_coordinates: pickupLat && pickupLng ? { lat: pickupLat, lng: pickupLng } : null,
        delivery_coordinates: deliveryLat && deliveryLng ? { lat: deliveryLat, lng: deliveryLng } : null,
        priority,
        has_queue: hasQueue,
        is_bulky: isBulkyItem,
      };

      const res = await authFetch('/api/errands/create', { method: 'POST', body: JSON.stringify(payload) });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Failed to dispatch errand');
        setSubmitting(false);
        return;
      }

      toast.success('Runner requested! Escrow secured.');
      router.push(`/dashboard/user/errand/${data.errandId}`);
    } catch (err: any) {
      console.warn(err);
      toast.error(err?.message || 'Failed to dispatch errand');
      setSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex justify-between items-end mb-2">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Step {step} of 5</h2>
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md">
          {step === 1 && "The Basics"}
          {step === 2 && "Pickup"}
          {step === 3 && "Dropoff"}
          {step === 4 && "Preferences"}
          {step === 5 && "Review & Pay"}
        </span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((idx) => (
          <div key={idx} className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <motion.div
              className="h-full bg-blue-600 dark:bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: step >= idx ? '100%' : '0%' }}
              transition={{ duration: 0.3 }}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-12 px-4">
      {renderStepIndicator()}
      
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden min-h-[420px] flex flex-col relative">
        <div className="p-6 sm:p-8 flex-1">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: BASICS */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-1">What do you need?</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Select a category and briefly describe the task.</p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categories.map((c) => {
                    const Icon = c.icon;
                    const isSelected = category === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setCategory(c.id as ErrandCategory)}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-600 text-blue-700 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-400 shadow-sm ring-1 ring-blue-600 dark:ring-blue-500' 
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mb-3 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                        <span className="text-xs font-bold block">{c.title}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 block">Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Pick up 2 plates of Jollof rice"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 block">Instructions (Optional)</label>
                    <textarea
                      rows={2}
                      placeholder="Specific vendors, phone numbers, or room details..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: PICKUP */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Where from?</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Where should the runner go to start the errand?</p>
                </div>
                
                <div className="space-y-3">
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Enter pickup location (e.g. Faculty of Science)"
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                      autoFocus
                    />
                  </div>
                  
                  <button onClick={() => setMapModalOpen('pickup')} className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <Map className="w-4 h-4" /> Pick from Map
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 block">Quick Campus Landmarks</label>
                  <div className="flex flex-wrap gap-2">
                    {quickLandmarks.map((lm) => (
                      <button
                        key={lm.label}
                        onClick={() => {
                          setPickupLocation(lm.name);
                          setPickupLat(lm.lat);
                          setPickupLng(lm.lng);
                        }}
                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:border-blue-600 dark:hover:border-blue-500 transition-colors"
                      >
                        {lm.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: DROPOFF */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Where to?</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Where should the runner deliver it?</p>
                </div>
                
                <div className="space-y-3">
                  <div className="relative">
                    <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
                    <input
                      type="text"
                      placeholder="Enter delivery location (e.g. Hostel B, Room 12)"
                      value={deliveryLocation}
                      onChange={(e) => setDeliveryLocation(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                      autoFocus
                    />
                  </div>
                  
                  <button onClick={() => setMapModalOpen('delivery')} className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <Map className="w-4 h-4" /> Pick from Map
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 block">Quick Campus Landmarks</label>
                  <div className="flex flex-wrap gap-2">
                    {quickLandmarks.map((lm) => (
                      <button
                        key={lm.label}
                        onClick={() => {
                          setDeliveryLocation(lm.name);
                          setDeliveryLat(lm.lat);
                          setDeliveryLng(lm.lng);
                        }}
                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:border-blue-600 dark:hover:border-blue-500 transition-colors"
                      >
                        {lm.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: PREFERENCES */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Preferences</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Any special conditions for this run?</p>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={() => setPriority(priority === 'normal' ? 'urgent' : 'normal')}
                    className={`w-full p-4 rounded-2xl border text-left flex items-start gap-4 transition-all ${
                      priority === 'urgent' 
                        ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400 dark:bg-amber-900/20 dark:border-amber-500/50' 
                        : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${priority === 'urgent' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20' : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-400'}`}>
                      <Zap className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-bold text-sm ${priority === 'urgent' ? 'text-amber-900 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>Express Delivery</h3>
                      <p className={`text-xs mt-1 ${priority === 'urgent' ? 'text-amber-700 dark:text-amber-500' : 'text-slate-500 dark:text-slate-400'}`}>Prioritize my errand. Runner will drop everything else (+20% fee).</p>
                    </div>
                    {priority === 'urgent' && <CheckCircle2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                  </button>

                  <button
                    onClick={() => setIsBulkyItem(!isBulkyItem)}
                    className={`w-full p-4 rounded-2xl border text-left flex items-start gap-4 transition-all ${
                      isBulkyItem 
                        ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400 dark:bg-blue-900/20 dark:border-blue-500/50' 
                        : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isBulkyItem ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20' : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-400'}`}>
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-bold text-sm ${isBulkyItem ? 'text-blue-900 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>Heavy / Bulky Item</h3>
                      <p className={`text-xs mt-1 ${isBulkyItem ? 'text-blue-700 dark:text-blue-500' : 'text-slate-500 dark:text-slate-400'}`}>Requires a shuttle/keke or special handling (+₦300).</p>
                    </div>
                    {isBulkyItem && <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: REVIEW & PAY */}
            {step === 5 && (
              <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8" />
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Ready to go!</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Review the upfront fare. Funds will be held securely in escrow.</p>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
                  <div className="text-center mb-6">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Errand Fare</span>
                    <span className="text-4xl font-black text-slate-900 dark:text-white font-mono">{formatCurrency(pricing.totalFee)}</span>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Distance ({distanceKm <= 1.0 ? '1km Campus Standard' : `${distanceKm.toFixed(1)}km`})</span>
                      <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(pricing.baseFee)}</span>
                    </div>
                    {isBulkyItem && (
                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>Bulky Item Surcharge</span>
                        <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(pricing.bulkyItemSurcharge)}</span>
                      </div>
                    )}
                    {priority === 'urgent' && (
                      <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
                        <span>Express Surge (+20%)</span>
                        <span className="font-mono text-amber-700 dark:text-amber-500">Applied</span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                      <span>Runner Payout (80%)</span>
                      <span className="font-mono">{formatCurrency(pricing.runnerAmount)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 flex gap-3 text-sm text-blue-800 dark:text-blue-300">
                  <ShieldCheck className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <p><strong>Escrow Protected.</strong> Your money is held safely and only released when you provide the 4-digit PIN upon delivery.</p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* BOTTOM NAVIGATION BAR */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between mt-auto">
          {step > 1 ? (
            <button onClick={handleBack} className="px-6 py-3 rounded-full text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              Back
            </button>
          ) : (
            <div></div> // empty spacer
          )}

          {step < 5 ? (
            <Button onClick={handleNext} variant="primary" className="px-8 h-12 rounded-full font-bold shadow-md">
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} isLoading={submitting} variant="primary" className="px-8 h-12 rounded-full font-black shadow-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 border-none">
              Confirm & Request <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {mapModalOpen && (
        <MapPicker
          title={`Pinpoint ${mapModalOpen === 'pickup' ? 'Pickup' : 'Delivery'}`}
          initialLat={mapModalOpen === 'pickup' ? pickupLat : deliveryLat}
          initialLng={mapModalOpen === 'pickup' ? pickupLng : deliveryLng}
          onCancel={() => setMapModalOpen(null)}
          onConfirm={(lat, lng, address) => {
            if (mapModalOpen === 'pickup') {
              setPickupLat(lat); setPickupLng(lng); setPickupLocation(address);
            } else {
              setDeliveryLat(lat); setDeliveryLng(lng); setDeliveryLocation(address);
            }
            setMapModalOpen(null);
            toast.success('Location locked!');
          }}
        />
      )}
    </div>
  );
}

export default function NewErrandPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading booking console...</div>}>
      <ErrandBookingContent />
    </Suspense>
  );
}
