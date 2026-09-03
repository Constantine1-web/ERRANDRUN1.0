import Link from 'next/link';
import { Compass, ArrowRight, ShieldCheck, Utensils, Printer, Users, Package } from 'lucide-react';
import { RunnerLogo } from '@/components/RunnerLogo';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function RequestErrandPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-white flex flex-col antialiased transition-colors">
      {/* Header */}
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <RunnerLogo className="w-8 h-8 text-blue-600 dark:text-blue-400" animate={false} />
            <span className="font-black text-slate-900 dark:text-white text-lg tracking-tight">ERRANDRUN</span>
          </Link>
          <div className="flex items-center gap-3 text-xs font-bold">
            <ThemeToggle variant="icon" />
            <Link href="/login" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">Sign In</Link>
            <Link href="/signup?role=user" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            Campus Task Delegation
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Stop Standing in Lines. Delegate Today.
          </h1>
          <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto">
            From cafeteria food to faculty photocopies, verified student runners are already moving in your direction. Post an errand and have it delivered to your desk or room.
          </p>
          <div className="pt-2">
            <Link
              href="/signup?role=user"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-7 py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all"
            >
              Post Your First Errand <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Cafeteria & Hot Meals</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Save 40 minutes of queue time during peak lunch hours. Your runner stands in line and delivers to your faculty quad.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Printing & Academic Runs</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Need slides or past questions printed before a 10 AM class? Dispatch a runner to the business centre with 1 click.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Clearance & Admin Lines</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Avoid wasting entire study days standing outside student affairs or bursary desks. Hire a runner to hold your spot.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Gate & Dorm Logistics</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Too tired to walk all the way to campus main gate for a courier delivery? Runners will meet the driver and bring it to your hostel.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
