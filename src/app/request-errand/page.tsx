import React from 'react';
import Link from 'next/link';
import { ShieldCheck, MapPin, FastForward, CheckCircle2, ArrowRight } from 'lucide-react';
import { RunnerLogo } from '@/components/RunnerLogo';

export default function RequestErrandPage() {
  return (
    <div className="min-h-screen bg-dark-base relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent-purple/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-dark-base/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <RunnerLogo className="w-8 h-8 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" animate={true} />
            <span className="text-2xl font-black text-white tracking-tight">
              Errand<span className="text-primary-400">Run</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-white/70 hover:text-white hidden sm:block">
              Sign In
            </Link>
            <Link href="/dashboard/errands/new" className="btn-primary text-sm py-2 px-5">
              Post Errand
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-24 px-4 sm:px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-xs font-semibold text-primary-400 mb-6">
            <FastForward className="w-4 h-4" />
            <span>On-Demand Logistics</span>
          </div>
          <h1 className="heading-hero font-black text-white mb-6">
            Don't have time? <br />
            <span className="text-primary-400">Delegate it.</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/60 mb-10 max-w-2xl mx-auto">
            From cafeteria food runs to standing in clearance queues. Get matched with a verified student runner in seconds and track everything live.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard/errands/new" className="w-full sm:w-auto btn-primary py-4 px-8 text-base font-bold flex items-center justify-center gap-2 shadow-xl shadow-primary-500/20">
              Draft Your Errand <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Popular Categories Grid */}
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
          {[
            { title: 'Food Delivery', desc: 'Cafeteria or local campus spots.' },
            { title: 'Queue Standing', desc: 'Bursary, clearance, or admin.' },
            { title: 'Parcel Pickups', desc: 'Post office or gate collections.' },
            { title: 'Printing & Handouts', desc: 'Course materials delivered.' }
          ].map((cat, idx) => (
            <div key={idx} className="glass-card p-6 rounded-3xl border border-white/5 hover:border-primary-500/30 transition-colors">
              <h3 className="font-bold text-white mb-2">{cat.title}</h3>
              <p className="text-white/50 text-sm">{cat.desc}</p>
            </div>
          ))}
        </div>

        {/* Trust Section */}
        <div className="max-w-4xl mx-auto glass-card rounded-3xl p-8 sm:p-12 border border-white/10 text-center">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">100% Safe & Guaranteed</h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto text-sm sm:text-base">
            Your payment is held securely in <strong>Paystack Escrow</strong>. The runner only gets paid when you confirm the delivery was successful. If anything goes wrong, you get a full refund.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-6 text-sm text-left mx-auto max-w-lg mb-10">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary-400" />
              <span className="text-white/80">Verified Student Runners</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary-400" />
              <span className="text-white/80">Live GPS Tracking</span>
            </div>
          </div>

          <Link href="/dashboard/errands/new" className="w-full sm:w-auto btn-primary py-4 px-10 text-base font-bold inline-flex items-center justify-center">
            Post an Errand Now
          </Link>
        </div>
      </main>
    </div>
  );
}
