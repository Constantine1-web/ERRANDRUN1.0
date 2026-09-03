import Link from 'next/link';
import { Radio, ArrowRight, ShieldCheck, DollarSign, Clock, Bike, CheckCircle2 } from 'lucide-react';
import { RunnerLogo } from '@/components/RunnerLogo';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function BecomeARunnerPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col antialiased">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <RunnerLogo className="w-8 h-8 text-blue-600" animate={false} />
            <span className="font-black text-slate-900 text-lg tracking-tight">ERRANDRUN</span>
          </Link>
          <div className="flex items-center gap-3 text-xs font-bold">
            <ThemeToggle variant="icon" />
            <Link href="/login" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">Sign In</Link>
            <Link href="/signup?role=runner" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl">
              Apply to Run
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            Campus Runner Network
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Earn 80% on Every Campus Delivery
          </h1>
          <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto">
            You already walk between faculties, hostels, and cafes every day. Turn that movement into fast cash with student-to-student protected escrows.
          </p>
          <div className="pt-2">
            <Link
              href="/signup?role=runner"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-7 py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all"
            >
              Start Earning Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* 3 Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              ₦
            </div>
            <h3 className="font-bold text-base text-slate-900">Guaranteed 80% Cut</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              No hidden deductions. Payouts are held in secure escrow and released straight to your balance when the customer enters their PIN.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Total Schedule Freedom</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Toggle On-Duty when leaving lecture halls; toggle Off-Duty when studying in the library. Accept only tasks that fit your path.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Protected Transactions</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every customer must pre-fund their errand before you accept. No fake requests, no chasing people for unpaid delivery money.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
