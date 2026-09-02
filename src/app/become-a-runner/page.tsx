import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Bike, Clock, DollarSign, CheckCircle2, ArrowRight } from 'lucide-react';
import { RunnerLogo } from '@/components/RunnerLogo';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export default function BecomeARunnerPage() {
  return (
    <div className="min-h-screen bg-[#121824] relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary-500/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#121824]/80 backdrop-blur-xl border-b border-white/10">
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
            <Link href="/dashboard/runner/apply">
              <Button variant="primary" size="sm">
                Apply Now
              </Button>
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
            <Link href="/dashboard/runner/apply">
              <Button variant="primary" size="lg" className="w-full sm:w-auto font-bold flex items-center justify-center gap-2">
                Start Application <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-6 mb-20">
          <Card className="text-center p-2">
            <CardContent className="pt-6">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto mb-6">
                <DollarSign className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Great Earnings</h3>
              <p className="text-white/60 text-sm">You keep 80% of every base fee, plus 100% of tips. Payouts are fast and secure directly to your digital wallet.</p>
            </CardContent>
          </Card>
          
          <Card className="text-center p-2">
            <CardContent className="pt-6">
              <div className="w-14 h-14 bg-primary-500/10 rounded-2xl flex items-center justify-center text-primary-400 mx-auto mb-6">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Flexible Schedule</h3>
              <p className="text-white/60 text-sm">Go online or offline with a single tap. Work only when you have free blocks between lectures.</p>
            </CardContent>
          </Card>

          <Card className="text-center p-2">
            <CardContent className="pt-6">
              <div className="w-14 h-14 bg-accent-purple/10 rounded-2xl flex items-center justify-center text-accent-purple mx-auto mb-6">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Verified Community</h3>
              <p className="text-white/60 text-sm">You are serving verified students on your own campus. Safe, reliable, and mutually beneficial.</p>
            </CardContent>
          </Card>
        </div>

        {/* Requirements Section */}
        <Card className="max-w-3xl mx-auto p-2 sm:p-6">
          <CardContent className="pt-6 sm:pt-6">
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
              <Link href="/dashboard/runner/apply">
                <Button variant="primary" size="lg" className="px-8 font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-xl">
                  Start Earning Today
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
