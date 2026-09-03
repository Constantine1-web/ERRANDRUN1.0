'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabaseClient';
import { usePaystackPayment } from 'react-paystack';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/pricing';
import {
  Utensils,
  Printer,
  Package,
  Users,
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  MapPin,
  Clock,
  Radio,
  ChevronRight,
  Wallet as WalletIcon
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function UserDashboardContent() {
  const { user } = useAppStore();
  const router = useRouter();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [activeErrands, setActiveErrands] = useState<any[]>([]);
  const [loadingErrands, setLoadingErrands] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState<number>(2000);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  // Fetch Wallet & Active Errands
  useEffect(() => {
    if (!user?.id) return;

    const loadData = async () => {
      // Wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      if (wallet) setWalletBalance(Number(wallet.balance));

      // Active errands
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

    // Subscribe to errands updates
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

  const intentCategories = [
    {
      id: 'food_delivery',
      title: 'Cafeteria & Meals',
      subtitle: 'Hot food brought to your faculty or dorm',
      icon: Utensils,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      badge: 'Popular',
    },
    {
      id: 'academic',
      title: 'Print & Handouts',
      subtitle: 'Photocopy, binding & department submissions',
      icon: Printer,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      badge: 'Academic',
    },
    {
      id: 'campus_errand',
      title: 'Queue Standing',
      subtitle: 'Admin block, bank or fee clearance queues',
      icon: Users,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      badge: 'Time-Saver',
    },
    {
      id: 'personal',
      title: 'Hostel & Parcels',
      subtitle: 'Luggage, pharmacy runs, gate pick-ups',
      icon: Package,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      badge: 'Fast Drop',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 md:py-8 space-y-6 animate-fadeIn">

      {/* ── TOP HERO COMMAND GREETING ── */}
      <section className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 md:p-8 border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-blue-50/70 -z-0 pointer-events-none blur-2xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                Request Mode Active
              </span>
              <span className="text-xs text-slate-400 font-semibold">• UniUyo Network</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Hello, {user?.fullName?.split(' ')[0] || 'Student'} 👋
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm max-w-xl">
              What do you need handled around campus today? Verified student runners are ready to dispatch in minutes.
            </p>
          </div>

          {/* Quick Balance + Primary Dispatch Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 px-3.5 flex items-center justify-between sm:justify-start gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  ₦
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Wallet</span>
                  <span className="text-base sm:text-lg font-black text-slate-900 font-mono leading-none">
                    {formatCurrency(walletBalance)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsTopUpOpen(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg ml-2"
              >
                + Top Up
              </button>
            </div>

            <Button
              size="lg"
              onClick={() => router.push('/dashboard/errands/new')}
              className="font-bold text-xs sm:text-sm shadow-md h-12"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Dispatch Errand
            </Button>
          </div>
        </div>
      </section>

      {/* ── FAST INTENT LAUNCHPAD (2x2 Grid on Mobile) ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight uppercase tracking-wider">
              Quick Intent Launchpad
            </h2>
            <p className="text-xs text-slate-500">Pick a mission category to prefill your request</p>
          </div>
          <Link
            href="/dashboard/errands/new"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
          >
            Custom Errand
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {intentCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.id}
                onClick={() => router.push(`/dashboard/errands/new?category=${cat.id}`)}
                className="bg-white hover:bg-blue-50/20 border border-slate-200/80 hover:border-blue-300 rounded-2xl p-3.5 sm:p-5 cursor-pointer transition-all hover:shadow-sm group flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border ${cat.color} group-hover:scale-105 transition-transform`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 hidden sm:inline">
                    {cat.badge}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-base group-hover:text-blue-600 transition-colors leading-tight">
                    {cat.title}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                    {cat.subtitle}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-blue-600">
                  <span>Start</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── ACTIVE ERRAND JOURNEY RADAR ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Active Errand Radar
            </h2>
            {activeErrands.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeErrands.length}
              </span>
            )}
          </div>
          <Link
            href="/dashboard/errands"
            className="text-xs font-bold text-slate-500 hover:text-slate-900"
          >
            View Chronicle
          </Link>
        </div>

        {loadingErrands ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400 animate-pulse">
            Scanning campus telemetry…
          </div>
        ) : activeErrands.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">No active errands on the radar</p>
              <p className="text-xs text-slate-500 mt-0.5">You don't have any tasks currently in progress.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push('/dashboard/errands/new')}
              className="font-bold text-xs"
            >
              Post your first errand
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {activeErrands.map((errand) => {
              const isAssigned = errand.status === 'assigned' || errand.status === 'in_progress';
              return (
                <div
                  key={errand.id}
                  onClick={() => router.push(`/dashboard/user/errand/${errand.id}`)}
                  className="bg-white hover:bg-slate-50/80 border border-slate-200/90 rounded-2xl p-5 cursor-pointer transition-all hover:border-blue-300 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={
                          errand.status === 'in_progress' ? 'info' :
                          errand.status === 'assigned' ? 'info' : 'warning'
                        }
                        className="text-[10px] font-black uppercase tracking-wider"
                      >
                        {errand.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-[11px] font-semibold text-slate-400 capitalize">
                        {errand.category.replace('_', ' ')}
                      </span>
                      {errand.priority === 'urgent' && (
                        <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-black uppercase">
                          Urgent
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      {errand.title}
                    </h3>

                    {/* Route Waypoint Strip */}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="font-medium truncate max-w-[200px]">{errand.pickup_location}</span>
                      <span className="text-slate-300">→</span>
                      <span className="font-medium truncate max-w-[200px]">{errand.delivery_location}</span>
                    </div>
                  </div>

                  {/* Pricing & Flight PIN preview */}
                  <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                    {errand.delivery_pin && (
                      <div className="text-left md:text-right">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Secret PIN</span>
                        <span className="font-mono text-base font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {errand.delivery_pin}
                        </span>
                      </div>
                    )}

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Escrow Fee</span>
                      <span className="font-mono text-lg font-black text-emerald-600">
                        {formatCurrency(errand.total_fee)}
                      </span>
                    </div>

                    <Button size="sm" variant="primary" className="font-bold text-xs">
                      Live Flight <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── ESCROW TRUST & CAMPUS ASSURANCE STRIP ── */}
      <section className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-3xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              100% Student-to-Student Escrow Protection
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              When you post an errand, your payment is securely locked in escrow. The runner only gets paid after you physically receive your goods and hand over your private 4-digit Delivery PIN.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/errands/new"
          className="bg-white hover:bg-slate-100 text-slate-900 px-5 py-2.5 rounded-xl font-bold text-xs shrink-0 transition-colors shadow-sm"
        >
          Post a Protected Errand
        </Link>
      </section>

      {/* ── TOP-UP WALLET MODAL ── */}
      {isTopUpOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  ₦
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Top Up Campus Wallet</h3>
                  <p className="text-[11px] text-slate-400">Funds secure in escrow for your errands</p>
                </div>
              </div>
              <button
                onClick={() => setIsTopUpOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Preset Amount</label>
              <div className="grid grid-cols-3 gap-2">
                {[1000, 2000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopUpAmount(amt)}
                    className={`py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
                      topUpAmount === amt
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ₦{amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Or Enter Custom Amount (₦)</label>
              <input
                type="number"
                min={100}
                step={100}
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(Number(e.target.value))}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 font-mono text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full font-bold"
              onClick={() => initializePayment({ onSuccess: handlePaystackSuccess, onClose: handlePaystackClose })}
            >
              Pay ₦{topUpAmount.toLocaleString()} via Paystack
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
