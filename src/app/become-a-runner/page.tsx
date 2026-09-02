import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Bike, Clock, DollarSign, CheckCircle2, ArrowRight } from 'lucide-react';
import { RunnerLogo } from '@/components/RunnerLogo';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function BecomeARunnerPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <RunnerLogo className="w-8 h-8" animate={false} />
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              Errand<span className="text-blue-600">Run</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 hidden sm:block">
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

      <main className="pt-28 pb-20 px-4 sm:px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <Badge variant="success" className="mb-4 px-3 py-1 gap-1.5 inline-flex items-center">
            <Bike className="w-4 h-4" />
            <span>Runner Program</span>
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4 tracking-tight">
            Turn your free time between classes into <span className="text-green-600">cash.</span>
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
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
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-6 mb-16">
          <Card className="text-center p-2">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 mx-auto mb-4">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Great Earnings</h3>
              <p className="text-slate-600 text-sm">You keep 80% of every base fee, plus 100% of tips. Payouts are fast and secure directly to your digital wallet.</p>
            </CardContent>
          </Card>
          
          <Card className="text-center p-2">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mx-auto mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Flexible Schedule</h3>
              <p className="text-slate-600 text-sm">Go online or offline with a single tap. Work only when you have free blocks between lectures.</p>
            </CardContent>
          </Card>

          <Card className="text-center p-2">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mx-auto mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Verified Community</h3>
              <p className="text-slate-600 text-sm">You are serving verified students on your own campus. Safe, reliable, and mutually beneficial.</p>
            </CardContent>
          </Card>
        </div>

        {/* Requirements Section */}
        <Card className="max-w-3xl mx-auto p-4 sm:p-6">
          <CardContent className="pt-4">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Application Requirements</h2>
            <div className="space-y-3">
              {[
                'Must be an actively enrolled student at the university.',
                'Valid University ID card (matriculation number required).',
                'A smartphone with active GPS capabilities.',
                'A local bank account for withdrawals via Paystack.',
                'Pass our quick digital onboarding and orientation.'
              ].map((req, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 text-sm">{req}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-8 text-center">
              <Link href="/dashboard/runner/apply">
                <Button variant="primary" size="lg" className="px-8 font-bold">
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
