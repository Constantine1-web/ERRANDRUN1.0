'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { formatCurrency } from '@/utils/pricing';
import {
  Search,
  PlusCircle,
  MapPin,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle
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

export default function ErrandsChroniclePage() {
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6 animate-fadeIn">

      {/* ── HEADER & DISPATCH BUTTON ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Activity Ledger
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            My Errand Chronicle
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Full history of your dispatched campus requests and live deliveries.
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => router.push('/dashboard/errands/new')}
          className="font-bold text-sm shadow-sm shrink-0"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Dispatch New Errand
        </Button>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All Tasks', count: errands.length },
            { id: 'active', label: 'In-Flight', count: errands.filter(e => ['unassigned', 'assigned', 'in_progress'].includes(e.status)).length },
            { id: 'completed', label: 'Delivered', count: errands.filter(e => e.status === 'completed').length },
            { id: 'issues', label: 'Disputes / Cancelled', count: errands.filter(e => ['disputed', 'cancelled'].includes(e.status)).length },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
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
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* ── ACTIVITY STREAM LIST ── */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading your errand ledger…
        </div>
      ) : filteredErrands.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <p className="text-sm font-bold text-slate-800">No errands found</p>
          <p className="text-xs text-slate-500">
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
                className="bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-5 cursor-pointer transition-all hover:border-blue-300 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={
                        isDelivered ? 'success' :
                        isInFlight ? 'info' : 'danger'
                      }
                      className="text-[10px] uppercase font-black tracking-wider"
                    >
                      {errand.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-[11px] font-semibold text-slate-400 capitalize">
                      {errand.category?.replace('_', ' ') || 'Errand'}
                    </span>
                    <span className="text-[11px] text-slate-300 font-mono">•</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(errand.created_at).toLocaleDateString()} at{' '}
                      {new Date(errand.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">
                    {errand.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="font-medium truncate max-w-[200px]">{errand.pickup_location}</span>
                    <span className="text-slate-300">→</span>
                    <span className="font-medium truncate max-w-[200px]">{errand.delivery_location}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                  {errand.delivery_pin && isInFlight && (
                    <div className="text-left md:text-right">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">PIN</span>
                      <span className="font-mono text-sm font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {errand.delivery_pin}
                      </span>
                    </div>
                  )}

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total Secured</span>
                    <span className="font-mono text-lg font-black text-emerald-600">
                      {formatCurrency(errand.total_fee)}
                    </span>
                  </div>

                  <Button size="sm" variant="outline" className="font-bold text-xs">
                    Flight Details <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
