'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { calculatePricing, formatCurrency } from '@/utils/pricing';
import {
  Compass,
  Radio,
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  Utensils,
  Printer,
  Package,
  Users,
  CheckCircle2,
  Bike
} from 'lucide-react';
import { RunnerLogo } from '@/components/RunnerLogo';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LandingPage() {
  const [calcCategory, setCalcCategory] = useState<'academic' | 'food_delivery' | 'campus_errand'>('food_delivery');
  const [calcDistance, setCalcDistance] = useState(1.5);
  const [calcQueue, setCalcQueue] = useState(false);

  const dynamicDemoPrice = calculatePricing(calcCategory, 'normal', calcDistance, calcQueue, false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col antialiased selection:bg-blue-100 selection:text-blue-900">

      {/* ── TOP NAV ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <RunnerLogo className="w-8 h-8 text-blue-600" animate={false} />
            <span className="font-black text-slate-900 text-lg tracking-tight">
              ERRANDRUN
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle variant="icon" />

            <Link
              href="/login"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              Join Campus Grid
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold animate-fadeIn">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          University Campus Marketplace Active
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] max-w-3xl mx-auto">
          Delegate Any Errand. <br />
          <span className="text-blue-600">Earn While You Move.</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
          The high-velocity campus network connecting students who need things done with verified student runners moving across faculties, hostels, and cafeterias.
        </p>

        {/* Dual Primary Action Gateway */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
          <Link
            href="/signup?role=user"
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-7 py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Compass className="w-4 h-4" />
            Dispatch an Errand
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/signup?role=runner"
            className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-7 py-3.5 rounded-2xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Radio className="w-4 h-4 text-emerald-600" />
            Become a Runner (Earn 80%)
          </Link>
        </div>
      </section>

      {/* ── LIVE INTERACTIVE ESTIMATOR ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Interactive Telemetry
              </span>
              <h2 className="text-lg font-bold text-slate-900">Campus Live Fee Estimator</h2>
            </div>
            <Badge variant="info" className="text-xs font-mono font-bold">
              Escrow Guaranteed
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            {/* Controls */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mission Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'food_delivery', label: 'Cafeteria' },
                    { id: 'academic', label: 'Print/Handout' },
                    { id: 'campus_errand', label: 'Queue Wait' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCalcCategory(cat.id as any)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        calcCategory === cat.id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-700 uppercase tracking-wider">Distance Across Campus</span>
                  <span className="font-mono font-bold text-slate-900">{calcDistance.toFixed(1)} km</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.5"
                  value={calcDistance}
                  onChange={(e) => setCalcDistance(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={calcQueue}
                  onChange={(e) => setCalcQueue(e.target.checked)}
                  className="h-4 w-4 rounded text-blue-600"
                />
                <span className="text-xs font-bold text-slate-800">Queue Standing Required</span>
              </label>
            </div>

            {/* Price Result Box */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 text-center space-y-3">
              <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Estimated Total Fee</span>
              <p className="text-4xl sm:text-5xl font-black font-mono text-emerald-400">
                {formatCurrency(dynamicDemoPrice.totalFee)}
              </p>
              <div className="pt-2 border-t border-slate-800 text-xs text-slate-400 flex justify-around">
                <span>Runner Payout: <strong className="text-white">{formatCurrency(dynamicDemoPrice.runnerAmount)}</strong></span>
                <span>Assurance: <strong className="text-white">{formatCurrency(dynamicDemoPrice.platformFee)}</strong></span>
              </div>
              <Link
                href="/signup?role=user"
                className="inline-block w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs text-white transition-colors mt-2"
              >
                Dispatch with Escrow ➔
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3-STEP PROCESS STRIP ── */}
      <section className="bg-white border-y border-slate-200 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Zero Friction
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              How ERRANDRUN Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-black text-base flex items-center justify-center">
                1
              </div>
              <h3 className="font-bold text-base text-slate-900">Post Task with Escrow</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Describe what you need, pinpoint locations on the campus map, and your payment is locked in protected escrow.
              </p>
            </div>

            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-base flex items-center justify-center">
                2
              </div>
              <h3 className="font-bold text-base text-slate-900">Verified Runner Claims</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Nearby students moving between faculties claim your task and broadcast live GPS transit updates.
              </p>
            </div>

            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white font-black text-base flex items-center justify-center">
                3
              </div>
              <h3 className="font-bold text-base text-slate-900">Release with 4-Digit PIN</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Inspect your items physically, hand over your secret 4-digit PIN, and your runner receives their 80% payout.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-10 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <RunnerLogo className="w-6 h-6 text-blue-400" animate={false} />
            <span className="font-bold text-white">ERRANDRUN</span>
            <span>• University Campus Network</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-white transition-colors">Register</Link>
            <Link href="/become-a-runner" className="hover:text-white transition-colors">Runner Guide</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
