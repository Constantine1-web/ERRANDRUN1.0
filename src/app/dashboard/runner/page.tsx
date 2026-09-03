'use client';

import React, { useEffect, useMemo, useState } from 'react';
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

  // ── STRIPPED: Awaiting redesign ──
  return (
    <RunnerGuard>
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Runner Marketplace</h1>
        <div>Level {runnerLevel} Runner</div>
        
        <div>
          <button onClick={toggleDuty} disabled={toggleLoading}>
            {runnerStatus === 'online' ? 'ONLINE (Accepting)' : 'OFFLINE'}
          </button>
          {statusMessage && <p>{statusMessage}</p>}
        </div>

        <div>
          <h3>Wallet Balance: {formatCurrency(walletBalance)}</h3>
          <input type="number" value={withdrawAmount || ''} onChange={(e) => setWithdrawAmount(Number(e.target.value))} placeholder="Min ₦2,000" />
          <button onClick={handleWithdraw}>Payout</button>
        </div>
        
        <div>
          <h3>Lifetime Earnings: {formatCurrency(financialMetrics.runnerEarnings)}</h3>
          <h3>Runs Completed: {financialMetrics.completedCount}</h3>
        </div>

        {currentActiveTask && (
          <div>
            <h3>Active Assignment: {currentActiveTask.title}</h3>
            <p>Pickup: {currentActiveTask.pickup_location}</p>
            <p>Dropoff: {currentActiveTask.delivery_location}</p>
            <Link href={`/dashboard/runner/accepted/${currentActiveTask.id}`}>
              <button>Open Mission View</button>
            </Link>
          </div>
        )}

        <div>
          <button onClick={() => setViewMode('available')}>Available ({availableErrands.length})</button>
          <button onClick={() => setViewMode('history')}>History ({historyErrands.length})</button>
        </div>

        {loading ? (
          <p>Scanning tasks...</p>
        ) : viewMode === 'available' ? (
          availableErrands.length === 0 ? (
            <p>No tasks currently waiting</p>
          ) : (
            <div>
              {availableErrands.map((task) => {
                const payout = Number(task.total_fee) * 0.8;
                return (
                  <div key={task.id} style={{ border: '1px solid gray', margin: '10px 0', padding: '10px' }}>
                    <h4>{task.title}</h4>
                    <p>Pickup: {task.pickup_location}</p>
                    <p>Dropoff: {task.delivery_location}</p>
                    <p>Payout: {formatCurrency(payout)}</p>
                    <button 
                      disabled={accepting === task.id || runnerStatus !== 'online'}
                      onClick={() => handleAccept(task.id)}
                    >
                      {accepting === task.id ? 'Accepting...' : 'Accept Errand'}
                    </button>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          historyErrands.length === 0 ? (
            <p>No completed errand history yet.</p>
          ) : (
            <div>
              {historyErrands.map((task) => (
                <div key={task.id} style={{ border: '1px solid gray', margin: '10px 0', padding: '10px' }}>
                  <h4>{task.title}</h4>
                  <p>Completed on: {new Date(task.created_at).toLocaleDateString()}</p>
                  <p>Earned: +{formatCurrency(Number(task.runner_amount || task.total_fee * 0.8))}</p>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </RunnerGuard>
  );
}
