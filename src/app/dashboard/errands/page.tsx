'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { formatCurrency } from '@/utils/pricing';
import {
  Search,
  Plus,
  MapPin,
  Clock,
  ArrowRight,
  Package,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface ErrandSummary {
  id: string;
  title: string;
  status: string;
  category: string;
  pickup_location: string;
  delivery_location: string;
  total_fee: number;
  priority: string;
  delivery_pin?: string;
  created_at: string;
}

export default function ErrandsActivityPage() {
  const router = useRouter();
  const { user } = useAppStore();
  const [errands, setErrands] = useState<ErrandSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'issues'>('all');

  useEffect(() => {
    const fetchErrands = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('errands')
        .select('*')
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

  const filteredErrands = errands.filter((errand) => {
    const matchesSearch =
      errand.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      errand.pickup_location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      errand.delivery_location?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'active') {
      return ['unassigned', 'assigned', 'in_progress'].includes(errand.status);
    }
    if (statusFilter === 'completed') {
      return errand.status === 'completed';
    }
    if (statusFilter === 'issues') {
      return ['disputed', 'cancelled'].includes(errand.status);
    }
    return true;
  });

  return (
    <div className="py-6 sm:py-8 space-y-6 animate-fadeIn">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Activity & Past Errands
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track active deliveries and review your completed campus orders.
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => router.push('/dashboard/errands/new')}
          className="font-bold text-xs sm:text-sm shadow-md shrink-0 h-12"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Request New Errand
        </Button>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All', count: errands.length },
            { id: 'active', label: 'In-Flight', count: errands.filter(e => ['unassigned', 'assigned', 'in_progress'].includes(e.status)).length },
            { id: 'completed', label: 'Delivered', count: errands.filter(e => e.status === 'completed').length },
            { id: 'issues', label: 'Cancelled', count: errands.filter(e => ['disputed', 'cancelled'].includes(e.status)).length },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tasks, locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* ── ACTIVITY STREAM LIST ── */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading activity ledger…
        </div>
      ) : filteredErrands.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center space-y-3">
          <Package className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No errands found</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {searchQuery ? 'Try adjusting your search criteria.' : 'You have not dispatched any errands in this category yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredErrands.map((errand) => {
            const isDelivered = errand.status === 'completed';
            const isInFlight = ['unassigned', 'assigned', 'in_progress'].includes(errand.status);
            return (
              <div
                key={errand.id}
                onClick={() => router.push(`/dashboard/user/errand/${errand.id}`)}
                className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all hover:border-blue-300 dark:hover:border-blue-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {errand.category.replace('_', ' ')}
                    </span>
                    <Badge
                      variant={isDelivered ? 'success' : isInFlight ? 'info' : 'danger'}
                      className="text-[10px] uppercase font-bold"
                    >
                      {errand.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                    {errand.title}
                  </h3>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="truncate">📍 From: {errand.pickup_location}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="truncate">📦 To: {errand.delivery_location}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-left md:text-right">
                    <span className="font-mono font-black text-base text-slate-900 dark:text-white block">
                      {formatCurrency(errand.total_fee)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(errand.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold text-xs">
                    <span>Details</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
