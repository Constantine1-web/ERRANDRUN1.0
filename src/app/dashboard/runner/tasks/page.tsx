'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
    
    const taskToAccept = available.find(t => t.id === id);
    if (taskToAccept && taskToAccept.min_runner_rating && taskToAccept.min_runner_rating > 0) {
      if ((user.rating || 0) < taskToAccept.min_runner_rating) {
        setMessage(`This High Priority task requires a runner rating of ${taskToAccept.min_runner_rating}★ or higher.`);
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
      setAssigned((s) => [{ id, title: '(updating)', pickup_location: '', delivery_location: '', total_fee: 0, status: 'assigned' }, ...s]);
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
      setMessage('Declined errand. It is now available for others.');
      setAssigned((s) => s.filter((t) => t.id !== id));
    } catch (err: any) {
      setMessage(err?.message || 'Failed to decline');
    } finally {
      setActionLoading(null);
    }
  };

  // ── STRIPPED: Awaiting redesign ──
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>My Runner Tasks</h1>
      {message && <p>{message}</p>}

      <section>
        <h2>Assigned to You</h2>
        {loading ? <p>Loading tasks…</p> : assigned.length === 0 ? <p>No current assignments.</p> : (
          <div>
            {assigned.map((t) => (
              <div key={t.id} style={{ border: '1px solid black', padding: '10px', margin: '10px 0' }}>
                <h3>{t.title} - {t.status}</h3>
                <p>Pickup: {t.pickup_location} → Delivery: {t.delivery_location}</p>
                <button onClick={() => router.push(`/dashboard/runner/accepted/${t.id}`)}>Execute Task</button>
                <button onClick={() => decline(t.id)} disabled={actionLoading === t.id}>Decline</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2>Available Errands</h2>
        {loading ? <p>Loading errands…</p> : available.length === 0 ? <p>No errands available.</p> : (
          <div>
            {available.map((t) => (
              <div key={t.id} style={{ border: '1px solid black', padding: '10px', margin: '10px 0' }}>
                <h3>{t.title}</h3>
                <p>Pickup: {t.pickup_location} → Delivery: {t.delivery_location}</p>
                <p>Payout: {formatCurrency(Number(t.total_fee) * 0.8)}</p>
                <button onClick={() => accept(t.id)} disabled={actionLoading === t.id}>Accept</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
