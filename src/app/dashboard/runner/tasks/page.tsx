'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { formatCurrency } from '@/utils/pricing';

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
}

export default function RunnerTasksPage() {
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
          .select('id, title, pickup_location, delivery_location, total_fee, status, priority')
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

  // Realtime subscriptions: assigned to this runner and available errands
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

          // if an assigned errand becomes unassigned, remove it from assigned list
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
              // if updated to unassigned, add; otherwise remove
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

          // if an available errand is claimed by someone, remove it
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
      // refresh lists
      setAssigned((s) => [{ id, title: '(updating)', pickup_location: '', delivery_location: '', total_fee: 0, status: 'assigned' }, ...s]);
      setAvailable((a) => a.filter((x) => x.id !== id));
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
      setMessage('Declined errand. It is now available for others.');
      setAssigned((s) => s.filter((t) => t.id !== id));
    } catch (err: any) {
      setMessage(err?.message || 'Failed to decline');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold text-white mb-4">My Runner Tasks</h1>
      {message ? <div className="mb-4 text-sm text-emerald-300">{message}</div> : null}

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-2">Assigned to you</h2>
        {loading ? (
          <div className="text-white/60">Loading…</div>
        ) : assigned.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-white/60">
            <p>No current assignments.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assigned.map((t) => (
              <div key={t.id} className="rounded-lg border border-white/10 p-4 bg-slate-950/70">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-lg text-white font-semibold">{t.title}</h3>
                    <p className="text-sm text-white/60">{t.pickup_location} → {t.delivery_location}</p>
                    <p className="text-sm text-white/60 mt-1">Status: {t.status.replace('_', ' ')}</p>
                    <p className="text-sm text-white/60">ETA: {t.eta_minutes ? `${t.eta_minutes} min` : 'N/A'}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                    <Link href={`/dashboard/runner/track/${t.id}`} className="btn-primary w-full sm:w-auto inline-flex justify-center items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4" /> View route
                    </Link>
                    <button onClick={() => decline(t.id)} disabled={actionLoading === t.id} className="btn-danger w-full sm:w-auto text-sm">
                      {actionLoading === t.id ? 'Processing…' : 'Decline'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white mb-2">Available errands</h2>
        {loading ? (
          <div className="text-white/60">Loading…</div>
        ) : available.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-white/60">
            <p>No available errands.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {available.map((t) => (
              <div key={t.id} className="rounded-lg border border-white/10 p-4 bg-slate-950/70">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-col">
                    <h3 className="text-lg text-white font-semibold">{t.title}</h3>
                    <p className="text-sm text-white/60">{t.pickup_location} → {t.delivery_location}</p>
                  </div>
                  <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto">
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto text-sm">
                      <span className="text-white/60">Payout</span>
                      <strong className="font-mono text-emerald-400 font-bold text-lg">{formatCurrency(Number(t.total_fee) * 0.8)}</strong>
                    </div>
                    <button onClick={() => accept(t.id)} disabled={actionLoading === t.id} className="btn-primary w-full sm:w-auto">
                      {actionLoading === t.id ? 'Accepting…' : 'Accept'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

