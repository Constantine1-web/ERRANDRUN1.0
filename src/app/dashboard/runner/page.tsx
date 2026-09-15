'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { authFetch } from '@/lib/apiClient';
import { useAppStore } from '@/lib/store';
import { RunnerGuard } from '@/components/guards/RunnerGuard';
import { formatCurrency } from '@/utils/pricing';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  Radio,
  Search,
  MapPin,
  Clock,
  ArrowRight,
  TrendingUp,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Zap,
  Bike,
  Power,
  ChevronRight,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ErrandCard } from '@/components/ui/ErrandCard';

interface ErrandTask {
  id: string;
  title: string;
  category: string;
  pickup_location: string;
  delivery_location: string;
  total_fee: number;
  runner_amount?: number;
  platform_fee?: number;
  priority: string;
  created_at: string;
  updated_at?: string;
  status: string;
}

export default function RunnerOpportunityRadar() {
  const router = useRouter();
  const { user, setActiveTask } = useAppStore();
  const [availableErrands, setAvailableErrands] = useState<ErrandTask[]>([]);
  const [activeErrands, setActiveErrands] = useState<ErrandTask[]>([]);
  const [historyErrands, setHistoryErrands] = useState<ErrandTask[]>([]);
  const [runnerStatus, setRunnerStatus] = useState<'online' | 'offline'>('offline');
  const [runnerLevel, setRunnerLevel] = useState<number>(1);

  const [viewMode, setViewMode] = useState<'available' | 'history'>('available');
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  // Runner Counter Offer State
  const [counterModalTask, setCounterModalTask] = useState<any | null>(null);
  const [counterAmount, setCounterAmount] = useState<number>(1000);
  const [counterNote, setCounterNote] = useState<string>('');
  const [submittingCounter, setSubmittingCounter] = useState(false);

  const handleSendCounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterModalTask) return;
    if (counterAmount < 800) {
      toast.error('Counter offer must be at least ₦800');
      return;
    }

    setSubmittingCounter(true);
    try {
      const { error } = await supabase
        .from('errands')
        .update({
          notes: `[Runner Counter Offer: ₦${counterAmount.toLocaleString()} by ${user?.fullName || 'Runner'}${counterNote ? ` - Note: ${counterNote}` : ''}]`,
        })
        .eq('id', counterModalTask.id);

      if (error) throw error;

      toast.success(`Counter offer of ₦${counterAmount.toLocaleString()} sent to requester!`);
      setCounterModalTask(null);
      setCounterNote('');
    } catch {
      toast.error('Failed to submit counter offer');
    } finally {
      setSubmittingCounter(false);
    }
  };

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      authFetch('/api/errands/auto-release', { method: 'POST' }).catch(console.error);
      setStatusMessage(null);

      const profilePromise = supabase
        .from('profiles')
        .select('runner_status, total_errands, rating')
        .eq('id', user.id)
        .single();

      const availablePromise = supabase
        .from('errands')
        .select('id, title, category, pickup_location, delivery_location, total_fee, priority, status, created_at')
        .eq('status', 'unassigned')
        .order('created_at', { ascending: false });

      const activePromise = supabase
        .from('errands')
        .select('id, title, category, pickup_location, delivery_location, total_fee, priority, status, created_at')
        .eq('runner_id', user.id)
        .in('status', ['assigned', 'in_progress'])
        .order('created_at', { ascending: false });

      const historyPromise = supabase
        .from('errands')
        .select('id, title, category, pickup_location, delivery_location, total_fee, runner_amount, platform_fee, priority, status, created_at, updated_at')
        .eq('runner_id', user.id)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });

      const walletPromise = supabase.from('wallets').select('balance').eq('user_id', user.id).single();

      const [profileResult, availableResult, activeResult, historyResult, walletResult] = await Promise.all([
        profilePromise,
        availablePromise,
        activePromise,
        historyPromise,
        walletPromise
      ]);

      if (walletResult.data) setWalletBalance(Number(walletResult.data.balance));

      if (!profileResult.error && profileResult.data) {
        setRunnerStatus(profileResult.data.runner_status === 'online' ? 'online' : 'offline');
        const rStats = profileResult.data;
        if (rStats.total_errands >= 10 && rStats.rating >= 4.0) {
          setRunnerLevel(2);
        } else {
          setRunnerLevel(1);
        }
      }

      setAvailableErrands((availableResult.data as ErrandTask[]) || []);
      setActiveErrands((activeResult.data as ErrandTask[]) || []);
      setHistoryErrands((historyResult.data as ErrandTask[]) || []);
      setActiveTask((activeResult.data as ErrandTask[])?.length > 0 ? (activeResult.data as ErrandTask[])[0].id : null);
      setLoading(false);
    };

    loadDashboard();

    const channel = supabase
      .channel('runner_marketplace_feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'errands' }, () => loadDashboard())
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const toggleDuty = async () => {
    if (!user) return;
    setToggleLoading(true);
    const newStatus = runnerStatus === 'online' ? 'offline' : 'online';
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ runner_status: newStatus })
        .eq('id', user.id);
        
      if (error) throw error;
      setRunnerStatus(newStatus);
      toast.success(newStatus === 'online' ? 'You are now online' : 'You are now offline');
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setToggleLoading(false);
    }
  };

  const handleAccept = async (errandId: string) => {
    if (runnerStatus !== 'online') {
      toast.error('You must be online to accept errands');
      return;
    }
    
    setAccepting(errandId);
    try {
      const res = await authFetch('/api/errands/accept', {
        method: 'POST',
        body: JSON.stringify({ errandId })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept errand');
      
      toast.success('Errand accepted successfully!');
      router.push(`/dashboard/runner/accepted/${errandId}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAccepting(null);
    }
  };

  const handleWithdrawalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount < 2000 || withdrawAmount > walletBalance) return;
    
    try {
      const res = await authFetch('/api/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount: withdrawAmount })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process withdrawal');
      
      toast.success('Withdrawal request submitted successfully');
      setIsWithdrawOpen(false);
      setWalletBalance(prev => prev - withdrawAmount);
      setWithdrawAmount(0);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <RunnerGuard>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 animate-fadeIn max-w-7xl mx-auto">

        {/* ── RUNNER HERO CONSOLE ── */}
        {/* ── RUNNER HERO CONSOLE ── */}
        <section className="bg-white dark:bg-[#111827] rounded-2xl p-5 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${runnerStatus === 'online' ? 'bg-[#00A859] animate-ping' : 'bg-[#00A859]'}`} />
              <span className="text-[11px] font-bold text-[#00A859]">
                {runnerStatus === 'online' ? 'You are Online' : 'You are Offline'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Runner Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-[200px] sm:max-w-none">
              {runnerStatus === 'online' 
                ? 'You are active and visible to students.' 
                : 'Go online to start receiving student errand requests.'}
            </p>
          </div>

          <div className="flex items-center">
            <button
              onClick={toggleDuty}
              disabled={toggleLoading}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-all ${
                runnerStatus === 'online'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-[#00A859] hover:bg-green-700 text-white'
              }`}
            >
              <Power className="w-6 h-6" />
            </button>
          </div>
        </section>

        {/* ── 3-COLUMN EARNINGS STRIP ── */}
        {/* ── 3-COLUMN EARNINGS STRIP (Mobile Scrollable / Grid) ── */}
        <section className="grid grid-cols-3 gap-2 sm:gap-6">
          {/* Available Balance */}
          <Link href="/dashboard/wallet" className="bg-white dark:bg-[#111827] rounded-xl p-3 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[100px] hover:border-[#00A859] transition-colors cursor-pointer group">
            <div>
              <p className="text-[9px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-[#00A859] transition-colors">Available Balance</p>
              <h2 className="text-sm sm:text-3xl font-black text-[#00A859] font-mono mt-0.5">
                {formatCurrency(walletBalance)}
              </h2>
              <p className="text-[8px] sm:text-[11px] text-slate-400 mt-1 truncate">Withdraw anytime</p>
            </div>
            <div className="self-end mt-2 w-6 h-6 sm:w-12 sm:h-12 rounded-md sm:rounded-xl bg-green-50 dark:bg-green-900/20 text-[#00A859] flex items-center justify-center group-hover:bg-[#00A859] group-hover:text-white transition-colors">
              <Wallet className="w-3 h-3 sm:w-6 sm:h-6" />
            </div>
          </Link>

          {/* Active Missions */}
          <Link href="/dashboard/runner/tasks" className="bg-white dark:bg-[#111827] rounded-xl p-3 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[100px] hover:border-blue-500 transition-colors cursor-pointer group">
            <div>
              <p className="text-[9px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-blue-500 transition-colors">Active Missions</p>
              <h2 className="text-sm sm:text-3xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                {activeErrands.length}
              </h2>
              <p className="text-[8px] sm:text-[11px] text-slate-400 mt-1 leading-tight">
                {activeErrands.length > 0 ? 'In progress' : 'No active missions'}
              </p>
            </div>
            <div className="self-end mt-2 w-6 h-6 sm:w-12 sm:h-12 rounded-md sm:rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Radio className="w-3 h-3 sm:w-6 sm:h-6" />
            </div>
          </Link>

          {/* Driver Score */}
          <Link href="/dashboard/runner/performance" className="bg-white dark:bg-[#111827] rounded-xl p-3 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[100px] hover:border-purple-500 transition-colors cursor-pointer group">
            <div>
              <p className="text-[9px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-purple-500 transition-colors">Driver Score</p>
              <h2 className="text-sm sm:text-3xl font-black text-blue-600 font-mono mt-0.5">
                ★ {user?.rating ? user.rating.toFixed(1) : '5.0'}
              </h2>
              <p className="text-[8px] sm:text-[11px] text-slate-400 mt-1 truncate">Excellent</p>
            </div>
            <div className="self-end mt-2 w-6 h-6 sm:w-12 sm:h-12 rounded-md sm:rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <TrendingUp className="w-3 h-3 sm:w-6 sm:h-6" />
            </div>
          </Link>
        </section>

        {/* ── AVAILABLE BOUNTIES FEED ── */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Available Bounties
              </h2>
              <p className="text-xs text-slate-500">
                {runnerStatus === 'online'
                  ? `${availableErrands.length} nearby errands ready for pickup`
                  : 'Go Online above to receive student requests'}
              </p>
            </div>

            <div className="flex w-full sm:w-auto bg-white dark:bg-[#111827] p-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 shadow-sm">
              <button
                onClick={() => setViewMode('available')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-colors ${viewMode === 'available' ? 'bg-green-50 text-[#00A859] dark:bg-green-900/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                Nearby ({availableErrands.length})
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-colors ${viewMode === 'history' ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                Completed ({historyErrands.length})
              </button>
            </div>
          </div>

          {viewMode === 'available' ? (
            availableErrands.length === 0 ? (
              <div className="bg-white dark:bg-[#111827] rounded-2xl pt-12 pb-6 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm relative overflow-hidden flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 text-[#00A859] flex items-center justify-center mb-2 z-10 relative">
                  <div className="absolute inset-0 rounded-full animate-ping bg-green-100 dark:bg-green-900/30"></div>
                  <Search className="w-6 h-6 z-10" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white z-10 relative">Looking for requests...</h3>
                <p className="text-xs text-slate-500 max-w-[200px] z-10 relative">
                  We'll notify you when new errands are available.
                </p>
                <div className="w-full mt-8 flex justify-center opacity-40">
                  <svg viewBox="0 0 400 50" className="w-full h-12 text-[#00A859] fill-current">
                    <path d="M0,25 C50,0 100,50 150,25 C200,0 250,50 300,25 C350,0 400,25 400,25 L400,50 L0,50 Z" opacity="0.3"></path>
                  </svg>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {availableErrands.map((task) => (
                  <ErrandCard
                    key={task.id}
                    errand={{ ...task, total_fee: Number(task.total_fee) * 0.8 }}
                    mode="runner"
                    onAccept={() => handleAccept(task.id)}
                    onCounter={() => {
                      setCounterModalTask(task);
                      setCounterAmount(Math.round(Number(task.total_fee) * 0.8 + 300));
                    }}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="space-y-3">
              {historyErrands.length === 0 ? (
                <div className="bg-white dark:bg-[#111827] rounded-[2rem] p-12 border border-slate-200 dark:border-slate-800 border-dashed text-center space-y-3 shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2">
                    <Clock className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">No Missions Completed</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Switch to the "Nearby" tab to find and accept your first campus errand.
                  </p>
                </div>
              ) : (
                historyErrands.map((h) => (
                  <div
                    key={h.id}
                    className="bg-white dark:bg-[#111827] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 text-sm shadow-sm"
                  >
                    <div className="truncate">
                      <p className="font-bold text-slate-900 dark:text-white truncate">{h.title}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(h.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="font-mono font-black text-[#00A859] text-base">
                      +{formatCurrency(Number(h.total_fee) * 0.8)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        
        </section>

        {/* ── MOBILE BOTTOM ACTIONS ── */}
        <section className="space-y-4 pt-4 lg:hidden">
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Increase your chances</h3>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-md bg-green-50 dark:bg-green-900/20 text-[#00A859] flex items-center justify-center shrink-0">
                <Power className="w-3 h-3" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Go Online</p>
                <p className="text-[10px] text-slate-500">Be available to receive requests</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-md bg-green-50 dark:bg-green-900/20 text-[#00A859] flex items-center justify-center shrink-0">
                <MapPin className="w-3 h-3" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Stay Near Popular Areas</p>
                <p className="text-[10px] text-slate-500">Hostels, Cafeterias, Library, Gate</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-md bg-green-50 dark:bg-green-900/20 text-[#00A859] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3 h-3" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Complete More Missions</p>
                <p className="text-[10px] text-slate-500">Improve your score & priority</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full">
            <button
              onClick={toggleDuty}
              disabled={toggleLoading}
              className={`flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
                runnerStatus === 'online'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-[#00A859] hover:bg-green-700 text-white'
              }`}
            >
              <Power className="w-4 h-4" />
              {runnerStatus === 'online' ? 'Go Offline' : 'Go Online'}
            </button>

            <button
              onClick={() => setIsWithdrawOpen(true)}
              className="flex-1 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 bg-white dark:bg-[#111827]"
            >
              <Wallet className="w-4 h-4" />
              Cash Out
            </button>
          </div>
        </section>

        {/* ── WITHDRAWAL MODAL ── */}
        {isWithdrawOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-[#111827] rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cash Out Earnings</h3>
                <button onClick={() => setIsWithdrawOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl text-center">
                <span className="text-[10px] uppercase font-bold text-green-700 dark:text-green-500 block">Available Balance</span>
                <span className="text-3xl font-black font-mono text-[#00A859] mt-1 block">
                  {formatCurrency(walletBalance)}
                </span>
              </div>

              <form onSubmit={handleWithdrawalRequest} className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Amount (Min: ₦2,000)</label>
                  <input
                    type="number"
                    min="2000"
                    max={walletBalance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-base text-slate-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all mt-2"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="success"
                  disabled={withdrawAmount < 2000 || withdrawAmount > walletBalance}
                  className="w-full h-12 text-sm font-black bg-[#00A859] hover:bg-green-700 text-white shadow-sm rounded-xl"
                >
                  Confirm Payout to Bank
                </Button>
              </form>
            </motion.div>
          </div>
        )}

        {/* ── RUNNER COUNTER OFFER MODAL ── */}
        {counterModalTask && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-[#111827] rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Propose Counter Offer</h3>
                  <p className="text-xs text-slate-400 mt-1">Negotiate a custom fee for this errand</p>
                </div>
                <button onClick={() => setCounterModalTask(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400 block">Current Standard Fee</span>
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1 block">
                  {formatCurrency(Number(counterModalTask.total_fee))}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 truncate">
                  📍 {counterModalTask.pickup_location} ➔ {counterModalTask.delivery_location}
                </p>
              </div>

              <form onSubmit={handleSendCounter} className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Your Proposed Counter Fee (₦)
                  </label>
                  <input
                    type="number"
                    min={800}
                    step={100}
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(Number(e.target.value))}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-base text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mt-2 transition-all"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5">Standard campus fee is ₦800 (1km rate)</p>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Reason / Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Heavy load, rain, or long line"
                    value={counterNote}
                    onChange={(e) => setCounterNote(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mt-2 transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCounterModalTask(null)}
                    className="flex-1 h-12 text-sm font-bold border-slate-200 dark:border-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={submittingCounter}
                    className="flex-1 h-12 text-sm font-black bg-blue-600 hover:bg-blue-700 text-white shadow-sm rounded-xl"
                  >
                    Send Counter
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

      </div>
    </RunnerGuard>
  );
}
