'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { RunnerGuard } from '@/components/guards/RunnerGuard';
import { formatCurrency } from '@/utils/pricing';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  Radio,
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
      fetch('/api/errands/auto-release', { method: 'POST' }).catch(console.error);
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
  }, [user, setActiveTask]);

  const toggleDuty = async () => {
    if (!user?.id) return;
    const nextStatus = runnerStatus === 'online' ? 'offline' : 'online';

    if (nextStatus === 'offline' && activeErrands.length > 0) {
      const confirmed = window.confirm('You have active tasks in flight. Going offline will pause receiving new tasks. Continue?');
      if (!confirmed) return;
    }

    setToggleLoading(true);
    setStatusMessage(null);

    const { error } = await supabase
      .from('profiles')
      .update({ runner_status: nextStatus })
      .eq('id', user.id);

    if (error) {
      toast.error('Unable to toggle duty status');
    } else {
      setRunnerStatus(nextStatus);
      toast.success(nextStatus === 'online' ? '🟢 You are Online & visible to customers' : '⚪ You are Offline');
    }

    setToggleLoading(false);
  };

  const handleAccept = async (taskId: string) => {
    if (!user?.id) return;
    setAccepting(taskId);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/errands/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errandId: taskId, runnerId: user.id }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.error || 'Failed to claim errand');
        setAccepting(null);
        return;
      }

      toast.success('Bounty claimed! Opening mission console…');
      router.push(`/dashboard/runner/accepted/${taskId}`);
    } catch (err: any) {
      toast.error(err?.message || 'Error accepting errand');
      setAccepting(null);
    }
  };

  const handleWithdrawalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount < 2000) {
      toast.error('Minimum withdrawal is ₦2,000');
      return;
    }
    if (withdrawAmount > walletBalance) {
      toast.error('Insufficient wallet balance');
      return;
    }

    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, amount: withdrawAmount })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to request payout');

      toast.success('Payout request submitted to campus treasury!');
      setWalletBalance(prev => prev - withdrawAmount);
      setWithdrawAmount(0);
      setIsWithdrawOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Withdrawal failed');
    }
  };

  const currentActiveTask = activeErrands[0];

  return (
    <RunnerGuard>
      <div className="py-6 sm:py-8 space-y-6 animate-fadeIn">

        {/* ── TOP UBER DRIVER-STYLE DUTY TOGGLE ── */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${runnerStatus === 'online' ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {runnerStatus === 'online' ? 'Active on Campus Grid' : 'Status: Offline'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Runner Console
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Big Uber-style GO ONLINE Button */}
            <button
              onClick={toggleDuty}
              disabled={toggleLoading}
              className={`flex-1 sm:flex-initial px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                runnerStatus === 'online'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30 ring-2 ring-emerald-400/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              <Power className="w-4 h-4" />
              {runnerStatus === 'online' ? 'GO OFFLINE' : 'GO ONLINE'}
            </button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsWithdrawOpen(true)}
              className="text-xs font-bold border-slate-300 dark:border-slate-700 h-12"
            >
              <Wallet className="w-4 h-4 text-emerald-600 mr-1" />
              Cash Out
            </Button>
          </div>
        </section>

        {/* ── EARNINGS STRIP (Minimalist) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
              Available Balance
            </span>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 font-mono mt-0.5">
              {formatCurrency(walletBalance)}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Active Missions
            </span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {activeErrands.length}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Driver Score
            </span>
            <p className="text-xl sm:text-2xl font-black text-blue-600 font-mono mt-0.5">
              {user?.rating ? `★ ${user.rating.toFixed(1)}` : 'Verified Runner'}
            </p>
          </div>
        </div>

        {/* ── ACTIVE TASK IN-FLIGHT (Deliveroo style) ── */}
        {currentActiveTask && (
          <motion.section
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-600 text-white rounded-3xl p-5 sm:p-6 shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                Active Mission In Progress
              </span>
              <span className="font-mono font-black text-sm">
                Payout: {formatCurrency(Number(currentActiveTask.total_fee) * 0.8)}
              </span>
            </div>

            <div>
              <h3 className="text-lg font-black">{currentActiveTask.title}</h3>
              <p className="text-xs text-emerald-100 mt-1">
                📍 {currentActiveTask.pickup_location} ➔ 📦 {currentActiveTask.delivery_location}
              </p>
            </div>

            <div className="pt-2 border-t border-white/20 flex justify-end">
              <Link
                href={`/dashboard/runner/accepted/${currentActiveTask.id}`}
                className="bg-white text-emerald-800 hover:bg-emerald-50 px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md"
              >
                Open Mission Console <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.section>
        )}

        {/* ── OPEN BOUNTIES FEED (Uber Driver Requests) ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
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

            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setViewMode('available')}
                className={`px-3 py-1 rounded-lg ${viewMode === 'available' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
              >
                Nearby ({availableErrands.length})
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`px-3 py-1 rounded-lg ${viewMode === 'history' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
              >
                Completed ({historyErrands.length})
              </button>
            </div>
          </div>

          {viewMode === 'available' ? (
            availableErrands.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-200/80 dark:border-slate-800 text-center space-y-3 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto animate-pulse">
                  <Radio className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Scanning for Requests…</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  New student errands broadcast live onto this feed as soon as they are submitted.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableErrands.map((task) => {
                  const netPayout = Number(task.total_fee) * 0.8;
                  const isClaiming = accepting === task.id;

                  return (
                    <div
                      key={task.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {task.category.replace('_', ' ')}
                          </span>
                          {task.priority === 'urgent' && (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                              ⚡ Express (+20%)
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                          {task.title}
                        </h3>

                        <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <p className="flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            From: {task.pickup_location}
                          </p>
                          <p className="flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                            To: {task.delivery_location}
                          </p>
                        </div>
                      </div>

                      {/* Right: Net Payout & One-tap Accept Button */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                        <div className="text-left sm:text-right">
                          <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono block">
                            {formatCurrency(netPayout)}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Your Payout</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={runnerStatus !== 'online'}
                            onClick={() => {
                              setCounterModalTask(task);
                              setCounterAmount(Math.round(netPayout + 300));
                            }}
                            className="font-bold text-xs h-11 px-3 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Counter
                          </Button>
                          <Button
                            size="md"
                            variant="success"
                            isLoading={isClaiming}
                            disabled={runnerStatus !== 'online'}
                            onClick={() => handleAccept(task.id)}
                            className="font-black text-xs h-11 px-4 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {runnerStatus !== 'online' ? 'Go Online' : 'Accept'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="space-y-3">
              {historyErrands.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                  No completed errands in your log yet.
                </div>
              ) : (
                historyErrands.map((h) => (
                  <div
                    key={h.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="truncate">
                      <p className="font-bold text-slate-900 dark:text-white truncate">{h.title}</p>
                      <p className="text-[10px] text-slate-400">{new Date(h.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="font-mono font-bold text-emerald-600 text-sm">
                      +{formatCurrency(Number(h.total_fee) * 0.8)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* ── WITHDRAWAL MODAL ── */}
        {isWithdrawOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Cash Out Earnings</h3>
                <button onClick={() => setIsWithdrawOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded-2xl text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">Available Balance</span>
                <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(walletBalance)}
                </span>
              </div>

              <form onSubmit={handleWithdrawalRequest} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Amount (Min: ₦2,000)</label>
                  <input
                    type="number"
                    min="2000"
                    max={walletBalance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="success"
                  disabled={withdrawAmount < 2000 || withdrawAmount > walletBalance}
                  className="w-full h-12 text-xs sm:text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
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
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Propose Counter Offer</h3>
                  <p className="text-[11px] text-slate-400">Negotiate a custom fee for this errand</p>
                </div>
                <button onClick={() => setCounterModalTask(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 block">Current Standard Fee</span>
                <span className="text-lg font-black font-mono text-slate-900 dark:text-white">
                  {formatCurrency(Number(counterModalTask.total_fee))}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                  📍 {counterModalTask.pickup_location} ➔ {counterModalTask.delivery_location}
                </p>
              </div>

              <form onSubmit={handleSendCounter} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Your Proposed Counter Fee (₦)
                  </label>
                  <input
                    type="number"
                    min={800}
                    step={100}
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(Number(e.target.value))}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Standard campus fee is ₦800 (1km rate)</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Reason / Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Heavy load, rain, or long line"
                    value={counterNote}
                    onChange={(e) => setCounterNote(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCounterModalTask(null)}
                    className="flex-1 text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={submittingCounter}
                    className="flex-1 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md"
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
