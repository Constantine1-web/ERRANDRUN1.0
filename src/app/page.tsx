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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <RunnerLogo className="w-8 h-8" animate={false} />
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              Errand<span className="text-blue-600">Run</span>
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
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
      <section className="pt-36 pb-20 px-4 sm:px-6 relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-[#F8FAFC]">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-6"
          >
            <Badge variant="info" className="px-3 py-1.5 gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>On-Demand Peer-to-Peer Campus Logistics</span>
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1] text-slate-900"
          >
            Campus Logistics,{' '}
            <span className="text-blue-600">Fast & Simplified.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Delegate cafeteria food runs, clearance queues, textbook pickups, and parcel drop-offs with live GPS tracking and escrow security.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link href="/request-errand" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto group">
                Request an Errand
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/become-a-runner" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto gap-2">
                <Bike className="w-5 h-5 text-green-600" />
                Earn as a Runner
              </Button>
            </Link>
          </motion.div>

          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 font-bold">
                  ₦
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-500">Base fee from</p>
                  <p className="text-sm font-bold text-slate-900">₦800 / task</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-500">Average Time</p>
                  <p className="text-sm font-bold text-slate-900">15 – 30 Mins</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-500">Payment Security</p>
                  <p className="text-sm font-bold text-slate-900">Escrow</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-500">Live Status</p>
                  <p className="text-sm font-bold text-slate-900">Real-Time Maps</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="info" className="mb-3 uppercase tracking-widest">Everyday Campus Errands</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              What Can You Delegate?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {campusFeatures.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div key={idx} whileHover={{ y: -4 }}>
                  <Card className="h-full hover:border-blue-300 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                        <Icon className="w-6 h-6" />
                      </div>
                      <Badge variant="outline">{item.tag}</Badge>
                    </CardHeader>
                    <CardContent>
                      <CardTitle className="text-xl mb-2">{item.title}</CardTitle>
                      <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                    </CardContent>
                    <CardFooter className="pt-3 border-t border-slate-100 text-xs text-blue-600 font-semibold flex justify-between mt-auto">
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
      <section className="py-20 px-4 sm:px-6 bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="success" className="mb-3 uppercase tracking-widest">Simple 3-Step Process</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              How ErrandRun Works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <Card key={idx} className="relative overflow-hidden bg-slate-50/50">
                  <div className="absolute right-4 top-4 text-5xl font-black text-slate-200 select-none pointer-events-none">
                    {step.num}
                  </div>
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3">
                      <Icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Dynamic Price Estimator */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="warning" className="mb-3 uppercase tracking-widest">Transparent Dynamic Rates</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
              Estimate Your Errand Fee
            </h2>
            <p className="text-slate-600 text-base leading-relaxed mb-8">
              Upfront pricing based on estimated distance and queue complexity. No hidden surcharges. Runners receive 80% of every completed errand.
            </p>

            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-3">Errand Category</label>
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
                  <div className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
                    <span>Estimated Distance</span>
                    <span className="text-blue-600">{calcDistance.toFixed(1)} km</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.5"
                    value={calcDistance}
                    onChange={(e) => setCalcDistance(parseFloat(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <input
                    id="calcQueueCheck"
                    type="checkbox"
                    checked={calcQueue}
                    onChange={(e) => setCalcQueue(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="calcQueueCheck" className="text-sm text-slate-700 cursor-pointer select-none">
                    Queue complexity surcharge (+₦500)
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Result Card */}
          <Card className="border-blue-200 bg-blue-50/40 shadow-md">
            <CardContent className="p-8 sm:p-10">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                Calculated Total Fee
              </span>
              <div className="text-4xl sm:text-5xl font-black text-slate-900 mb-6 font-mono">
                {formatCurrency(dynamicDemoPrice.totalFee)}
              </div>

              <div className="space-y-3 pb-6 border-b border-slate-200 text-sm text-slate-600">
                <div className="flex justify-between items-center">
                  <span>Base errand fee</span>
                  <span className="text-slate-900 font-medium">{formatCurrency(dynamicDemoPrice.baseFee)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Distance fee ({calcDistance} km)</span>
                  <span className="text-slate-900 font-medium">{formatCurrency(dynamicDemoPrice.distanceSurcharge)}</span>
                </div>
                {calcQueue && (
                  <div className="flex justify-between items-center text-amber-700 font-medium">
                    <span>Queue fee</span>
                    <span>+{formatCurrency(dynamicDemoPrice.queueComplexityFee)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-green-700">
                  <span className="font-medium">Runner payout (80%)</span>
                  <span className="font-bold text-base font-mono">{formatCurrency(dynamicDemoPrice.runnerAmount)}</span>
                </div>
              </div>

              <Link href="/request-errand" className="block mt-6">
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
      <section className="py-20 px-4 sm:px-6 bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto text-center">
          <Badge variant="success" className="mb-4 px-4 py-1.5 gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Platform Security Standards</span>
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-12">
            Built for Safe & Reliable Campus Delivery
          </h2>

          <div className="grid md:grid-cols-3 gap-6 text-left">
            <Card>
              <CardContent className="p-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg mb-2">Vetted Identity</CardTitle>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Runners submit official student identification and academic registration records before being authorized to accept tasks.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 mb-4">
                  <Lock className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg mb-2">Escrow Protection</CardTitle>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Requesters pay via Paystack into secure platform escrow. Funds are only transferred upon verified drop-off confirmation.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 mb-4">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg mb-2">Ratings & Feedback</CardTitle>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Every task is rated on a 1–5 star scale with performance tracking to maintain exceptional community trust.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-20 px-4 sm:px-6">
        <Card className="max-w-5xl mx-auto border-blue-200 bg-blue-600 text-white shadow-lg">
          <CardContent className="p-10 sm:p-16 text-center">
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-blue-100 text-base sm:text-lg max-w-xl mx-auto mb-8">
              Create your account today and experience seamless, reliable peer-to-peer campus logistics.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/request-errand" className="w-full sm:w-auto">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto bg-white text-slate-900 hover:bg-slate-100 border-none font-bold">
                  Create User Account
                </Button>
              </Link>
              <Link href="/become-a-runner" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-white border-white/40 hover:bg-white/10">
                  Apply as a Runner
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-10 px-4 sm:px-6 text-sm text-slate-500 text-center bg-white">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; {new Date().getFullYear()} ErrandRun. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-slate-900 transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-slate-900 transition-colors">Register</Link>
            <Link href="/dashboard/admin" className="hover:text-slate-900 transition-colors">Admin Portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
