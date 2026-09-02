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
import { RunnerLogo } from '@/components/RunnerLogo';
import { formatCurrency, calculatePricing } from '@/utils/pricing';

import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function LandingPage() {
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
    <div className="min-h-screen bg-[#0A0F1C] text-white selection:bg-primary-500 selection:text-white font-sans">
      {/* Top Header Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4 border-b border-white/5 bg-[#0A0F1C]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <RunnerLogo className="w-8 h-8 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" animate={true} />
            <span className="text-2xl font-black text-white tracking-tight">
              Errand<span className="text-primary-400">Run</span>
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/login"
              className="text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link href="/signup?role=runner" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm">Become a Runner</Button>
            </Link>
            <Link href="/signup?role=user">
              <Button variant="primary" size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-primary-500/20 via-accent-purple/20 to-emerald-500/20 blur-[150px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-8"
          >
            <Badge variant="outline" className="px-3 py-1.5 gap-2 backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>On-Demand Peer-to-Peer Campus Logistics Network</span>
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]"
          >
            Campus Logistics,{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-purple">Fast & Simplified.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            Delegate cafeteria food runs, administrative clearance queues, textbook pickups, and hostel parcel drop-offs with live GPS tracking and secure escrow payment.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
          >
            <Link href="/request-errand" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto group">
                Request an Errand
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/become-a-runner" className="w-full sm:w-auto">
              <Button variant="glass" size="lg" className="w-full sm:w-auto gap-2">
                <Bike className="w-5 h-5 text-emerald-400" />
                Earn as a Runner
              </Button>
            </Link>
          </motion.div>

          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <Card className="bg-white/[0.02] border-white/5">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold">
                  ₦
                </div>
                <div className="text-left">
                  <p className="text-xs text-white/50">Base fee from</p>
                  <p className="text-sm font-bold text-white">₦800 / task</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.02] border-white/5">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-white/50">Average Time</p>
                  <p className="text-sm font-bold text-white">15 – 30 Mins</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.02] border-white/5">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-white/50">Payment Security</p>
                  <p className="text-sm font-bold text-white">Escrow</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.02] border-white/5">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center text-accent-purple">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-white/50">Live Status</p>
                  <p className="text-sm font-bold text-white">Real-Time Maps</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="info" className="mb-4 uppercase tracking-widest">Everyday Campus Errands</Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white">
              What Can You Delegate?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {campusFeatures.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div key={idx} whileHover={{ y: -4 }}>
                  <Card className="h-full hover:border-primary-500/30 transition-all bg-white/[0.02]">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-purple/20 border border-primary-500/30 flex items-center justify-center text-primary-300">
                        <Icon className="w-6 h-6" />
                      </div>
                      <Badge variant="outline">{item.tag}</Badge>
                    </CardHeader>
                    <CardContent>
                      <CardTitle className="text-xl mb-3">{item.title}</CardTitle>
                      <p className="text-sm text-white/60 leading-relaxed">{item.description}</p>
                    </CardContent>
                    <CardFooter className="pt-4 border-t border-white/5 text-xs text-primary-400 font-semibold flex justify-between mt-auto">
                      <span>Available On-Demand</span>
                      <ArrowRight className="w-4 h-4" />
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 sm:px-6 relative">
        <div className="absolute inset-0 bg-primary-500/5 border-y border-white/10" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="success" className="mb-4 uppercase tracking-widest">Simple 3-Step Process</Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white">
              How ErrandRun Works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <Card key={idx} className="bg-white/[0.02] border-white/5 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 text-8xl font-black text-white/5 select-none pointer-events-none">
                    {step.num}
                  </div>
                  <CardHeader>
                    <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 mb-4">
                      <Icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-xl">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-white/60 leading-relaxed">{step.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Dynamic Price Estimator */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="warning" className="mb-4 uppercase tracking-widest">Transparent Dynamic Rates</Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-6">
              Estimate Your Errand Fee
            </h2>
            <p className="text-white/60 text-base leading-relaxed mb-8">
              Upfront pricing based on estimated distance and queue complexity. No hidden surcharges. Runners receive 80% of every completed errand.
            </p>

            <Card className="bg-white/[0.02] border-white/10">
              <CardContent className="p-6 space-y-6">
                <div>
                  <label className="text-sm font-semibold text-white/80 block mb-3">Errand Category</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'food_delivery', label: 'Food Delivery' },
                      { id: 'academic', label: 'Academic / Print' },
                      { id: 'campus_errand', label: 'Queue / Parcel' },
                    ].map((cat) => (
                      <Button
                        key={cat.id}
                        variant={calcCategory === cat.id ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setCalcCategory(cat.id as any)}
                        className="w-full text-xs font-semibold"
                      >
                        {cat.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm font-semibold text-white/80 mb-3">
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
                    className="w-full accent-primary-500 cursor-pointer h-2 bg-white/10 rounded-lg appearance-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <div className="relative flex items-center">
                    <input
                      id="calcQueueCheck"
                      type="checkbox"
                      checked={calcQueue}
                      onChange={(e) => setCalcQueue(e.target.checked)}
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-white/20 bg-white/5 checked:border-primary-500 checked:bg-primary-500 transition-all"
                    />
                    <CheckCircle className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <label htmlFor="calcQueueCheck" className="text-sm text-white/80 cursor-pointer select-none">
                    Queue complexity surcharge (+₦500)
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Result Card */}
          <Card className="border-primary-500/30 shadow-2xl shadow-primary-500/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/20 rounded-full blur-[80px] pointer-events-none" />
            <CardContent className="p-8 sm:p-10">
              <span className="text-sm font-bold text-white/60 uppercase tracking-widest block mb-4">
                Calculated Total Fee
              </span>
              <div className="text-5xl sm:text-6xl font-black text-white mb-8">
                {formatCurrency(dynamicDemoPrice.totalFee)}
              </div>

              <div className="space-y-4 pb-8 border-b border-white/10 text-sm text-white/60">
                <div className="flex justify-between items-center">
                  <span>Base errand fee</span>
                  <span className="text-white font-medium text-base">{formatCurrency(dynamicDemoPrice.baseFee)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Distance fee ({calcDistance} km)</span>
                  <span className="text-white font-medium text-base">{formatCurrency(dynamicDemoPrice.distanceSurcharge)}</span>
                </div>
                {calcQueue && (
                  <div className="flex justify-between items-center text-amber-300">
                    <span>Queue fee</span>
                    <span className="font-medium text-base">+{formatCurrency(dynamicDemoPrice.queueComplexityFee)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-4 border-t border-white/5 text-emerald-400">
                  <span className="font-medium">Runner payout (80%)</span>
                  <span className="font-bold text-lg">{formatCurrency(dynamicDemoPrice.runnerAmount)}</span>
                </div>
              </div>

              <Link href="/request-errand" className="block mt-8">
                <Button size="lg" className="w-full flex items-center justify-center gap-2">
                  Post This Errand
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Safety & Trust Section */}
      <section className="py-24 px-4 sm:px-6 relative">
        <div className="absolute inset-0 bg-white/[0.015] border-t border-white/10" />
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <Badge variant="success" className="mb-6 px-4 py-1.5 gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Platform Security Standards</span>
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-16">
            Built for Safe & Reliable<br />Campus Delivery
          </h2>

          <div className="grid md:grid-cols-3 gap-6 text-left">
            <Card className="bg-white/[0.02] border-white/5 hover:border-white/10 transition-colors">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-400 mb-6">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl mb-3">Vetted Identity</CardTitle>
                <p className="text-sm text-white/60 leading-relaxed">
                  Runners submit official student identification and academic registration records before being authorized to accept tasks.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.02] border-white/5 hover:border-white/10 transition-colors">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6">
                  <Lock className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl mb-3">Escrow Protection</CardTitle>
                <p className="text-sm text-white/60 leading-relaxed">
                  Requesters pay via Paystack into secure platform escrow. Funds are only transferred upon verified drop-off confirmation.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.02] border-white/5 hover:border-white/10 transition-colors">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-xl bg-accent-purple/10 flex items-center justify-center text-accent-purple mb-6">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl mb-3">Ratings & Feedback</CardTitle>
                <p className="text-sm text-white/60 leading-relaxed">
                  Every task is rated on a 1–5 star scale with performance tracking to maintain exceptional community trust.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-24 px-4 sm:px-6">
        <Card className="max-w-5xl mx-auto border-primary-500/30 relative overflow-hidden bg-[#121824]">
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-primary-500/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-accent-purple/20 rounded-full blur-[100px] pointer-events-none" />
          
          <CardContent className="p-12 sm:p-20 text-center relative z-10">
            <h2 className="text-4xl sm:text-6xl font-black text-white mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-white/70 text-lg sm:text-xl max-w-2xl mx-auto mb-10">
              Create your account today and experience seamless, reliable peer-to-peer campus logistics.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/request-errand" className="w-full sm:w-auto">
                <Button size="lg" className="w-full">
                  Create User Account
                </Button>
              </Link>
              <Link href="/become-a-runner" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full">
                  Apply as a Runner
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4 sm:px-6 text-sm text-white/40 text-center bg-[#0A0F1C]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <p>&copy; {new Date().getFullYear()} ErrandRun. All rights reserved.</p>
          <div className="flex items-center gap-8">
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-white transition-colors">Register</Link>
            <Link href="/dashboard/admin" className="hover:text-white transition-colors">Admin Portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
