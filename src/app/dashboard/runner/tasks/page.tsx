'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { formatCurrency } from '@/utils/pricing';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Runner Tasks</h1>
        <p className="text-slate-500 text-xs mt-0.5">Manage your active contracts and browse unassigned tasks.</p>
      </div>

      {message && (
        <div className={`p-3 rounded-xl flex items-center gap-2 text-xs ${
          message.toLowerCase().includes('fail') || message.toLowerCase().includes('require') 
            ? 'text-red-700 bg-red-50 border border-red-200' 
            : 'text-green-700 bg-green-50 border border-green-200'
        }`}>
          <AlertCircle className="w-4 h-4" />
          {message}
        </div>
      )}

      {/* Assigned Tasks */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide">Assigned to You</h2>
        {loading ? (
          <Card className="p-8 text-center text-slate-400 text-xs">Loading tasks…</Card>
        ) : assigned.length === 0 ? (
          <Card className="p-8 text-center text-slate-400 text-xs">
            No current assignments. Accept an errand below.
          </Card>
        ) : (
          <div className="space-y-3">
            {assigned.map((t) => (
              <Card key={t.id} className="border-blue-200 shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold text-slate-900">{t.title}</CardTitle>
                  <Badge variant="info">{t.status.replace('_', ' ')}</Badge>
                </CardHeader>
                <CardContent className="pb-3 text-xs text-slate-600 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>{t.pickup_location} → {t.delivery_location}</span>
                  </p>
                  {t.eta_minutes && (
                    <p className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>ETA: {t.eta_minutes} min</span>
                    </p>
                  )}
                </CardContent>
                <CardFooter className="flex gap-2 pt-0">
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => router.push(`/dashboard/runner/accepted/${t.id}`)}
                    className="font-bold text-xs"
                  >
                    Execute Task
                  </Button>
                  <Button 
                    variant="danger" 
                    size="sm"
                    onClick={() => decline(t.id)} 
                    isLoading={actionLoading === t.id}
                    className="text-xs"
                  >
                    Decline
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Available Errands */}
      <section className="space-y-3 pt-4">
        <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide">Available Errands</h2>
        {loading ? (
          <Card className="p-8 text-center text-slate-400 text-xs">Loading errands…</Card>
        ) : available.length === 0 ? (
          <Card className="p-8 text-center text-slate-400 text-xs">
            No errands currently available.
          </Card>
        ) : (
          <div className="space-y-3">
            {available.map((t) => (
              <Card key={t.id} className="hover:border-blue-300 transition-all">
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base">{t.title}</h3>
                      {t.min_runner_rating && t.min_runner_rating > 0 && (
                        <Badge variant="warning">★ {t.min_runner_rating}+ Rating</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      📍 {t.pickup_location} → 📦 {t.delivery_location}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <span className="font-mono text-green-600 text-lg font-bold block leading-none">
                        {formatCurrency(Number(t.total_fee) * 0.8)}
                      </span>
                      <span className="text-[10px] text-slate-400">80% Payout</span>
                    </div>
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => accept(t.id)} 
                      isLoading={actionLoading === t.id}
                      className="font-bold text-xs"
                    >
                      Accept
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
