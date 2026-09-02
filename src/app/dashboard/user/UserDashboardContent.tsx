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
  TrendingUp,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

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
    { id: 'food', label: 'Food', icon: Utensils, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'print', label: 'Print', icon: Printer, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'queue', label: 'Queues', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'parcel', label: 'Parcels', icon: Package, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  const quickTasks = [
    {
      id: 1,
      title: 'Cafeteria Run',
      desc: 'Hot meal delivery from campus spots',
      price: '₦800',
      icon: Utensils,
      color: 'text-orange-600 bg-orange-50',
      category: 'food',
      status: 'pending'
    },
    {
      id: 2,
      title: 'Clearance Queue',
      desc: 'Admin block standing',
      price: '₦1,500',
      icon: Users,
      color: 'text-purple-600 bg-purple-50',
      category: 'academic',
      status: 'in-progress'
    },
    {
      id: 3,
      title: 'Collect Handout',
      desc: 'Photocopy & deliver to faculty',
      price: '₦600',
      icon: Printer,
      color: 'text-blue-600 bg-blue-50',
      category: 'academic',
      status: 'completed'
    }
  ];

  const getStatusVariant = (status: string) => {
    switch(status) {
      case 'pending': return 'warning';
      case 'in-progress': return 'info';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-6">
      
      {/* 1. Location Selector */}
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-blue-600" />
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Current Campus</p>
          <button className="text-sm font-bold text-slate-800 flex items-center gap-1 hover:text-blue-600 transition-colors">
            University of Uyo, Akwa Ibom <span className="text-xs text-slate-400">▼</span>
          </button>
        </div>
      </div>

      {/* 2. Welcoming Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full rounded-2xl p-6 md:p-8 relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
      >
        <div className="relative z-10 flex flex-col items-start w-full">
          <Badge variant="outline" className="mb-3 text-[11px] uppercase tracking-wider bg-white/10 text-white border-white/20">
            Peer-to-Peer Delivery
          </Badge>
          <h2 className="text-2xl md:text-3xl font-black mb-2 leading-tight">
            Good morning, {user?.fullName?.split(' ')[0] || 'Student'} 👋
          </h2>
          <p className="text-blue-100 text-sm mb-6 max-w-md">
            What do you need done around campus today? Verified student runners are ready in minutes.
          </p>
          
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                if (user?.verificationStatus !== 'verified') {
                  router.push('/dashboard/verify');
                } else {
                  router.push('/dashboard/errands/new');
                }
              }}
              variant="secondary"
              className="bg-white text-slate-900 hover:bg-slate-100 border-none font-bold text-sm shadow-sm"
            >
              Request an Errand <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <Button
              onClick={() => router.push('/dashboard/runner')}
              variant="outline"
              className="text-white border-white/30 hover:bg-white/10 font-medium text-sm"
            >
              <Zap className="w-4 h-4 mr-1.5" /> Run Errands & Earn
            </Button>
          </div>
        </div>
      </motion.div>

      {/* 3. Wallet Summary Card */}
      <Card>
        <CardContent className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Wallet Balance</p>
            <h2 className="text-3xl font-black text-green-600 font-mono">{formatCurrency(walletBalance)}</h2>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            {isToppingUp ? (
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                <Input 
                  type="number" 
                  min="1000" 
                  value={topUpAmount} 
                  onChange={(e) => setTopUpAmount(Number(e.target.value))} 
                  className="w-full sm:w-32"
                  placeholder="Min 1000"
                />
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    onClick={() => {
                      if (topUpAmount < 1000) return toast.error('Minimum top-up is ₦1,000');
                      initializePayment(onSuccess as any, onClose as any);
                    }} 
                    variant="primary"
                    className="whitespace-nowrap flex-1"
                  >
                    Pay via Paystack
                  </Button>
                  <Button variant="ghost" onClick={() => setIsToppingUp(false)} className="shrink-0 text-slate-400 hover:text-slate-600">
                    ✕
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="primary" onClick={() => setIsToppingUp(true)} className="w-full md:w-auto">
                <Plus className="w-4 h-4 mr-1.5" /> Top Up Wallet
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Category Launch Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Quick Categories</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                className="flex items-center gap-3 p-3.5 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all text-left group"
              >
                <div className={`w-10 h-10 rounded-lg ${cat.bg} flex items-center justify-center ${cat.color} shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800 block group-hover:text-blue-600 transition-colors">
                    {cat.label}
                  </span>
                  <span className="text-[11px] text-slate-400">On demand</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Active / Quick Tasks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Active & Sample Tasks</h3>
          <Link href="/dashboard/errands" className="text-xs font-bold text-blue-600 hover:text-blue-700">
            View All Errands →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {quickTasks.map((task) => {
            const Icon = task.icon;
            return (
              <Card key={task.id} className="p-4 flex flex-col h-full hover:border-blue-200 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg ${task.color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <Badge variant={getStatusVariant(task.status) as any}>{task.status}</Badge>
                </div>
                <h4 className="font-bold text-slate-900 text-sm leading-tight mb-1">{task.title}</h4>
                <p className="text-xs text-slate-500 mb-4">{task.desc}</p>
                
                <div className="mt-auto flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="font-mono font-bold text-green-600 text-sm">{task.price}</span>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (user?.verificationStatus !== 'verified') {
                        router.push('/dashboard/verify');
                      } else {
                        router.push(`/dashboard/errands/new?category=${task.category}`);
                      }
                    }}
                    className="text-xs"
                  >
                    Request
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 6. Runner Rewards Banner */}
      {user?.role !== 'runner' && (
        <Card className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 border-green-200">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 text-green-700 rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 text-sm">Become a Campus Runner</h4>
              <p className="text-xs text-slate-600">Earn up to 80% on every completed delivery around your campus.</p>
            </div>
            
            <Button variant="primary" size="sm" className="bg-green-600 hover:bg-green-700 text-white shrink-0" onClick={() => router.push('/become-a-runner')}>
              Join Now
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
