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
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white">Errands</h1>
          <p className="text-white/60 mt-2">Track the status of your requests and open details for live runner updates.</p>
        </div>
        <Link href="/dashboard/errands/new" className="btn-primary flex items-center gap-2 w-full md:w-auto justify-center md:justify-start">
          <Plus className="w-5 h-5" />
          Post Errand
        </Link>
      </div>

      {loading ? (
        <motion.div
          className="glass-card rounded-3xl p-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
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
          <Link href="/dashboard/errands/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Post Your First Errand
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {errands.map((errand) => (
            <motion.article
              key={errand.id}
              className="glass-card rounded-3xl p-6 border border-white/10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{errand.title}</h2>
                  <p className="text-white/50 mt-2">{new Date(errand.created_at).toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">{errand.priority}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">{errand.status}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">₦{Number(errand.total_fee).toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-white/60">View live tracking, payment status, and runner updates.</div>
                <Link href={`/dashboard/user/errand/${errand.id}`} className="inline-flex items-center gap-2 text-primary-300 hover:text-white">
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
