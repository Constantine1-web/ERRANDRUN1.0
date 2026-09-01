'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabaseClient';
import { usePaystackPayment } from 'react-paystack';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/pricing';
import { 
  Plus, 
  MapPin, 
  Utensils, 
  Printer, 
  Users, 
  Package, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function UserDashboard() {
  const { user } = useAppStore();
  const router = useRouter();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(1000);

  useEffect(() => {
    if (user?.id) {
      supabase.from('wallets').select('balance').eq('user_id', user.id).single()
        .then(({data}) => {
          if (data) setWalletBalance(Number(data.balance));
        });
    }
  }, [user]);

  const config = {
    reference: (new Date()).getTime().toString(),
    email: user?.email || 'user@example.com',
    amount: topUpAmount * 100, // in kobo
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
  };

  const initializePayment = usePaystackPayment(config);

  const onSuccess = (reference: any) => {
    toast.loading('Verifying payment...', { id: 'verify' });
    fetch('/api/wallet/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: reference.reference, userId: user?.id })
    }).then(res => res.json()).then(data => {
      if (data.success) {
        setWalletBalance(data.balance);
        toast.success('Wallet credited successfully!', { id: 'verify' });
        setIsToppingUp(false);
      } else {
        toast.error(data.error || 'Verification failed', { id: 'verify' });
      }
    }).catch(err => toast.error('Error verifying payment', { id: 'verify' }));
  };

  const onClose = () => {
    toast.error('Payment cancelled');
  };

  const categories = [
    { id: 'food', label: 'Food', icon: Utensils, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { id: 'print', label: 'Print', icon: Printer, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { id: 'queue', label: 'Queues', icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { id: 'parcel', label: 'Parcels', icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  const quickTasks = [
    {
      id: 1,
      title: 'Cafeteria Run',
      desc: 'Hot meal delivery',
      price: '₦800',
      icon: Utensils,
      color: 'bg-orange-500',
      category: 'food'
    },
    {
      id: 2,
      title: 'Clearance Queue',
      desc: 'Admin block standing',
      price: '₦1500',
      icon: Users,
      color: 'bg-purple-500',
      category: 'academic'
    },
    {
      id: 3,
      title: 'Collect Handout',
      desc: 'Photocopy & deliver',
      price: '₦600',
      icon: Printer,
      color: 'bg-blue-500',
      category: 'academic'
    }
  ];

  return (
    <div className="max-w-[500px] mx-auto md:max-w-6xl px-4 py-4 md:py-8 space-y-6 md:space-y-8">
      
      {/* 1. Location Selector (App Style) */}
      <div className="flex items-center gap-2 mb-6 md:mb-8">
        <MapPin className="w-5 h-5 text-brand-blue" />
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold">Current Campus</p>
          <button className="text-sm font-bold text-white flex items-center gap-1 hover:text-brand-blue transition-colors">
            University of Uyo, Akwa Ibom <span className="text-xs">▼</span>
          </button>
        </div>
      </div>

            {/* Wallet Summary Card */}
      <div className="w-full rounded-3xl p-6 bg-slate-900/60 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-white/50 uppercase tracking-wider font-bold mb-1">Wallet Balance</p>
          <h2 className="text-3xl font-black text-emerald-400 font-mono">{formatCurrency(walletBalance)}</h2>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {isToppingUp ? (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <input 
                type="number" 
                min="1000" 
                value={topUpAmount} 
                onChange={(e) => setTopUpAmount(Number(e.target.value))} 
                className="input w-full md:w-32 py-2.5 text-sm"
                placeholder="Min 1000"
              />
              <button 
                onClick={() => {
                  if (topUpAmount < 1000) return toast.error('Minimum top-up is N1000');
                  initializePayment(onSuccess as any, onClose as any);
                }} 
                className="btn-primary py-2.5 px-6 whitespace-nowrap"
              >
                Pay via Paystack
              </button>
              <button onClick={() => setIsToppingUp(false)} className="p-2.5 rounded-xl bg-white/10 text-white/50 hover:text-white">
                ?
              </button>
            </div>
          ) : (
            <button onClick={() => setIsToppingUp(true)} className="btn-primary py-2.5 px-8 w-full md:w-auto">
              Top Up Wallet
            </button>
          )}
        </div>
      </div>


      {/* 2. Vibrant Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full rounded-3xl p-6 md:p-8 relative overflow-hidden bg-gradient-to-br from-primary-600 to-accent-purple shadow-xl shadow-primary-500/20"
      >
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-black/20 rounded-full blur-xl" />
        
        <div className="relative z-10 flex flex-col items-start w-full">
          <span className="px-3 py-1 bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider rounded-full backdrop-blur-md mb-4">
            Priority Errand
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-2 leading-tight">
            DELEGATE <br/> YOUR TASKS
          </h2>
          <p className="text-white/80 text-sm mb-6 max-w-[200px] md:max-w-xs">
            Verified student runners ready in minutes.
          </p>
          
          <button
            onClick={() => {
              if (user?.verificationStatus !== 'verified') {
                router.push('/dashboard/verify');
              } else {
                router.push('/dashboard/errands/new');
              }
            }}
            className="bg-white text-primary-600 px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:scale-105 transition-transform active:scale-95 shadow-lg"
          >
            Draft Errand <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* 3. Category Row */}
      <div className="space-y-3">
        <div className="flex overflow-x-auto scrollbar-none gap-4 pb-2 -mx-4 px-4 md:mx-0 md:px-0">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  if (user?.verificationStatus !== 'verified') {
                    router.push('/dashboard/verify');
                  } else {
                    router.push(`/dashboard/errands/new?category=${cat.id}`);
                  }
                }}
                className="flex flex-col items-center gap-2 flex-shrink-0 group"
              >
                <div className={`w-16 h-16 rounded-full ${cat.bg} border border-white/5 flex items-center justify-center transition-transform group-hover:scale-110 active:scale-95`}>
                  <Icon className={`w-7 h-7 ${cat.color}`} />
                </div>
                <span className="text-[11px] font-bold text-white/70 group-hover:text-white transition-colors">
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Quick Tasks (Like "Popular Items") */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Quick Tasks</h3>
          <Link href="/dashboard/errands/new" className="text-xs font-bold text-primary-400 hover:text-primary-300">
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {quickTasks.map((task) => {
            const Icon = task.icon;
            return (
              <div key={task.id} className="glass-card rounded-2xl p-4 flex flex-col h-full border border-white/5 relative group hover:border-white/10 transition-colors">
                <div className={`w-10 h-10 rounded-xl ${task.color} bg-opacity-20 flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 text-white`} />
                </div>
                <h4 className="font-bold text-white text-sm leading-tight mb-1">{task.title}</h4>
                <p className="text-[10px] text-white/50 mb-4">{task.desc}</p>
                
                <div className="mt-auto flex items-center justify-between">
                  <span className="font-mono font-bold text-emerald-400 text-xs">{task.price}</span>
                  <button 
                    onClick={() => {
                      if (user?.verificationStatus !== 'verified') {
                        router.push('/dashboard/verify');
                      } else {
                        router.push(`/dashboard/errands/new?category=${task.category}`);
                      }
                    }}
                    className={`w-7 h-7 rounded-full ${task.color} flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform shadow-lg shadow-black/20`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Rewards / Runner Banner */}
      {user?.role !== 'runner' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-4 flex items-center gap-4 border border-white/5 relative overflow-hidden mt-6 mb-8 md:mb-0"
        >
          <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
          
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
          </div>
          
          <div className="flex-1 min-w-0 z-10">
            <h4 className="font-bold text-white text-sm mb-0.5">Runner Rewards</h4>
            <p className="text-[10px] text-white/50 leading-tight">Apply to be a runner and earn up to 80% per task!</p>
          </div>
          
          <Link href="/become-a-runner" className="shrink-0 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors z-10">
            Join Now
          </Link>
        </motion.div>
      )}

      {/* Bottom spacer for mobile scroll */}
      <div className="h-6 md:hidden" />
    </div>
  );
}

