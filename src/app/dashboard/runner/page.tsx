'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { RunnerGuard } from '@/components/guards/RunnerGuard';
import { formatCurrency } from '@/utils/pricing';
import toast from 'react-hot-toast';
import {
  Radio,
  MapPin,
  Clock,
  ArrowRight,
  TrendingUp,
  Award,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Zap,
  Bike,
  Compass,
  ArrowUpRight,
  Power
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

    // Subscribe to errands updates for real-time bounties
    const channel = supabase
      .channel('runner_marketplace_feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'errands' },
        () => loadDashboard()
      )
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
      toast.success(`You are now ${nextStatus === 'online' ? '🟢 Online & Visible' : '⚪ Offline'}`);
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
        throw new Error(result.error || 'Could not claim errand');
      }

      toast.success('Errand locked to your mission console!');
      setActiveTask(taskId);
      window.location.href = `/dashboard/runner/accepted/${taskId}`;
    } catch (error: any) {
      toast.error(error?.message || 'Failed to accept task');
    } finally {
      setAccepting(null);
    }
  };

  const currentActiveTask = activeErrands[0] ?? null;

  const financialMetrics = useMemo(() => {
    const runnerEarnings = historyErrands.reduce((sum, task) => sum + Number(task.runner_amount ?? task.total_fee * 0.8), 0);
    const completedCount = historyErrands.length;
    return { runnerEarnings, completedCount };
  }, [historyErrands]);

  const handleWithdraw = async () => {
    if (withdrawAmount < 2000) return toast.error('Minimum withdrawal is ₦2,000');
    if (withdrawAmount > walletBalance) return toast.error('Insufficient funds');

    try {
      toast.loading('Submitting payout request...', { id: 'withdraw' });
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, amount: withdrawAmount })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setWalletBalance(data.balance);
      toast.success('Payout request queued for processing!', { id: 'withdraw' });
      setWithdrawAmount(0);
      setIsWithdrawOpen(false);
    } catch (err: any) {
toast.error(err.message || 'Withdrawal failed', { id: 'withdraw' });
    }
  };

  return (
    <RunnerGuard>
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 md:py-8 space-y-5 animate-fadeIn">

      {/* ── TOP RADAR HERO & AVAILABILITY STATUS ── */}
      <section className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 md:p-8 border border-emerald-200/60 dark:border-emerald-900/40 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-emerald-50/70 dark:bg-emerald-950/40 -z-0 pointer-events-none blur-2xl" />

        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border ${
              runnerStatus === 'online'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${runnerStatus === 'online' ? 'bg-emerald-600 animate-ping' : 'bg-slate-400'}`}></span>
              {runnerStatus === 'online' ? '🟢 ON DUTY / RECEIVING BOUNTIES' : '⚪ OFF DUTY'}
            </span>
            <Badge variant="success" className="text-[10px] font-bold">
              Level {runnerLevel} Runner
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Campus Opportunity Radar
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-lg">
            {runnerStatus === 'online'
              ? 'You are live on the campus grid. Open bounties appear in real time below.'
              : 'Toggle On-Duty to receive errand alerts and claim active bounties.'}
          </p>
        </div>

        {/* Duty Switch + Payout Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 z-10">
          {/* Duty Button */}
          <button
            onClick={toggleDuty}
            disabled={toggleLoading}
            className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
              runnerStatus === 'online'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            <Power className="w-4 h-4" />
            {runnerStatus === 'online' ? 'Go Offline' : 'Go On Duty'}
          </button>

          {/* Quick Payout Button */}
          <Button
            variant="outline"
            size="lg"
            onClick={() => setIsWithdrawOpen(true)}
            className="text-xs font-bold gap-1.5 border-slate-300 dark:border-slate-700 h-11 sm:h-12"
          >
            <Wallet className="w-4 h-4 text-emerald-600" />
            Request Payout
          </Button>
        </div>
      </section>

      {/* ── EARNINGS TELEMETRY HUD (Mobile Optimized 2-Col + 1-Col) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
            Available For Payout
          </span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {formatCurrency(walletBalance)}
          </p>
          <span className="text-[11px] text-slate-400 block pt-0.5">Min. withdrawal: ₦2,000</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Career Earnings
          </span>
          <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
            {formatCurrency(financialMetrics.runnerEarnings)}
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block pt-0.5">80% net cut</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Runs Completed
          </span>
          <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {financialMetrics.completedCount}
          </p>
          <span className="text-[10px] text-slate-400 block pt-0.5">
            {user?.rating ? `★ ${user.rating.toFixed(1)} Score` : 'Campus Verified'}
          </span>
        </div>
      </div>

        {/* ── ACTIVE TASK SPOTLIGHT (FLIGHT PRIORITY) ── */}
        {currentActiveTask && (
          <section className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-6 text-white shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">
                  Priority Mission In-Flight
                </span>
              </div>
              <Badge variant="warning" className="text-[10px] font-black uppercase">
                {currentActiveTask.status.replace('_', ' ')}
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">{currentActiveTask.title}</h3>
                <div className="flex items-center gap-2 text-xs text-blue-200 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{currentActiveTask.pickup_location} → {currentActiveTask.delivery_location}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-blue-200 block">Your Payout</span>
                  <span className="font-mono text-2xl font-black text-emerald-300">
                    {formatCurrency(Number(currentActiveTask.total_fee) * 0.8)}
                  </span>
                </div>

                <Link
                  href={`/dashboard/runner/accepted/${currentActiveTask.id}`}
                  className="bg-white text-slate-900 hover:bg-blue-50 px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
                >
                  <Bike className="w-4 h-4 text-blue-600" />
                  Open Mission Console
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── OPPORTUNITY RADAR FEED / BOUNTY BOARD ── */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {viewMode === 'available' ? 'Available Campus Bounties' : 'Completed Missions Ledger'}
              </h2>
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                {viewMode === 'available' ? availableErrands.length : historyErrands.length}
              </span>
            </div>

            {/* Toggle View */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => setViewMode('available')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'available' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                Available Radar
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                Completed Ledger
              </button>
            </div>
          </div>

          {/* Available Bounties List */}
          {viewMode === 'available' && (
            <>
              {loading ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400 animate-pulse">
                  Sweeping campus grid for open bounties…
                </div>
              ) : availableErrands.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-2">
                  <p className="text-sm font-bold text-slate-800">No open bounties at this moment</p>
                  <p className="text-xs text-slate-500">
                    New student requests will ping here automatically in real time. Keep your status ON.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableErrands.map((errand) => {
                    const runnerPayout = Number(errand.total_fee) * 0.8;
                    return (
                      <div
                        key={errand.id}
                        className="bg-white hover:bg-slate-50 border border-slate-200/90 rounded-3xl p-5 sm:p-6 transition-all shadow-sm hover:border-blue-300 flex flex-col md:flex-row md:items-center justify-between gap-5"
                      >
                        <div className="flex-1 space-y-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                              {errand.category.replace('_', ' ')}
                            </span>
                            {errand.priority === 'urgent' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider">
                                Urgent
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400 font-mono">
                              Posted {new Date(errand.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-slate-900">
                            {errand.title}
                          </h3>

                          {/* Waypoint Route */}
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="font-semibold text-slate-800">{errand.pickup_location}</span>
                            <span className="text-slate-300 font-bold">→</span>
                            <span className="font-semibold text-slate-800">{errand.delivery_location}</span>
                          </div>
                        </div>

                        {/* Payout & Claim Action */}
                        <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                          <div className="text-left md:text-right">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                              Net Takehome (80%)
                            </span>
                            <span className="font-mono text-2xl font-black text-emerald-600">
                              {formatCurrency(runnerPayout)}
                            </span>
                          </div>

                          <Button
                            size="lg"
                            variant="primary"
                            disabled={accepting === errand.id || runnerStatus === 'offline'}
                            isLoading={accepting === errand.id}
                            onClick={() => handleAccept(errand.id)}
                            className="font-bold text-xs shadow-md"
                          >
                            {runnerStatus === 'offline' ? 'Go On Duty to Claim' : 'Claim Task'}
                            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Completed History List */}
          {viewMode === 'history' && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm divide-y divide-slate-100 overflow-hidden">
              {historyErrands.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No completed deliveries recorded yet.
                </div>
              ) : (
                historyErrands.map((task) => (
                  <div key={task.id} className="p-5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{task.title}</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        {task.pickup_location} → {task.delivery_location}
                      </p>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-base font-black text-emerald-600 block">
                        +{formatCurrency(Number(task.runner_amount ?? task.total_fee * 0.8))}
                      </span>
                      <span className="text-[10px] text-slate-400">Completed & Verified</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* ── PAYOUT MODAL ── */}
        {isWithdrawOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-900">Request Runner Payout</h3>
                <button onClick={() => setIsWithdrawOpen(false)} className="text-slate-400 font-bold">✕</button>
              </div>
              <p className="text-xs text-slate-500">
                Earnings are transferred to your saved campus bank account. Minimum payout is <strong>₦2,000</strong>.
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Amount (₦)</label>
                <input
                  type="number"
                  min={2000}
                  step={500}
                  value={withdrawAmount || ''}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  placeholder="Min ₦2,000"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 font-mono text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={handleWithdraw}
                className="w-full font-bold bg-emerald-600 hover:bg-emerald-700"
              >
                Submit Payout Request
              </Button>
            </div>
          </div>
        )}

      </div>
    </RunnerGuard>
  );
}
