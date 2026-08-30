import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Bike, Clock, DollarSign, CheckCircle2, ArrowRight } from 'lucide-react';

export default function BecomeARunnerPage() {
  return (
    <div className="min-h-screen bg-dark-base relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary-500/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-dark-base/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <Link href="/" className="text-2xl font-black text-gradient">
            ⚡ ErrandRun
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-white/70 hover:text-white hidden sm:block">
              Sign In
            </Link>
            <Link href="/signup?role=runner" className="btn-success text-sm py-2 px-5">
              Apply Now
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-24 px-4 sm:px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 mb-6">
            <Bike className="w-4 h-4" />
            <span>Runner Program</span>
          </div>
          <h1 className="heading-hero font-black text-white mb-6">
            Turn your free time between classes into <span className="text-emerald-400">cash.</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/60 mb-10 max-w-2xl mx-auto">
            Join the ErrandRun verified network. Help your peers get things done, set your own schedule, and keep 80% of every task fee.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup?role=runner" className="w-full sm:w-auto btn-success py-4 px-8 text-base font-bold flex items-center justify-center gap-2">
              Start Application <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-6 mb-20">
          <div className="glass-card p-8 rounded-3xl text-center">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto mb-6">
              <DollarSign className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Great Earnings</h3>
            <p className="text-white/60 text-sm">You keep 80% of every base fee, plus 100% of tips. Payouts are fast and secure directly to your digital wallet.</p>
          </div>
          
          <div className="glass-card p-8 rounded-3xl text-center">
            <div className="w-14 h-14 bg-primary-500/10 rounded-2xl flex items-center justify-center text-primary-400 mx-auto mb-6">
              <Clock className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Flexible Schedule</h3>
            <p className="text-white/60 text-sm">Go online or offline with a single tap. Work only when you have free blocks between lectures.</p>
          </div>

          <div className="glass-card p-8 rounded-3xl text-center">
            <div className="w-14 h-14 bg-accent-purple/10 rounded-2xl flex items-center justify-center text-accent-purple mx-auto mb-6">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Verified Community</h3>
            <p className="text-white/60 text-sm">You are serving verified students on your own campus. Safe, reliable, and mutually beneficial.</p>
          </div>
        </div>

        {/* Requirements Section */}
        <div className="max-w-3xl mx-auto glass-card rounded-3xl p-8 sm:p-12 border border-white/10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 text-center">Application Requirements</h2>
          <div className="space-y-4">
            {[
              'Must be an actively enrolled student at the university.',
              'Valid University ID card (matriculation number required).',
              'A smartphone with active GPS capabilities.',
              'A local bank account for withdrawals via Paystack.',
              'Pass our quick digital onboarding and orientation.'
            ].map((req, idx) => (
              <div key={idx} className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                <p className="text-white/80">{req}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-10 text-center">
            <Link href="/signup?role=runner" className="w-full sm:w-auto btn-success py-4 px-10 text-base font-bold inline-flex items-center justify-center">
              Apply to be a Runner
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
