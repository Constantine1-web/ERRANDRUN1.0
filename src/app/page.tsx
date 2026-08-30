'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ShieldCheck,
  MapPin,
  Clock,
  Utensils,
  BookOpen,
  FileCheck,
  ShoppingBag,
  ChevronRight,
  Bike,
  Lock,
  Zap,
  CheckCircle,
  TrendingUp,
  Layers,
} from 'lucide-react';
import { formatCurrency, calculatePricing } from '@/utils/pricing';

export default function Home() {
  const [calcCategory, setCalcCategory] = useState<'academic' | 'food_delivery' | 'campus_errand'>('food_delivery');
  const [calcDistance, setCalcDistance] = useState(1.5);
  const [calcQueue, setCalcQueue] = useState(false);

  const dynamicDemoPrice = calculatePricing(calcCategory, 'normal', calcDistance, calcQueue, false);

  const campusFeatures = [
    {
      icon: Utensils,
      title: 'Food & Cafeteria Delivery',
      description:
        'Get meals from on-campus cafeterias and nearby food spots delivered directly to your faculty or hostel door in minutes.',
      tag: 'Food & Dining',
    },
    {
      icon: FileCheck,
      title: 'Clearance & Queue Standing',
      description:
        'Save hours standing in academic clearance, bursary, or faculty secretariat queues. Have an authorized runner hold your place.',
      tag: 'Administrative',
    },
    {
      icon: BookOpen,
      title: 'Printing & Handout Pickups',
      description:
        'Need project bindings, course material printouts, or stationary before morning lectures? Let a runner handle the run.',
      tag: 'Academic',
    },
    {
      icon: ShoppingBag,
      title: 'Campus Gate & Parcel Pickups',
      description:
        'Packages and waybills arrived at the campus main gate or shuttle park? Get them safely transferred right to your room.',
      tag: 'Logistics',
    },
  ];

  const steps = [
    {
      num: '01',
      title: 'Post Your Errand',
      desc: 'Specify your pickup location, drop-off destination, urgency level, and task notes.',
      icon: Layers,
    },
    {
      num: '02',
      title: 'Secure Escrow Payment',
      desc: 'Funds are securely held via Paystack escrow and only released when you confirm delivery.',
      icon: Lock,
    },
    {
      num: '03',
      title: 'Live Tracking & Drop-off',
      desc: 'Track your runner with live status updates and confirm completion once delivered.',
      icon: Zap,
    },
  ];

  return (
    <div className="min-h-screen bg-dark-base text-white selection:bg-primary-500 selection:text-white">
      {/* Top Header Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4 glass-card border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-black text-gradient">
            <span>⚡</span>
            <span>ErrandRun</span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/login"
              className="text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup?role=runner"
              className="hidden sm:inline-flex px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider text-primary-300 bg-primary-500/10 border border-primary-500/30 hover:bg-primary-500/20 transition-all"
            >
              Become a Runner
            </Link>
            <Link href="/signup?role=user" className="btn-primary text-sm py-2 px-4 shadow-lg shadow-primary-500/25">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-36 pb-20 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-r from-primary-500/15 via-accent-purple/15 to-emerald-500/15 blur-[140px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-primary-300 mb-6 backdrop-blur-md"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>On-Demand Peer-to-Peer Campus Logistics Network</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="heading-hero font-extrabold tracking-tight mb-6"
          >
            Campus Logistics,{' '}
            <span className="text-gradient">Fast & Simplified.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed font-normal"
          >
            Delegate cafeteria food runs, administrative clearance queues, textbook pickups, and hostel parcel drop-offs with live GPS tracking and secure escrow payment.
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link
              href="/signup?role=user"
              className="w-full sm:w-auto btn-primary py-4 px-8 text-base font-bold flex items-center justify-center gap-3 shadow-xl shadow-primary-500/25 group"
            >
              <span>Request an Errand</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/signup?role=runner"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold text-base transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Bike className="w-5 h-5 text-emerald-400" />
              <span>Earn as a Runner</span>
            </Link>
          </motion.div>

          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto pt-6 border-t border-white/10 text-left">
            <div className="p-3.5 bg-white/[0.02] rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-base">
                ₦
              </div>
              <div>
                <p className="text-xs text-white/50">Base fee from</p>
                <p className="text-sm font-bold text-white">₦800 / task</p>
              </div>
            </div>

            <div className="p-3.5 bg-white/[0.02] rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-white/50">Average Time</p>
                <p className="text-sm font-bold text-white">15 – 30 Mins</p>
              </div>
            </div>

            <div className="p-3.5 bg-white/[0.02] rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-white/50">Payment Security</p>
                <p className="text-sm font-bold text-white">Paystack Escrow</p>
              </div>
            </div>

            <div className="p-3.5 bg-white/[0.02] rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent-purple/10 flex items-center justify-center text-accent-purple">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-white/50">Live Status</p>
                <p className="text-sm font-bold text-white">Real-Time Maps</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-primary-400 uppercase tracking-widest block mb-2">
              Everyday Campus Errands
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              What Can You Delegate?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {campusFeatures.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={idx}
                  whileHover={{ y: -4 }}
                  className="glass-card rounded-3xl p-8 border border-white/10 flex flex-col justify-between hover:border-primary-500/30 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-purple/20 border border-primary-500/30 flex items-center justify-center text-primary-300">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-white/80">
                        {item.tag}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-white/60 leading-relaxed">{item.description}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-primary-400 font-semibold">
                    <span>Available On-Demand</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 bg-white/[0.015] border-y border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-2">
              Simple 3-Step Process
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              How ErrandRun Works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  className="glass-card rounded-3xl p-8 border border-white/10 relative flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-3xl font-black text-white/20 font-mono">
                        {step.num}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-white/60 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Dynamic Price Estimator */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs font-bold text-primary-400 uppercase tracking-widest block mb-2">
              Transparent Dynamic Rates
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Estimate Your Errand Fee
            </h2>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              Upfront pricing based on estimated distance and queue complexity. No hidden surcharges. Runners receive 80% of every completed errand.
            </p>

            <div className="space-y-4 bg-white/5 p-6 rounded-3xl border border-white/10">
              <div>
                <label className="text-xs font-semibold text-white/80 block mb-2">Errand Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'food_delivery', label: 'Food Delivery' },
                    { id: 'academic', label: 'Academic / Print' },
                    { id: 'campus_errand', label: 'Queue / Parcel' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCalcCategory(cat.id as any)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                        calcCategory === cat.id
                          ? 'bg-primary-500 text-white'
                          : 'bg-white/5 text-white/60 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-white/80 mb-2">
                  <span>Estimated Distance</span>
                  <span className="text-primary-400">{calcDistance.toFixed(1)} km</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.5"
                  value={calcDistance}
                  onChange={(e) => setCalcDistance(parseFloat(e.target.value))}
                  className="w-full accent-primary-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  id="calcQueueCheck"
                  type="checkbox"
                  checked={calcQueue}
                  onChange={(e) => setCalcQueue(e.target.checked)}
                  className="rounded accent-primary-500 w-4 h-4"
                />
                <label htmlFor="calcQueueCheck" className="text-xs text-white/80 cursor-pointer">
                  Queue complexity surcharge (+₦500)
                </label>
              </div>
            </div>
          </div>

          {/* Pricing Result Card */}
          <div className="glass-card rounded-3xl p-8 border border-primary-500/30 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl" />
            <span className="text-xs font-bold text-white/60 uppercase tracking-widest block mb-2">
              Calculated Total Fee
            </span>
            <div className="text-5xl font-black text-white mb-6">
              {formatCurrency(dynamicDemoPrice.totalFee)}
            </div>

            <div className="space-y-3 pb-6 border-b border-white/10 text-xs text-white/60">
              <div className="flex justify-between">
                <span>Base errand fee</span>
                <span className="text-white font-medium">{formatCurrency(dynamicDemoPrice.baseFee)}</span>
              </div>
              <div className="flex justify-between">
                <span>Distance fee ({calcDistance} km)</span>
                <span className="text-white font-medium">{formatCurrency(dynamicDemoPrice.distanceSurcharge)}</span>
              </div>
              {calcQueue && (
                <div className="flex justify-between text-amber-300">
                  <span>Queue fee</span>
                  <span className="font-medium">+{formatCurrency(dynamicDemoPrice.queueComplexityFee)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-white/5 text-emerald-400">
                <span>Runner payout (80%)</span>
                <span className="font-bold">{formatCurrency(dynamicDemoPrice.runnerAmount)}</span>
              </div>
            </div>

            <Link href="/signup?role=user" className="btn-primary w-full mt-6 py-3 text-sm flex items-center justify-center gap-2">
              <span>Post This Errand</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Safety & Trust Section */}
      <section className="py-20 px-4 sm:px-6 bg-white/[0.015] border-t border-white/10">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
            <ShieldCheck className="w-4 h-4" />
            <span>Platform Security Standards</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-12">
            Built for Safe & Reliable Campus Delivery
          </h2>

          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-400">
                <CheckCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Vetted Identity</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Runners submit official student identification and academic registration records before being authorized to accept tasks.
              </p>
            </div>

            <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Escrow Protection</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Requesters pay via Paystack into secure platform escrow. Funds are only transferred upon verified drop-off confirmation.
              </p>
            </div>

            <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center text-accent-purple">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Ratings & Feedback</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Every task is rated on a 1–5 star scale with performance tracking to maintain exceptional community trust.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto glass-card rounded-3xl p-10 sm:p-14 text-center border border-primary-500/30 relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-primary-500/20 rounded-full blur-3xl" />
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-white/60 text-base sm:text-lg max-w-xl mx-auto mb-8">
            Create your account today and experience seamless, reliable peer-to-peer campus logistics.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup?role=user" className="btn-primary py-4 px-8 text-base font-bold w-full sm:w-auto">
              Create User Account
            </Link>
            <Link href="/signup?role=runner" className="btn-secondary py-4 px-8 text-base font-bold w-full sm:w-auto">
              Apply as a Runner
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-4 sm:px-6 text-xs text-white/40 text-center">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; {new Date().getFullYear()} ErrandRun. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-white transition-colors">Register</Link>
            <Link href="/dashboard/admin" className="hover:text-white transition-colors">Admin Portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
