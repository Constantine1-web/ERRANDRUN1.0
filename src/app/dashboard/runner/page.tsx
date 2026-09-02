'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Zap, MapPin, DollarSign, Trophy, Wallet } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { RunnerGuard } from '@/components/guards/RunnerGuard';
import { formatCurrency } from '@/utils/pricing';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
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
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);

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

      if (availableResult.error) console.error('Failed to fetch available errands:', availableResult.error);
      if (activeResult.error) console.error('Failed to fetch active errands:', activeResult.error);
      if (historyResult.error) console.error('Failed to fetch history errands:', historyResult.error);

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
        
        {/* Earnings Summary Header using Card */}
        <Card className="mb-8">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Wallet className="h-6 w-6 text-emerald-400" />
                Earnings Summary
              </CardTitle>
              <p className="text-white/60 mt-1">Monitor your payouts and statistics.</p>
            </div>
            <Button
              variant={runnerStatus === 'online' ? 'primary' : 'secondary'}
              onClick={toggleDuty}
              isLoading={toggleLoading}
              className={runnerStatus === 'online' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              <span className={`mr-2 h-2.5 w-2.5 rounded-full ${runnerStatus === 'online' ? 'bg-white' : 'bg-slate-500'}`} />
              {runnerStatus === 'online' ? 'Duty Online' : 'Duty Offline'}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-white/60 uppercase tracking-wider mb-2">Wallet Balance</p>
                <p className="text-2xl font-mono font-bold text-emerald-400">{formatCurrency(walletBalance)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-white/60 uppercase tracking-wider mb-2">Net Earnings</p>
                <p className="text-2xl font-mono font-bold text-white">{formatCurrency(financialMetrics.runnerEarnings)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-white/60 uppercase tracking-wider mb-2">Platform Cut</p>
                <p className="text-2xl font-mono font-bold text-white">{formatCurrency(financialMetrics.companyCut)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-white/60 uppercase tracking-wider mb-2">Completed Runs</p>
                <p className="text-2xl font-mono font-bold text-white">{financialMetrics.completedCount}</p>
              </div>
            </div>
            {statusMessage && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 text-emerald-200 text-sm border border-emerald-500/20">
                {statusMessage}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-white">Run Errands & Earn</h2>
              <div className="flex gap-2">
                <Button variant={viewMode === 'available' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('available')}>
                  Available
                </Button>
                <Button variant={viewMode === 'history' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('history')}>
                  History
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="text-white/60 py-8">Loading tasks...</div>
            ) : viewMode === 'available' ? (
              <div className="space-y-4">
                {availableErrands.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-white/60">
                      <p>No tasks nearby.</p>
                      <p className="text-sm mt-1">Check back soon for new pickup contracts.</p>
                    </CardContent>
                  </Card>
                ) : (
                  availableErrands.map((errand) => (
                    <Card key={errand.id} className="hover:border-emerald-500/30 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="info">{errand.category}</Badge>
                              <Badge variant={errand.priority === 'high' ? 'danger' : 'outline'}>
                                {errand.priority} priority
                              </Badge>
                            </div>
                            <h3 className="text-xl font-semibold text-white">{errand.title}</h3>
                            
                            <div className="space-y-1.5 mt-2">
                              <div className="flex flex-col">
                                <span className="text-xs text-white/40 uppercase font-semibold">Pickup</span>
                                <span className="text-sm text-white/80">{errand.pickup_location}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs text-white/40 uppercase font-semibold">Dropoff</span>
                                <span className="text-sm text-white/80">{errand.delivery_location}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 sm:items-end min-w-[140px]">
                            <div className="text-left sm:text-right">
                              <span className="block text-xs text-white/50 uppercase font-semibold">Payout</span>
                              <strong className="text-2xl font-mono text-emerald-400">
                                {formatCurrency(Number(errand.total_fee) * 0.8)}
                              </strong>
                            </div>
                            
                            {Number(errand.total_fee) > 10000 && runnerLevel < 2 ? (
                              <Badge variant="warning" className="px-3 py-1.5">🔒 Level 2 Req</Badge>
                            ) : activeErrands.length >= 2 ? (
                              <Badge variant="danger" className="px-3 py-1.5">Max Tasks Reached</Badge>
                            ) : (
                              <Button
                                variant="primary"
                                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 border-blue-500/50"
                                onClick={() => handleAccept(errand.id)}
                                isLoading={accepting === errand.id}
                              >
                                {accepting === errand.id ? 'Accepting...' : 'Accept Errand'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {historyErrands.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-white/60">
                      <p>No completed runs yet.</p>
                      <p className="text-sm mt-1">Finish a delivery to start building your history log.</p>
                    </CardContent>
                  </Card>
                ) : (
                  historyErrands.map((history) => (
                    <Card key={history.id}>
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-white">{history.title}</h3>
                            <p className="text-sm text-white/60">{new Date(history.updated_at ?? history.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-white/50 uppercase">Runner Fee</span>
                            <p className="text-lg font-mono text-emerald-400 font-semibold">{formatCurrency(Number(history.runner_amount ?? history.total_fee * 0.8))}</p>
                          </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-2 text-sm">
                          <div className="bg-white/5 p-2 rounded-lg">
                            <span className="text-xs text-white/40 block">Platform Cut</span>
                            <span className="text-white/80">{formatCurrency(Number(history.platform_fee ?? history.total_fee * 0.2))}</span>
                          </div>
                          <div className="bg-white/5 p-2 rounded-lg">
                            <span className="text-xs text-white/40 block">Route</span>
                            <span className="text-white/80 truncate block">{history.pickup_location} &rarr; {history.delivery_location}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Active Assignments</CardTitle>
                  <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-full text-xs">
                    <span className={`h-2 w-2 rounded-full ${activeErrands.length > 0 ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    <span className="text-white/70">{activeErrands.length} Active</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {activeErrands.length === 0 ? (
                  <div className="text-center text-white/60 py-6 bg-white/5 rounded-xl border border-dashed border-white/10">
                    <p>No active assignments.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeErrands.map((errand) => (
                      <div key={errand.id} className="p-4 rounded-xl border border-white/10 bg-slate-950/50">
                        <Badge variant="outline" className="mb-2">{errand.priority} priority</Badge>
                        <h3 className="font-semibold text-white mb-1">{errand.title}</h3>
                        <p className="text-xs text-white/60 mb-4">{errand.pickup_location} &rarr; {errand.delivery_location}</p>
                        
                        <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/10">
                          <Badge variant="info">{errand.status.replace('_', ' ')}</Badge>
                          <Link href={`/dashboard/runner/track/${errand.id}`}>
                            <Button variant="secondary" size="sm" className="gap-2 text-xs">
                              <MapPin className="w-3 h-3" /> Track
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </RunnerGuard>
  );
}
