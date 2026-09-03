'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Clock, AlertCircle, Bike, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { formatCurrency } from '@/utils/pricing';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface ErrandTask {
  id: string;
  title: string;
  pickup_location: string;
  delivery_location: string;
  total_fee: number;
  status: string;
  runner_id?: string | null;
  priority?: string;
  eta_minutes?: number | null;
  min_runner_rating?: number;
}

export default function RunnerTasksPage() {
  const router = useRouter();
  const { user } = useAppStore();
  const [assigned, setAssigned] = useState<ErrandTask[]>([]);
  const [available, setAvailable] = useState<ErrandTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const assignedRes = await fetch(`/api/runner/tasks?runnerId=${user.id}`);
        const assignedJson = await assignedRes.json();
        setAssigned(assignedJson.tasks || []);

        const { data: availData, error: availErr } = await supabase
          .from('errands')
          .select('id, title, pickup_location, delivery_location, total_fee, status, priority, min_runner_rating')
          .eq('status', 'unassigned')
          .order('created_at', { ascending: false });

        if (availErr) {
          console.error('Failed to fetch available errands', availErr);
        } else {
          setAvailable(availData || []);
        }
      } catch (err) {
        console.error('Failed to load runner tasks page', err);
      }
      setLoading(false);
    };

    load();
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;

    const assignedChannel = supabase
      .channel(`runner_assigned_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'errands', filter: `runner_id.eq.${user.id}` },
        (payload) => {
          setAssigned((prev) => {
            const copy = [...prev];
            const newItem = payload.new as Partial<ErrandTask> | undefined;
            const oldItem = payload.old as Partial<ErrandTask> | undefined;
            const idToFind = newItem?.id || oldItem?.id;
            if (!idToFind) return copy;
            const idx = copy.findIndex((e) => e.id === idToFind);

            if (payload.eventType === 'DELETE') {
              if (idx > -1) copy.splice(idx, 1);
            } else if (payload.eventType === 'UPDATE') {
              if (idx > -1 && newItem) copy[idx] = newItem as ErrandTask;
              else if (newItem) copy.unshift(newItem as ErrandTask);
            } else if (payload.eventType === 'INSERT') {
              if (newItem) copy.unshift(newItem as ErrandTask);
            }

            return copy;
          });

          const newItemStatus = (payload.new as Partial<ErrandTask> | undefined)?.status;
          const newItemId = (payload.new as Partial<ErrandTask> | undefined)?.id;
          if (newItemStatus === 'unassigned' && newItemId) {
            setAssigned((prev) => prev.filter((t) => t.id !== newItemId));
          }
        }
      )
      .subscribe();

    const availableChannel = supabase
      .channel(`runner_available_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'errands', filter: `status.eq.unassigned` },
        (payload) => {
          setAvailable((prev) => {
            const copy = [...prev];
            const newItem = payload.new as Partial<ErrandTask> | undefined;
            const oldItem = payload.old as Partial<ErrandTask> | undefined;
            const id = newItem?.id || oldItem?.id;
            if (!id) return copy;
            const idx = copy.findIndex((e) => e.id === id);

            if (payload.eventType === 'DELETE') {
              if (idx > -1) copy.splice(idx, 1);
            } else if (payload.eventType === 'UPDATE') {
              if (newItem && newItem.status === 'unassigned') {
                if (idx > -1) copy[idx] = newItem as ErrandTask;
                else copy.unshift(newItem as ErrandTask);
              } else {
                if (idx > -1) copy.splice(idx, 1);
              }
            } else if (payload.eventType === 'INSERT') {
              if (newItem) copy.unshift(newItem as ErrandTask);
            }

            return copy;
          });

          const claimedBy = (payload.new as Partial<ErrandTask> | undefined)?.runner_id;
          const newItemId = (payload.new as Partial<ErrandTask> | undefined)?.id;
          if (claimedBy && newItemId) {
            setAvailable((prev) => prev.filter((t) => t.id !== newItemId));
          }
        }
      )
      .subscribe();

    return () => {
      assignedChannel.unsubscribe();
      availableChannel.unsubscribe();
    };
  }, [user?.id]);

  const accept = async (id: string) => {
    if (!user?.id) return;

    const taskToAccept = available.find((t) => t.id === id);
    if (taskToAccept && taskToAccept.min_runner_rating && taskToAccept.min_runner_rating > 0) {
      if ((user.rating || 0) < taskToAccept.min_runner_rating) {
        setMessage(`This task requires a runner rating of ${taskToAccept.min_runner_rating}★ or higher.`);
        return;
      }
    }

    setActionLoading(id);
    setMessage(null);
    try {
      const res = await fetch('/api/errands/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errandId: id, runnerId: user.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Accept failed');
      setMessage('Accepted errand.');
      setAssigned((s) => [
        { id, title: '(updating)', pickup_location: '', delivery_location: '', total_fee: 0, status: 'assigned' },
        ...s,
      ]);
      setAvailable((a) => a.filter((x) => x.id !== id));
      router.push(`/dashboard/runner/accepted/${id}`);
    } catch (err: any) {
      setMessage(err?.message || 'Failed to accept');
    } finally {
      setActionLoading(null);
    }
  };

  const decline = async (id: string) => {
    if (!user?.id) return;
    setActionLoading(id);
    setMessage(null);
    try {
      const res = await fetch('/api/errands/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errandId: id, runnerId: user.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Decline failed');
      setMessage('Declined errand.');
      setAssigned((s) => s.filter((t) => t.id !== id));
    } catch (err: any) {
      setMessage(err?.message || 'Failed to decline');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6 animate-fadeIn">

      {/* ── HEADER ── */}
      <div className="pb-4 border-b border-slate-200">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Flight Operations
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Runner Mission Roster
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Review tasks currently assigned to you and browse unassigned campus errands.
        </p>
      </div>

      {message && (
        <div className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-medium border ${
          message.toLowerCase().includes('fail') || message.toLowerCase().includes('require')
            ? 'text-rose-700 bg-rose-50 border-rose-200'
            : 'text-emerald-700 bg-emerald-50 border-emerald-200'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* ── SECTION 1: ASSIGNED MISSIONS ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Assigned to You
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black">
            {assigned.length} Active
          </span>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-xs text-slate-400 animate-pulse">
            Loading active assignments…
          </div>
        ) : assigned.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-dashed border-slate-300 text-center space-y-1">
            <p className="text-sm font-bold text-slate-800">No active assignments</p>
            <p className="text-xs text-slate-500">Claim an errand from the list below or on the Opportunity Radar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assigned.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-3xl border-2 border-blue-500/80 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="info" className="text-[10px] uppercase font-black tracking-wider">
                      {t.status.replace('_', ' ')}
                    </Badge>
                    {t.priority === 'urgent' && (
                      <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-black uppercase">
                        Urgent
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{t.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{t.pickup_location} → {t.delivery_location}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => router.push(`/dashboard/runner/accepted/${t.id}`)}
                    className="font-bold text-xs shadow-sm"
                  >
                    <Bike className="w-4 h-4 mr-1.5" />
                    Launch Console
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => decline(t.id)}
                    isLoading={actionLoading === t.id}
                    className="text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── SECTION 2: OPEN CAMPUS ERRANDS ── */}
      <section className="space-y-3 pt-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Open Campus Errands
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black">
            {available.length} Available
          </span>
        </div>

        {available.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-dashed border-slate-300 text-center text-xs text-slate-400">
            No unassigned errands waiting right now.
          </div>
        ) : (
          <div className="space-y-3">
            {available.map((t) => {
              const payout = Number(t.total_fee) * 0.8;
              return (
                <div
                  key={t.id}
                  className="bg-white hover:bg-slate-50 border border-slate-200 rounded-3xl p-5 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base">{t.title}</h3>
                      {t.min_runner_rating && t.min_runner_rating > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                          ★ {t.min_runner_rating}+ Rating Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      📍 {t.pickup_location} → 📦 {t.delivery_location}
                    </p>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                    <div className="text-left md:text-right">
                      <span className="font-mono text-xl font-black text-emerald-600 block leading-none">
                        {formatCurrency(payout)}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">80% Payout</span>
                    </div>

                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => accept(t.id)}
                      isLoading={actionLoading === t.id}
                      className="font-bold text-xs"
                    >
                      Accept Task
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
