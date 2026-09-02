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
    
    // Check runner rating requirement
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
    <div className="min-h-screen bg-[#121824] w-full">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-semibold text-white mb-6">My Runner Tasks</h1>
        {message && (
          <div className={`mb-6 flex items-center gap-2 text-sm p-4 rounded-xl ${message.toLowerCase().includes('fail') || message.toLowerCase().includes('require') ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20' : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'}`}>
            <AlertCircle className="w-5 h-5" />
            {message}
          </div>
        )}

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Assigned to you</h2>
          {loading ? (
            <div className="text-white/60">Loading…</div>
          ) : assigned.length === 0 ? (
            <Card className="bg-white/5 border-dashed border-white/10">
              <CardContent className="p-8 text-center text-white/60">
                <p>No current assignments.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {assigned.map((t) => (
                <Card key={t.id}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <CardTitle className="text-lg">{t.title}</CardTitle>
                      <Badge variant="info" className="w-fit whitespace-nowrap">{t.status.replace('_', ' ')}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="space-y-2">
                      <p className="text-sm text-white/70 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-white/50 shrink-0" /> 
                        <span>{t.pickup_location} <span className="mx-1 text-white/40">→</span> {t.delivery_location}</span>
                      </p>
                      <p className="text-sm text-white/70 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-white/50 shrink-0" />
                        <span>ETA: {t.eta_minutes ? `${t.eta_minutes} min` : 'N/A'}</span>
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col sm:flex-row gap-3 pt-0">
                    <Button 
                      variant="primary" 
                      onClick={() => router.push(`/dashboard/runner/track/${t.id}`)}
                      className="w-full sm:w-auto"
                    >
                      <MapPin className="w-4 h-4 mr-2" /> View route
                    </Button>
                    <Button 
                      variant="danger" 
                      onClick={() => decline(t.id)} 
                      isLoading={actionLoading === t.id}
                      className="w-full sm:w-auto"
                    >
                      Decline
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Available errands</h2>
          {loading ? (
            <div className="text-white/60">Loading…</div>
          ) : available.length === 0 ? (
            <Card className="bg-white/5 border-dashed border-white/10">
              <CardContent className="p-8 text-center text-white/60">
                <p>No available errands.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {available.map((t) => (
                <Card key={t.id}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      <div>
                        <CardTitle className="text-lg">{t.title}</CardTitle>
                        {t.min_runner_rating && t.min_runner_rating > 0 && (
                          <Badge variant="warning" className="mt-2 w-fit">
                            ★ {t.min_runner_rating}+ Rating Required
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col sm:items-end">
                        <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">Payout</span>
                        <strong className="font-mono text-emerald-400 text-xl font-bold">
                          {formatCurrency(Number(t.total_fee) * 0.8)}
                        </strong>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <p className="text-sm text-white/70 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-white/50 shrink-0" /> 
                      <span>{t.pickup_location} <span className="mx-1 text-white/40">→</span> {t.delivery_location}</span>
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-end pt-0">
                    <Button 
                      variant="primary" 
                      onClick={() => accept(t.id)} 
                      isLoading={actionLoading === t.id}
                      className="w-full sm:w-auto"
                    >
                      Accept Errand
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
