'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { usePaystackPayment } from 'react-paystack';
import { formatCurrency } from '@/utils/pricing';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  Search,
  Utensils,
  Printer,
  Clock,
  Package,
  ArrowRight,
  Plus,
  MapPin,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Wallet,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function UserDashboardContent() {
  const { user } = useAppStore();
  const router = useRouter();
  const [userName, setUserName] = useState<string>(user?.fullName || '');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [activeErrands, setActiveErrands] = useState<any[]>([]);
  const [loadingErrands, setLoadingErrands] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState<number>(2000);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  // Sync user name from store and resolve from Supabase
  useEffect(() => {
    if (user?.fullName) {
      setUserName(user.fullName);
    }
  }, [user?.fullName]);

  useEffect(() => {
    const resolveUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', authUser.id)
            .maybeSingle();

          const resolved =
            profile?.full_name ||
            authUser.user_metadata?.full_name ||
            authUser.user_metadata?.name ||
            authUser.email?.split('@')[0] ||
            '';

          if (resolved) setUserName(resolved);
        }
      } catch (err) {
        console.error('Failed to resolve user name:', err);
      }
    };

    resolveUser();
  }, []);

  // Fetch Wallet & Active Errands
  useEffect(() => {
    if (!user?.id) return;

    const loadData = async () => {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      if (wallet) setWalletBalance(Number(wallet.balance));

      const { data: errands } = await supabase
        .from('errands')
        .select('*')
        .eq('requester_id', user.id)
        .in('status', ['unassigned', 'assigned', 'in_progress'])
        .order('created_at', { ascending: false });

      setActiveErrands(errands || []);
      setLoadingErrands(false);
    };

    loadData();

    const sub = supabase
      .channel(`user_dashboard_errands_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'errands', filter: `requester_id.eq.${user.id}` },
        () => loadData()
      )
      .subscribe();

    return () => {
      sub.unsubscribe();
    };
  }, [user]);

  // Paystack Integration
  const config = {
    reference: (new Date()).getTime().toString(),
    email: user?.email || 'user@example.com',
    amount: topUpAmount * 100,
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
  };

  const initializePayment = usePaystackPayment(config);

  const handlePaystackSuccess = (reference: any) => {
    toast.loading('Verifying deposit...', { id: 'topup' });
    fetch('/api/wallet/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: reference.reference, userId: user?.id })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setWalletBalance(data.balance);
          toast.success('Wallet topped up successfully!', { id: 'topup' });
          setIsTopUpOpen(false);
        } else {
          toast.error(data.error || 'Verification failed', { id: 'topup' });
        }
      })
      .catch(() => toast.error('Error verifying payment', { id: 'topup' }));
  };

  const handlePaystackClose = () => {
    toast.error('Payment cancelled');
  };

  // 4 Primary Uber/Deliveroo categories
  const categories = [
    {
      id: 'food_delivery',
      title: 'Food & Meals',
      desc: 'Cafeteria food delivered to you',
      icon: Utensils,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      id: 'academic',
      title: 'Print & Handouts',
      desc: 'Photocopy, binding & submissions',
      icon: Printer,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      id: 'campus_errand',
      title: 'Queue Stand-in',
      desc: 'Bank, bursary & fee lines',
      icon: Clock,
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
    {
      id: 'personal',
      title: 'Package Delivery',
      desc: 'Hostel drops & urgent pickups',
      icon: Package,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
  ];

  const primaryActiveErrand = activeErrands.find(
    (e) => e.status === 'assigned' || e.status === 'in_progress'
  ) || activeErrands[0];

  return (
    <div className="py-6 sm:py-8 space-y-7 animate-fadeIn">

      {/* ── TOP GREETING & UBER-STYLE INTENT SEARCH BAR ── */}
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Hello, {userName || user?.fullName || 'there'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            What can our student runners handle for you today?
          </p>
        </div>

        {/* Uber-style "Where to?" action banner */}
        <div
          onClick={() => router.push('/dashboard/errands/new')}
          className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-md hover:shadow-lg transition-all cursor-pointer group flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Search className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white block group-hover:text-blue-600 transition-colors truncate">
                Where should we pick up or deliver?
              </span>
              <span className="text-xs text-slate-400 block truncate">
                Cafeteria, Library, Engineering, Town Gate, Hostels…
              </span>
            </div>
          </div>
          <div className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-sm">
            <span>Request</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </section>

      {/* ── 4 FAST CATEGORY PILLS (Deliveroo / Uber Eats Style) ── */}
      <section className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.id}
                onClick={() => router.push(`/dashboard/errands/new?category=${cat.id}`)}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-3"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    {cat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FLOATING ACTIVE RIDE / ERRAND CARD (Uber Trip Card) ── */}
      {primaryActiveErrand && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-5 sm:p-6 text-white shadow-xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-200">
                {primaryActiveErrand.status === 'in_progress'
                  ? 'Runner Moving ➔ In Progress'
                  : primaryActiveErrand.status === 'assigned'
                  ? 'Runner Heading to Pickup'
                  : 'Searching for Campus Runner…'}
              </span>
            </div>
            <span className="text-xs font-black font-mono bg-white/20 px-2.5 py-1 rounded-full">
              {formatCurrency(primaryActiveErrand.total_fee)}
            </span>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-black">{primaryActiveErrand.title}</h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-blue-100 mt-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                From: {primaryActiveErrand.pickup_location}
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-300" />
                To: {primaryActiveErrand.delivery_location}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/20 flex items-center justify-between gap-3">
            {primaryActiveErrand.delivery_pin ? (
              <div className="text-xs">
                <span className="text-blue-200 block text-[10px] uppercase font-bold">Delivery PIN</span>
                <span className="font-mono font-black text-base text-white tracking-widest">
                  {primaryActiveErrand.delivery_pin}
                </span>
              </div>
            ) : (
              <span className="text-xs text-blue-200">Escrow Secured by ErrandRun</span>
            )}

            <Link
              href={`/dashboard/user/errand/${primaryActiveErrand.id}`}
              className="bg-white text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all shrink-0"
            >
              Track Live Map <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.section>
      )}

      {/* ── WALLET BALANCE & RECENT ACTIVITY SECTION ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        
        {/* Sleek Minimal Wallet Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Wallet Balance
            </span>
            <Wallet className="w-4 h-4 text-slate-400" />
          </div>

          <p className="text-3xl font-black text-slate-900 dark:text-white font-mono">
            {formatCurrency(walletBalance)}
          </p>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsTopUpOpen(true)}
            className="w-full text-xs font-bold border-slate-300 dark:border-slate-700 h-10 gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Cash with Paystack
          </Button>
        </div>

        {/* Recent Activity / Errands Roster */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Recent Errands</h3>
            <Link href="/dashboard/errands" className="text-xs font-bold text-blue-600 hover:underline">
              View All
            </Link>
          </div>

          {activeErrands.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <Package className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500">No active errands right now.</p>
              <Button
                size="sm"
                variant="primary"
                onClick={() => router.push('/dashboard/errands/new')}
                className="text-xs font-bold"
              >
                Request Errand
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeErrands.slice(0, 3).map((errand) => (
                <div
                  key={errand.id}
                  onClick={() => router.push(`/dashboard/user/errand/${errand.id}`)}
                  className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {errand.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {errand.pickup_location} ➔ {errand.delivery_location}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {formatCurrency(errand.total_fee)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── TOP-UP PAYSTACK MODAL ── */}
      {isTopUpOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Top Up Wallet</h3>
              <button onClick={() => setIsTopUpOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add funds securely to pay campus runners instantly via escrow.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Amount (₦)</label>
              <input
                type="number"
                min="500"
                step="500"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(Number(e.target.value))}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div className="flex gap-2">
              {[1000, 2000, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTopUpAmount(amt)}
                  className="flex-1 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600"
                >
                  ₦{amt.toLocaleString()}
                </button>
              ))}
            </div>

            <Button
              onClick={() => initializePayment(handlePaystackSuccess, handlePaystackClose)}
              className="w-full font-bold text-xs sm:text-sm h-12 shadow-md"
            >
              Pay ₦{topUpAmount.toLocaleString()} with Paystack
            </Button>
          </motion.div>
        </div>
      )}

    </div>
  );
}
