'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { authFetch } from '@/lib/apiClient';
import { useAppStore } from '@/lib/store';
import { usePaystackPayment } from 'react-paystack';
import { formatCurrency } from '@/utils/pricing';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  Search,
  Utensils,
  Printer,
  Users,
  Package,
  MoreHorizontal,
  ArrowRight,
  Plus,
  ShieldCheck,
  ChevronRight,
  Wallet,
  X,
  MapPin,
  Eye,
  EyeOff
} from 'lucide-react';

export default function UserDashboardContent() {
  const { user, hideBalance, setHideBalance } = useAppStore();
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
        console.warn('Failed to resolve user name:', err);
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
    // Provide a fallback dummy key so react-paystack doesn't crash the entire dashboard on mount
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_dummy1234567890',
  };

  const initializePayment = usePaystackPayment(config);

  const handlePaystackSuccess = (reference: any) => {
    toast.loading('Verifying deposit...', { id: 'topup' });
    authFetch('/api/wallet/verify', {
      method: 'POST',
      body: JSON.stringify({ reference: reference.reference })
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

  const categories = [
    {
      id: 'food_delivery',
      title: 'Food & Meals',
      desc: 'Cafeteria delivery',
      icon: Utensils,
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      textCol: 'text-yellow-600 dark:text-yellow-500',
    },
    {
      id: 'academic',
      title: 'Print & Handouts',
      desc: 'Photocopy & binding',
      icon: Printer,
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      textCol: 'text-purple-600 dark:text-purple-400',
    },
    {
      id: 'campus_errand',
      title: 'Queue Stand-in',
      desc: 'Bank, bursary lines',
      icon: Users,
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      textCol: 'text-blue-600 dark:text-blue-400',
    },
    {
      id: 'personal',
      title: 'Package Delivery',
      desc: 'Hostel drops & urgent',
      icon: Package,
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      textCol: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'other',
      title: 'Other',
      desc: 'Custom errands',
      icon: MoreHorizontal,
      bg: 'bg-slate-100 dark:bg-slate-800',
      textCol: 'text-slate-600 dark:text-slate-400',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold rounded-md uppercase tracking-wide">ASSIGNED</span>;
      case 'in_progress':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] font-bold rounded-md uppercase tracking-wide">IN PROGRESS</span>;
      case 'unassigned':
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-[10px] font-bold rounded-md uppercase tracking-wide">PENDING</span>;
      case 'completed':
        return <span className="px-2 py-1 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-bold rounded-md uppercase tracking-wide">COMPLETED</span>;
      default:
        return <span className="px-2 py-1 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-bold rounded-md uppercase tracking-wide">{status}</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 animate-fadeIn max-w-7xl mx-auto">
      
      {/* GREETING */}
      <section>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Hello, {(userName || user?.fullName || 'there').split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          What can our student runners handle for you today?
        </p>
      </section>

      {/* SEARCH BAR CARD */}
      <section>
        <div 
          onClick={() => router.push('/dashboard/errands/new')}
          className="bg-white dark:bg-[#111827] rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow group gap-3"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Search className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 shrink-0 ml-1" />
            <div className="flex flex-col flex-1 min-w-0 justify-center">
              <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-tight">
                Where should we pick up or deliver?
              </span>
              <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Cafeteria, Library, Engineering...
              </span>
            </div>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-6 py-2.5 md:py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shrink-0 transition-colors">
            <span className="hidden md:inline">Request</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* WALLET & PROMO GRID */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Wallet Card */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Wallet Balance</p>
              <button onClick={() => setHideBalance(!hideBalance)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                {hideBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 font-mono">
              {hideBalance ? '****' : formatCurrency(walletBalance)}
            </h2>
            <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">Available Balance</p>
          </div>
          <div className="mt-6 space-y-3">
            <button 
              onClick={() => setIsTopUpOpen(true)}
              className="w-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Cash
            </button>
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4" /> Secure checkout with Paystack
            </div>
          </div>
        </div>

        {/* Promo Card */}
        <div className="bg-gradient-to-br from-blue-700 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden flex flex-col justify-between shadow-sm">
          <div className="relative z-10 max-w-[200px] sm:max-w-[250px]">
            <h2 className="text-xl sm:text-2xl font-black leading-tight mb-3">
              Need something done? Let our trusted student runners handle it for you.
            </h2>
            <button 
              onClick={() => router.push('/dashboard/errands/new')}
              className="bg-white text-blue-700 hover:bg-slate-50 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors"
            >
              Request Errand
            </button>
          </div>
          {/* Abstract background graphics/icon */}
          <div className="absolute right-[-20px] bottom-[-20px] opacity-80 z-0">
            <div className="w-40 h-40 bg-blue-500/20 rounded-full blur-2xl absolute"></div>
            <Package className="w-48 h-48 text-white/10 drop-shadow-lg transform rotate-12" />
          </div>
        </div>
      </section>

      {/* CATEGORIES GRID */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.id}
                onClick={() => router.push(`/dashboard/errands/new?category=${cat.id}`)}
                className="bg-white dark:bg-[#111827] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 shadow-sm transition-all cursor-pointer flex flex-col items-start gap-3 group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.bg} ${cat.textCol} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {cat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      

      

      {/* RECENT ERRANDS TABLE */}
      <section className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Recent Errands</h3>
        </div>
        
        <div className="overflow-x-auto">
          {activeErrands.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
              No recent errands found.
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <tbody>
                {activeErrands.slice(0, 5).map((errand) => (
                  <tr key={errand.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="py-4 pl-5 sm:pl-6 w-16">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Package className="w-5 h-5" />
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{errand.title}</p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[150px] sm:max-w-[200px]">{errand.pickup_location}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="truncate max-w-[150px] sm:max-w-[200px]">{errand.delivery_location}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {getStatusBadge(errand.status)}
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-sm text-slate-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(errand.total_fee)}
                    </td>
                    <td className="py-4 pr-5 sm:pr-6 text-right whitespace-nowrap">
                      <button 
                        onClick={() => router.push(`/dashboard/user/errand/${errand.id}`)}
                        className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        Track
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/20 text-center border-t border-slate-100 dark:border-slate-800">
          <Link href="/dashboard/errands" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">
            View all errands <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* TOP-UP PAYSTACK MODAL */}
      {isTopUpOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-[#111827] rounded-3xl max-w-sm w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Top Up Wallet</h3>
              <button onClick={() => setIsTopUpOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Add funds securely to pay campus runners instantly via escrow.
            </p>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Amount (₦)</label>
              <input
                type="number"
                min="500"
                step="500"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(Number(e.target.value))}
                className="w-full h-10 sm:h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono transition-all"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[1000, 2000, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTopUpAmount(amt)}
                  className={`py-1.5 sm:py-2 rounded-xl text-[13px] sm:text-sm font-bold transition-colors ${
                    topUpAmount === amt 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  ₦{amt.toLocaleString()}
                </button>
              ))}
            </div>

            <button
              onClick={() => initializePayment(handlePaystackSuccess, handlePaystackClose)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm h-11 sm:h-12 rounded-xl shadow-sm transition-colors"
            >
              Pay ₦{topUpAmount.toLocaleString()} with Paystack
            </button>
          </motion.div>
        </div>
      )}

    </div>
  );
}
