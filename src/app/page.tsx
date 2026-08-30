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
  Star,
  ChevronRight,
  Bike,
  Lock,
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
      title: 'Campus Cafeteria & Food Runs',
      description:
        'Craving Iya Moria, Sub Buka, or Amala Spot during hectic lectures? Get hot meals delivered right to your faculty or hostel door in minutes.',
      badge: 'Most Popular',
    },
    {
      icon: FileCheck,
      title: 'Clearance & Queue Standing',
      description:
        'Skip the 3-hour queue at the Faculty Secretariat, Dean\'s Office, or Student Affairs. Have a verified student hold your spot while you study.',
      badge: 'Exam Saver',
    },
    {
      icon: BookOpen,
      title: 'Printing & Bookstore Runs',
      description:
        'Need 50 pages of project printouts, course handouts from the faculty basement, or stationary before an 8:00 AM test? We handle it.',
      badge: 'Academic',
    },
    {
      icon: ShoppingBag,
      title: 'Campus Gate & Parcel Pickups',
      description:
        'Waybill arrived at the university main gate or hostel shuttle park? Verified runners pick it up and deliver it directly to your room.',
      badge: 'Convenient',
    },
  ];

  const nigerianUniversities = [
    'UNILAG',
    'University of Ibadan (UI)',
    'OAU Ife',
    'UNIBEN',
    'UNN Nsukka',
    'Covenant University',
    'FUTO',
    'ABU Zaria',
    'LASU',
    'Babcock',
  ];

  const studentTestimonials = [
    {
      name: 'Chinedu Okonkwo',
      school: 'UNILAG • 400L Accounting',
      role: 'Student Runner',
      earnings: 'Earned ₦48,500 last week',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      comment:
        'ErrandRun allows me to fund my handouts and daily upkeep simply by picking up meals and project printouts between my lectures. Fast payouts straight to my bank account!',
      stars: 5,
    },
    {
      name: 'Amina Bello',
      school: 'University of Ibadan • 300L Medicine',
      role: 'Regular Requester',
      earnings: 'Saved 12+ hours weekly',
      avatar:
        'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&q=80',
      comment:
        'During clinical postings at UCH, I barely have time to buy food or submit clearance slips at Faculty. ErrandRun connects me with reliable classmates who get it done safely.',
      stars: 5,
    },
    {
      name: 'Tunde Adeleke',
      school: 'OAU Ife • 200L Computer Science',
      role: 'Campus Runner',
      earnings: 'Over 80 tasks completed',
      avatar:
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
      comment:
        'The verification system gives everyone peace of mind. Requesters know I am a legitimate matriculated student, and my money is locked in escrow before I take a single step.',
      stars: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-dark-base text-white selection:bg-primary-500 selection:text-white">
      {/* Navigation */}
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
        {/* Glow ambient effects */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-r from-primary-500/20 via-accent-purple/20 to-emerald-500/20 blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto text-center relative z-10">
          {/* Trust Banner Tag */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-primary-300 mb-6 backdrop-blur-md"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Student-ID Verified Campus Peer-to-Peer Logistics</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6"
          >
            Campus Stress,{' '}
            <span className="text-gradient">Handled by Verified Students.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg sm:text-xl text-white/70 max-w-3xl mx-auto mb-10 leading-relaxed font-normal"
          >
            From cafeteria food deliveries to clearance queues, bookstore runs, and hostel drop-offs across Nigerian universities. Fast, affordable, and backed by Paystack escrow protection.
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
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
              <span>Earn as a Student Runner</span>
            </Link>
          </motion.div>

          {/* Key Value Props Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto pt-6 border-t border-white/10 text-left">
            <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-sm">
                ₦
              </div>
              <div>
                <p className="text-xs text-white/50">Starts at only</p>
                <p className="text-sm font-bold text-white">₦800 per errand</p>
              </div>
            </div>

            <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-white/50">Average Delivery</p>
                <p className="text-sm font-bold text-white">15 – 25 Minutes</p>
              </div>
            </div>

            <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-white/50">Escrow Security</p>
                <p className="text-sm font-bold text-white">Paystack Secured</p>
              </div>
            </div>

            <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent-purple/10 flex items-center justify-center text-accent-purple">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-white/50">Live Tracking</p>
                <p className="text-sm font-bold text-white">GPS Map Updates</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* University Ticker */}
      <section className="py-6 border-y border-white/10 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-xs uppercase tracking-widest text-white/40 mb-3 font-semibold">
            Active & Expanding Across Top Nigerian Campuses
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-sm font-semibold text-white/60">
            {nigerianUniversities.map((uni, idx) => (
              <span key={idx} className="flex items-center gap-2">
                <span>{uni}</span>
                {idx !== nigerianUniversities.length - 1 && <span className="text-white/20">•</span>}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Campus Use Cases */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-primary-400 uppercase tracking-widest block mb-2">
              Everything You Need on Campus
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              What Can Your Runner Do For You?
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
                        {item.badge}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-white/60 leading-relaxed">{item.description}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-primary-400 font-semibold">
                    <span>Order in 30 seconds</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Price Calculator Preview */}
      <section className="py-20 px-4 sm:px-6 bg-white/[0.015] border-y border-white/10">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-2">
              Transparent Campus Rates
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Calculate Your Errand Fee Instantly
            </h2>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              No hidden surge fees. We use transparent pricing calculated directly from faculty distance and queue complexity. Runners keep 80% of every delivery.
            </p>

            <div className="space-y-4 bg-white/5 p-6 rounded-3xl border border-white/10">
              <div>
                <label className="text-xs font-semibold text-white/80 block mb-2">Errand Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'food_delivery', label: 'Food Run' },
                    { id: 'academic', label: 'Printing/Doc' },
                    { id: 'campus_errand', label: 'Queue/Parcel' },
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
                  <span>Campus Distance</span>
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
                  Includes line / clearance queue standing (+₦500)
                </label>
              </div>
            </div>
          </div>

          {/* Pricing Result Card */}
          <div className="glass-card rounded-3xl p-8 border border-primary-500/30 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl" />
            <span className="text-xs font-bold text-white/60 uppercase tracking-widest block mb-2">
              Estimated Total Fee
            </span>
            <div className="text-5xl font-black text-white mb-6">
              {formatCurrency(dynamicDemoPrice.totalFee)}
            </div>

            <div className="space-y-3 pb-6 border-b border-white/10 text-xs text-white/60">
              <div className="flex justify-between">
                <span>Base campus fee</span>
                <span className="text-white font-medium">{formatCurrency(dynamicDemoPrice.baseFee)}</span>
              </div>
              <div className="flex justify-between">
                <span>Distance surcharge ({calcDistance} km)</span>
                <span className="text-white font-medium">{formatCurrency(dynamicDemoPrice.distanceSurcharge)}</span>
              </div>
              {calcQueue && (
                <div className="flex justify-between text-amber-300">
                  <span>Queue complexity allowance</span>
                  <span className="font-medium">+{formatCurrency(dynamicDemoPrice.queueComplexityFee)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-white/5 text-emerald-400">
                <span>Runner takes home (80%)</span>
                <span className="font-bold">{formatCurrency(dynamicDemoPrice.runnerAmount)}</span>
              </div>
            </div>

            <Link href="/signup?role=user" className="btn-primary w-full mt-6 py-3 text-sm flex items-center justify-center gap-2">
              <span>Place This Errand Now</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Student Testimonials */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-primary-400 uppercase tracking-widest block mb-2">
              Loved By Nigerian Undergraduates
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Real Campus Stories
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {studentTestimonials.map((t, idx) => (
              <div
                key={idx}
                className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-1 text-amber-400 mb-4 text-sm">
                    {[...Array(t.stars)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed italic mb-6">
                    "{t.comment}"
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-12 h-12 rounded-full object-cover border border-primary-500/40"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-white">{t.name}</h4>
                    <p className="text-xs text-white/50">{t.school}</p>
                    <p className="text-[10px] font-semibold text-emerald-400 mt-0.5">{t.earnings}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto glass-card rounded-3xl p-10 sm:p-14 text-center border border-primary-500/30 relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-primary-500/20 rounded-full blur-3xl" />
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
            Ready to Outsource Your Campus Stress?
          </h2>
          <p className="text-white/60 text-base sm:text-lg max-w-xl mx-auto mb-8">
            Join thousands of Nigerian students delegating queues, food runs, and parcel deliveries today.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup?role=user" className="btn-primary py-4 px-8 text-base font-bold w-full sm:w-auto">
              Create Your Free Account
            </Link>
            <Link href="/signup?role=runner" className="btn-secondary py-4 px-8 text-base font-bold w-full sm:w-auto">
              Apply as a Student Runner
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-4 sm:px-6 text-xs text-white/40 text-center">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; {new Date().getFullYear()} ErrandRun. Built for Nigerian Campuses.</p>
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
