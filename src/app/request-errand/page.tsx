import React from 'react';
import Link from 'next/link';
import { ShieldCheck, MapPin, FastForward, CheckCircle2, ArrowRight } from 'lucide-react';
import { RunnerLogo } from '@/components/RunnerLogo';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function RequestErrandPage() {
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
            <Link href="/dashboard/errands/new">
              <Button variant="primary" size="sm">
                Post Errand
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-20 px-4 sm:px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <Badge variant="info" className="mb-4 px-3 py-1 gap-1.5 inline-flex items-center">
            <FastForward className="w-4 h-4" />
            <span>On-Demand Logistics</span>
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4 tracking-tight">
            Don't have time? <br />
            <span className="text-blue-600">Delegate it.</span>
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            From cafeteria food runs to standing in clearance queues. Get matched with a verified student runner in seconds and track everything live.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard/errands/new">
              <Button variant="primary" size="lg" className="w-full sm:w-auto font-bold flex items-center justify-center gap-2">
                Draft Your Errand <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Popular Categories Grid */}
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {[
            { title: 'Food Delivery', desc: 'Cafeteria or local campus spots.' },
            { title: 'Queue Standing', desc: 'Bursary, clearance, or admin.' },
            { title: 'Parcel Pickups', desc: 'Post office or gate collections.' },
            { title: 'Printing & Handouts', desc: 'Course materials delivered.' }
          ].map((cat, idx) => (
            <Card key={idx} className="hover:border-blue-300 transition-colors">
              <CardContent className="p-5">
                <h3 className="font-bold text-slate-900 mb-1">{cat.title}</h3>
                <p className="text-slate-500 text-sm">{cat.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Section */}
        <Card className="max-w-4xl mx-auto text-center">
          <CardContent className="p-8 sm:p-12">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">100% Safe & Guaranteed</h2>
            <p className="text-slate-600 mb-6 max-w-xl mx-auto text-sm sm:text-base">
              Your payment is held securely in <strong>Paystack Escrow</strong>. The runner only gets paid when you confirm the delivery was successful. If anything goes wrong, you get a full refund.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-6 text-sm text-left mx-auto max-w-lg mb-8">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-slate-700 font-medium">Verified Student Runners</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span className="text-slate-700 font-medium">Live GPS Tracking</span>
              </div>
            </div>

            <Link href="/dashboard/errands/new">
              <Button variant="primary" size="lg" className="w-full sm:w-auto px-10 font-bold inline-flex items-center justify-center">
                Post an Errand Now
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
