'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Plus, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';

interface ErrandSummary {
  id: string;
  title: string;
  status: string;
  total_fee: number;
  priority: string;
  created_at: string;
}

export default function ErrandsPage() {
  const { user } = useAppStore();
  const [errands, setErrands] = useState<ErrandSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchErrands = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('errands')
        .select('id, title, status, total_fee, priority, created_at')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch errands:', error);
      } else {
        setErrands(data || []);
      }

      setLoading(false);
    };

    fetchErrands();
  }, [user]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="heading-page text-white">Errands</h1>
          <p className="text-white/60 mt-2">Track the status of your requests and open details for live runner updates.</p>
        </div>
        <Link href="/dashboard/errands/new" className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center">
          <Plus className="w-5 h-5" />
          Post Errand
        </Link>
      </div>

      {loading ? (
        <motion.div
          className="glass-card rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="skeleton-avatar w-12 h-12 rounded-full mx-auto" />
          <div className="skeleton-text w-32 h-4 mx-auto" />
          <p className="text-white/60">Loading your errands…</p>
        </motion.div>
      ) : errands.length === 0 ? (
        <motion.div
          className="glass-card rounded-3xl p-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Zap className="w-16 h-16 text-white/20 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-3">No errands yet</h2>
          <p className="text-white/60 mb-8 max-w-sm mx-auto">
            Create your first errand and get matched with a verified runner.
          </p>
          <Link href="/dashboard/errands/new" className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            Post Your First Errand
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {errands.map((errand) => (
            <motion.article
              key={errand.id}
              className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-semibold text-white truncate">{errand.title}</h2>
                  <p className="text-white/50 mt-1 text-sm">{new Date(errand.created_at).toLocaleString()}</p>
                </div>
                <div className="flex flex-row overflow-x-auto scrollbar-none items-center gap-2 pb-2 sm:pb-0">
                  <span className="badge-neutral whitespace-nowrap">{errand.priority}</span>
                  <span className={`whitespace-nowrap ${errand.status === 'completed' ? 'badge-success' : errand.status === 'pending' ? 'badge-warning' : errand.status === 'cancelled' ? 'badge-danger' : 'badge-info'}`}>
                    {errand.status}
                  </span>
                  <span className="badge-neutral whitespace-nowrap font-mono">₦{Number(errand.total_fee).toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-white/60 line-clamp-2 sm:line-clamp-1">View live tracking, payment status, and runner updates.</div>
                <Link href={`/dashboard/user/errand/${errand.id}`} className="inline-flex items-center justify-center sm:justify-start gap-2 text-primary-300 hover:text-primary-400 w-full sm:w-auto p-2 sm:p-0 border sm:border-none border-white/10 rounded-lg sm:rounded-none">
                  View details <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      <div className="grid gap-6 mt-10 md:grid-cols-3">
        <div className="glass-card rounded-3xl p-6">
          <CheckCircle className="w-8 h-8 text-primary-400 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Live updates</h3>
          <p className="text-white/60 text-sm">Every errand refreshes automatically through our Supabase realtime channel.</p>
        </div>
        <div className="glass-card rounded-3xl p-6">
          <Clock className="w-8 h-8 text-primary-400 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Payment control</h3>
          <p className="text-white/60 text-sm">Errands stay pending until Paystack payment is completed.</p>
        </div>
        <div className="glass-card rounded-3xl p-6">
          <Zap className="w-8 h-8 text-primary-400 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Smart routing</h3>
          <p className="text-white/60 text-sm">Verified campus runners can claim errands as soon as they are available.</p>
        </div>
      </div>
    </div>
  );
}
