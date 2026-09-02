'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Zap, MapPin, DollarSign, Trophy } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { RunnerGuard } from '@/components/guards/RunnerGuard';
import { formatCurrency } from '@/utils/pricing';
import toast from 'react-hot-toast';

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

export default function RunnerDashboard() {
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
  const [_isWithdrawing, setIsWithdrawing] = useState(false);
  const [_withdrawAmount, setWithdrawAmount] = useState<number>(0);

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

      if (availableResult.error) {
        console.error('Failed to fetch available errands:', availableResult.error);
      }
      if (activeResult.error) {
        console.error('Failed to fetch active errands:', activeResult.error);
      }
      if (historyResult.error) {
        console.error('Failed to fetch history errands:', historyResult.error);
      }

      setAvailableErrands((availableResult.data as ErrandTask[]) || []);
      setActiveErrands((activeResult.data as ErrandTask[]) || []);
      setHistoryErrands((historyResult.data as ErrandTask[]) || []);
      setActiveTask((activeResult.data as ErrandTask[])?.length > 0 ? (activeResult.data as ErrandTask[])[0].id : null);
      setLoading(false);
    };

    loadDashboard();
  }, [user, setActiveTask]);

  const toggleDuty = async () => {
    if (!user?.id) return;
    const nextStatus = runnerStatus === 'online' ? 'offline' : 'online';

    if (nextStatus === 'offline' && activeErrands.length > 0) {
      const confirmed = window.confirm('You have active tasks. Going offline may pause new assignments. Continue?');
      if (!confirmed) return;
    }

    setToggleLoading(true);
    setStatusMessage(null);

    const { error } = await supabase
      .from('profiles')
      .update({ runner_status: nextStatus })
      .eq('id', user.id);

    if (error) {
      console.error('Failed to update runner status:', error);
      setStatusMessage('Unable to change duty state. Please try again.');
    } else {
      setRunnerStatus(nextStatus);
      setStatusMessage(`Duty set to ${nextStatus === 'online' ? 'Online' : 'Offline'}.`);
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
        throw new Error(result.error || 'Could not accept errand');
      }

      setActiveTask(taskId);
      window.location.href = `/dashboard/runner/accepted/${taskId}`;
    } catch (error: any) {
      console.error('Accept error:', error);
      setStatusMessage(error?.message || 'Failed to accept contract.');
    } finally {
      setAccepting(null);
    }
  };

  const currentActiveTask = activeErrands[0] ?? null;

  const financialMetrics = useMemo(() => {
    const runnerEarnings = historyErrands.reduce((sum, task) => sum + Number(task.runner_amount ?? task.total_fee * 0.8), 0);
    const companyCut = historyErrands.reduce((sum, task) => sum + Number(task.platform_fee ?? task.total_fee * 0.2), 0);
    const completedCount = historyErrands.length;

    return { runnerEarnings, companyCut, completedCount };
  }, [historyErrands]);

  const handleWithdraw = async () => {
    if (withdrawAmount < 2000) return toast.error('Minimum withdrawal is N2,000');
    if (withdrawAmount > walletBalance) return toast.error('Insufficient funds');
    
    try {
      toast.loading('Processing withdrawal...', { id: 'withdraw' });
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, amount: withdrawAmount })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      
      setWalletBalance(data.balance);
      setIsWithdrawing(false);
      setWithdrawAmount(0);
      toast.success('Withdrawal requested successfully! Processing...', { id: 'withdraw' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to withdraw', { id: 'withdraw' });
    }
  };

  return (
    <RunnerGuard>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr] mb-8">
          <div className="glass-card rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-emerald-500/5 backdrop-blur-md">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-emerald-300/80">Runner command center</p>
                <h1 className="mt-3 heading-page font-semibold text-white">Duty state & performance</h1>
                <p className="mt-3 max-w-2xl text-white/60">Toggle your availability, review active assignments, and monitor your on-platform earnings split in one place.</p>
              </div>
              <button
                type="button"
                onClick={toggleDuty}
                disabled={toggleLoading}
                className={`inline-flex items-center justify-center rounded-3xl px-6 py-3 min-h-[44px] text-sm font-semibold transition ${runnerStatus === 'online' ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/20 shadow-[0_0_0_1px_rgba(16,185,129,0.12)]' : 'bg-slate-800/80 text-slate-200 border border-white/10'}`}
              >
                <span className={`mr-2 h-2.5 w-2.5 rounded-full ${runnerStatus === 'online' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                {toggleLoading ? 'Updating…' : runnerStatus === 'online' ? 'Duty Online' : 'Offline'}
              </button>
            </div>

            <div className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                <div className="flex items-center gap-3 text-emerald-300">
                  <DollarSign className="h-5 w-5" />
                  <p className="text-sm uppercase tracking-[0.2em] text-white/60">Net payout balance</p>
                </div>
                <p className="mt-4 text-3xl font-mono text-emerald-400 font-bold">{formatCurrency(financialMetrics.runnerEarnings)}</p>
                <p className="mt-2 text-sm text-white/60">Your 80% runner earnings from completed deliveries.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                <div className="flex items-center gap-3 text-slate-200">
                  <Zap className="h-5 w-5" />
                  <p className="text-sm uppercase tracking-[0.2em] text-white/60">Platform processing cut</p>
                </div>
                <p className="mt-4 text-3xl font-semibold text-white">{formatCurrency(financialMetrics.companyCut)}</p>
                <p className="mt-2 text-sm text-white/60">20% company split from completed run fees.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                <div className="flex items-center gap-3 text-emerald-300">
                  <Trophy className="h-5 w-5" />
                  <p className="text-sm uppercase tracking-[0.2em] text-white/60">Completed deliveries</p>
                </div>
                <p className="mt-4 text-3xl font-semibold text-white">{financialMetrics.completedCount}</p>
                <p className="mt-2 text-sm text-white/60">Total successful run history.</p>
              </div>
            </div>

            {statusMessage ? (
              <div className="mt-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                {statusMessage}
              </div>
            ) : null}
          </div>

          <div className="glass-card rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-slate-900/50 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-white/60">Task history</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Run history controls</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('available')}
                  className={`rounded-3xl px-4 py-2 text-sm font-semibold transition ${viewMode === 'available' ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/20' : 'bg-slate-900/80 text-white/70 hover:text-white'}`}
                >
                  Available Errands
                </button>
                <button
                  onClick={() => setViewMode('history')}
                  className={`rounded-3xl px-4 py-2 text-sm font-semibold transition ${viewMode === 'history' ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/20' : 'bg-slate-900/80 text-white/70 hover:text-white'}`}
                >
                  Run History
                </button>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-white/10 bg-slate-950/60 p-6">
              {viewMode === 'available' ? (
                <div>
                  <h3 className="text-lg font-semibold text-white">Open contracts</h3>
                  <p className="mt-2 text-sm text-white/60">Accept a job and lock in your 80% take-home payout.</p>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-white">Completed archive</h3>
                  <p className="mt-2 text-sm text-white/60">Review completed runs with exact financial breakdowns.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="glass-card rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-lg shadow-slate-950/20">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-emerald-300/80">Active Assignment Inbox</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">Current allocations</h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-4 py-2 text-sm text-white/60">
                <span className={`h-2.5 w-2.5 rounded-full ${activeErrands.length > 0 ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                {activeErrands.length > 0 ? 'Active' : 'Idle'}
              </div>
            </div>

            {activeErrands.length === 0 ? (
              <div className="mt-8 rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-white/60">
                <p className="text-lg">No assigned errands right now.</p>
                <p className="mt-2 text-sm">Accept an available system errand to see it appear here with tracking controls.</p>
              </div>
            ) : (
              <div className="mt-8 space-y-4">
                {currentActiveTask ? (
                  <article className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-emerald-200">Current active task</p>
                        <h3 className="mt-2 text-xl font-semibold text-white">{currentActiveTask.title}</h3>
                        <p className="mt-1 text-sm text-white/60">{currentActiveTask.pickup_location} → {currentActiveTask.delivery_location}</p>
                        <p className="mt-3 text-sm text-white/60">{currentActiveTask.priority} priority — status: {currentActiveTask.status.replace('_', ' ')}</p>
                      </div>
                      <div className="flex flex-col gap-3 sm:items-end">
                        <Link href={`/dashboard/runner/track/${currentActiveTask.id}`} className="btn-primary inline-flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4" /> View active route
                        </Link>
                        <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs uppercase text-white/60">Fast access</span>
                      </div>
                    </div>
                  </article>
                ) : null}

                <div className="space-y-4">
                  {activeErrands.map((errand) => (
                    <article key={errand.id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm uppercase tracking-[0.2em] text-white/60">{errand.priority}</p>
                          <h3 className="mt-2 text-xl font-semibold text-white">{errand.title}</h3>
                          <p className="mt-1 text-sm text-white/60">{errand.pickup_location} → {errand.delivery_location}</p>
                        </div>
                        <div className="flex flex-col items-start gap-3 sm:items-end w-full sm:w-auto mt-2 sm:mt-0">
                          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs uppercase text-emerald-200">{errand.status.replace('_', ' ')}</span>
                          <Link href={`/dashboard/runner/track/${errand.id}`} className="btn-primary w-full sm:w-auto inline-flex justify-center items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4" /> View tracking
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="glass-card rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-lg shadow-slate-950/10">
            {loading ? (
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-white/60">
                Loading errands…
              </div>
            ) : viewMode === 'available' ? (
              <div className="space-y-6">
                {availableErrands.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-white/60">
                    <p>No tasks nearby.</p>
                    <p className="mt-2 text-sm">Check back soon for new pickup contracts.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredAvailableErrands.map((errand) => (
                      <article key={errand.id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-col">
                            <p className="text-sm uppercase tracking-[0.2em] text-white/60">{errand.category}</p>
                            <h3 className="mt-1 text-lg font-semibold text-white">{errand.title}</h3>
                            <p className="mt-1 text-sm text-white/60">{errand.pickup_location} → {errand.delivery_location}</p>
                          </div>
                          <div className="flex flex-col gap-3 w-full sm:w-auto sm:items-end">
                            <div className="flex items-center justify-between sm:justify-end gap-3 text-sm">
                              <span className="text-white/60">Payout</span>
                              <strong className="font-mono text-emerald-400 font-bold text-lg">{formatCurrency(Number(errand.total_fee) * 0.8)}</strong>
                            </div>
                            {Number(errand.total_fee) > 10000 && runnerLevel < 2 ? (
                              <button
                                disabled
                                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 cursor-not-allowed"
                              >
                                🔒 Level 2 Required (High Value)
                              </button>
                            ) : activeErrands.length >= 2 ? (
                              <button
                                disabled
                                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 cursor-not-allowed"
                              >
                                Max Active Tasks Reached
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAccept(errand.id)}
                                disabled={accepting === errand.id}
                                className="btn-primary w-full sm:w-auto"
                              >
                                {accepting === errand.id ? 'Accepting...' : 'Accept Contract'}
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {historyErrands.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-white/60">
                    <p>No completed runs yet.</p>
                    <p className="mt-2 text-sm">Finish a delivery to start building your history log.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyErrands.map((history) => (
                      <article key={history.id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-white">{history.title}</h3>
                            <p className="text-sm text-white/60">{new Date(history.updated_at ?? history.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-white/60">Runner fee</p>
                            <p className="text-white">{formatCurrency(Number(history.runner_amount ?? history.total_fee * 0.8))}</p>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-white/60">
                          <div className="rounded-2xl bg-slate-900/80 p-3">
                            <p className="text-[0.7rem] uppercase tracking-[0.25em] text-white/60">Platform cut</p>
                            <p className="mt-2 text-white">{formatCurrency(Number(history.platform_fee ?? history.total_fee * 0.2))}</p>
                          </div>
                          <div className="rounded-2xl bg-slate-900/80 p-3">
                            <p className="text-[0.7rem] uppercase tracking-[0.25em] text-white/60">Delivery</p>
                            <p className="mt-2 text-white">{history.pickup_location} → {history.delivery_location}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </RunnerGuard>
  );
}


