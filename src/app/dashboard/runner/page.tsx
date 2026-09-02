'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Zap, MapPin, DollarSign, Trophy, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { RunnerGuard } from '@/components/guards/RunnerGuard';
import { formatCurrency } from '@/utils/pricing';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

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
      setStatusMessage(`Status set to ${nextStatus === 'online' ? 'Online' : 'Offline'}.`);
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
      setStatusMessage(error?.message || 'Failed to accept task.');
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
    if (withdrawAmount < 2000) return toast.error('Minimum withdrawal is ₦2,000');
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
      toast.success('Withdrawal queued successfully!', { id: 'withdraw' });
      setWithdrawAmount(0);
    } catch (err: any) {
      toast.error(err.message || 'Withdrawal failed', { id: 'withdraw' });
    }
  };

  return (
    <RunnerGuard>
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-6">
        
        {/* Header with Duty Switch */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="success" className="text-xs">Level {runnerLevel} Runner</Badge>
              <span className="text-xs text-slate-400">• University of Uyo</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Runner Marketplace</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Duty Status</span>
            <button
              onClick={toggleDuty}
              disabled={toggleLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                runnerStatus === 'online'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${runnerStatus === 'online' ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
              {runnerStatus === 'online' ? 'ONLINE (Accepting)' : 'OFFLINE'}
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs">
            {statusMessage}
          </div>
        )}

        {/* 1. Earnings Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Wallet Balance</p>
              <p className="text-3xl font-black text-green-600 font-mono">{formatCurrency(walletBalance)}</p>
              <div className="mt-3 flex items-center gap-2">
                <Input 
                  type="number"
                  placeholder="Min ₦2,000"
                  value={withdrawAmount || ''}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  className="h-8 text-xs"
                />
                <Button size="sm" variant="outline" onClick={handleWithdraw} className="shrink-0 text-xs font-bold">
                  Payout
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Lifetime Earnings</p>
              <p className="text-3xl font-black text-slate-900 font-mono">{formatCurrency(financialMetrics.runnerEarnings)}</p>
              <p className="text-xs text-slate-400 mt-3">From completed campus deliveries</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Runs Completed</p>
              <p className="text-3xl font-black text-slate-900 font-mono">{financialMetrics.completedCount}</p>
              <p className="text-xs text-slate-400 mt-3">Total successful handoffs</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Task Banner */}
        {currentActiveTask && (
          <Card className="border-2 border-blue-300 bg-blue-50/60 shadow-sm">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="info">Active Assignment</Badge>
                  <span className="text-xs text-slate-500">In Progress</span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg">{currentActiveTask.title}</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  📍 {currentActiveTask.pickup_location} → 📦 {currentActiveTask.delivery_location}
                </p>
              </div>
              <Link href={`/dashboard/runner/accepted/${currentActiveTask.id}`}>
                <Button variant="primary" size="md" className="gap-2 font-bold whitespace-nowrap">
                  Open Mission View <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* 2. Marketplace Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Run Errands & Earn</h2>
              <p className="text-slate-500 text-xs mt-0.5">Available tasks posted by students nearby.</p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                onClick={() => setViewMode('available')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'available' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                Available ({availableErrands.length})
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                History ({historyErrands.length})
              </button>
            </div>
          </div>

          {loading ? (
            <Card className="p-10 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-2" />
              <p className="text-slate-500 text-xs">Scanning available tasks...</p>
            </Card>
          ) : viewMode === 'available' ? (
            availableErrands.length === 0 ? (
              <Card className="p-10 text-center">
                <Zap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="font-bold text-slate-800 text-sm">No tasks currently waiting</h3>
                <p className="text-slate-400 text-xs mt-1">Keep your status Online to receive instant alerts when a student posts.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {availableErrands.map((task) => {
                  const payout = Number(task.total_fee) * 0.8;
                  return (
                    <Card key={task.id} className="hover:border-blue-300 hover:shadow-sm transition-all">
                      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">{task.category}</Badge>
                            {task.priority === 'urgent' && <Badge variant="warning">Urgent</Badge>}
                            <span className="text-[11px] text-slate-400">
                              {new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-900 text-base leading-snug">{task.title}</h3>
                          <div className="text-xs text-slate-500 space-y-0.5">
                            <p className="truncate">📍 Pickup: <strong className="text-slate-700">{task.pickup_location}</strong></p>
                            <p className="truncate">📦 Dropoff: <strong className="text-slate-700">{task.delivery_location}</strong></p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                          <div className="text-left sm:text-right">
                            <p className="text-lg font-black text-green-600 font-mono leading-none">{formatCurrency(payout)}</p>
                            <span className="text-[10px] text-slate-400">Your 80% Payout</span>
                          </div>
                          <Button
                            variant="primary"
                            size="md"
                            className="font-bold whitespace-nowrap"
                            disabled={accepting === task.id || runnerStatus !== 'online'}
                            isLoading={accepting === task.id}
                            onClick={() => handleAccept(task.id)}
                          >
                            Accept Errand
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )
          ) : (
            /* History view */
            historyErrands.length === 0 ? (
              <Card className="p-8 text-center text-slate-500 text-xs">
                No completed errand history yet.
              </Card>
            ) : (
              <div className="space-y-2">
                {historyErrands.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="success">Completed</Badge>
                          <span className="text-[11px] text-slate-400">{new Date(task.created_at).toLocaleDateString()}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">{task.title}</h4>
                      </div>
                      <span className="font-mono font-bold text-green-600 text-sm">
                        +{formatCurrency(Number(task.runner_amount || task.total_fee * 0.8))}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </RunnerGuard>
  );
}
