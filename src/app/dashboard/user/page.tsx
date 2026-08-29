'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { DynamicPricingCard } from '@/components/dynamic-pricing-card';
import { Plus, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function UserDashboard() {
  const { user } = useAppStore();
  const [stats, setStats] = useState({ totalErrands: 0, completed: 0, pending: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;

      try {
        // Fetch user errands stats
        const { data, error } = await supabase
          .from('errands')
          .select('id, status')
          .eq('requester_id', user.id);

        if (error) throw error;

        const completed = data?.filter((e) => e.status === 'completed').length || 0;
        const pending = data?.filter((e) => e.status !== 'completed' && e.status !== 'cancelled').length || 0;

        setStats({
          totalErrands: data?.length || 0,
          completed,
          pending,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
  }, [user]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Welcome Section */}
      <motion.div
        className="mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-5xl font-bold text-white mb-3">
          What needs doing today?
        </h1>
        <p className="text-xl text-white/60">
          Let our runners handle it while you focus on what matters
        </p>
      </motion.div>

      {/* Quick Action */}
      <motion.div
        className="mb-12 glass-card rounded-3xl p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              Post a new errand
            </h2>
            <p className="text-white/60">
              Get matched with a verified runner in seconds
            </p>
          </div>
          <Link
            href="/dashboard/errands/new"
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Create Errand
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {[
          { icon: TrendingUp, label: 'Total Errands', value: stats.totalErrands },
          { icon: CheckCircle, label: 'Completed', value: stats.completed },
          { icon: Clock, label: 'Pending', value: stats.pending },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={idx}
              className="glass-card rounded-2xl p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
            >
              <Icon className="w-8 h-8 text-primary-400 mb-4" />
              <p className="text-white/60 text-sm mb-1">{stat.label}</p>
              <p className="text-4xl font-bold text-white">{stat.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Pricing Preview */}
      <div className="grid lg:grid-cols-3 gap-8 mb-12">
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold text-white mb-6">Pricing Preview</h2>
          <DynamicPricingCard
            category="academic"
            priority="normal"
            distanceKm={2}
            interactive={true}
          />
        </motion.div>

        {/* Quick Features */}
        <motion.div
          className="glass-card rounded-2xl p-6 space-y-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-xl font-bold text-white mb-6">Key Features</h3>
          {[
            '✅ Real-time tracking',
            '🛡️ Comprehensive insurance',
            '⭐ Verified runners',
            '💬 In-app messaging',
            '⚡ Smart matching',
            '📱 Mobile-optimized',
          ].map((feature, idx) => (
            <div key={idx} className="text-white/80 text-sm">
              {feature}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        className="glass-card rounded-2xl p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-2xl font-bold text-white mb-6">Getting Started</h2>
        <div className="space-y-4">
          {[
            { num: '1', title: 'Complete Your Profile', desc: 'Add your student ID and verify your account' },
            { num: '2', title: 'Post an Errand', desc: 'Tell us what you need done and your budget' },
            { num: '3', title: 'Get Matched', desc: 'Our smart system finds the best runner for you' },
            { num: '4', title: 'Track & Confirm', desc: 'Monitor progress in real-time and confirm completion' },
          ].map((step, idx) => (
            <div key={idx} className="flex gap-4 pb-4 border-b border-white/5 last:border-0">
              <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-primary-400 font-bold text-sm">{step.num}</span>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">{step.title}</h4>
                <p className="text-white/60 text-sm">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
