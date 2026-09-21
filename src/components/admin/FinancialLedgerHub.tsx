'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { ShieldAlert, Search, RefreshCw, PowerOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/utils/pricing';

export function FinancialLedgerHub() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lookupId, setLookupId] = useState('');
  const [traceResult, setTraceResult] = useState<any>(null);
  const [tracing, setTracing] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('financial_settings').select('*').eq('id', 1).single();
    if (error) {
      toast.error('Failed to load financial settings');
    } else {
      setSettings(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const toggleCircuitBreaker = async (field: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('financial_settings')
        .update({ [field]: !currentValue })
        .eq('id', 1);
      
      if (error) throw error;
      toast.success('Circuit breaker toggled successfully');
      fetchSettings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle circuit breaker');
    }
  };

  const runOneNairaTrace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupId) return;
    
    setTracing(true);
    try {
      // Execute the RPC for One Naira Story trace
      const { data, error } = await supabase.rpc('trace_one_naira_story', { p_lookup_id: lookupId });
      if (error) throw error;
      
      setTraceResult(data);
    } catch (err: any) {
      toast.error(err.message || 'Trace failed');
    } finally {
      setTracing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Financial Ledger Hub & Circuit Breakers
        </h2>
        <Button size="sm" onClick={fetchSettings} variant="outline" className="gap-2 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Circuit Breakers Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Circuit Breakers</h3>
              <p className="text-xs text-slate-500">Instantly halt platform financial movements</p>
            </div>
          </div>

          {loading ? (
            <div className="h-20 flex items-center justify-center text-xs text-slate-400">Loading settings...</div>
          ) : (
            <div className="space-y-3">
              {[
                { id: 'wallet_funding_paused', label: 'Student Wallet Funding' },
                { id: 'withdrawals_paused', label: 'Runner Withdrawals' },
                { id: 'automated_payouts_paused', label: 'Automated Payouts' },
                { id: 'automated_refunds_paused', label: 'Automated Refunds' },
              ].map(breaker => (
                <div key={breaker.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                  <span className="text-xs font-bold text-slate-700">{breaker.label}</span>
                  <button
                    onClick={() => toggleCircuitBreaker(breaker.id, settings?.[breaker.id])}
                    className={`relative w-12 h-6 rounded-full transition-colors flex items-center px-1 ${
                      settings?.[breaker.id] ? 'bg-red-500 justify-end' : 'bg-emerald-500 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* One Naira Story Tracer */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white">One Naira Story Trace</h3>
              <p className="text-xs text-slate-400">Investigate financial operations</p>
            </div>
          </div>

          <form onSubmit={runOneNairaTrace} className="flex gap-2">
            <input
              type="text"
              placeholder="Operation ID, User ID, or Errand ID"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-white placeholder-slate-500"
            />
            <Button type="submit" size="sm" variant="primary" disabled={tracing || !lookupId}>
              {tracing ? 'Tracing...' : 'Trace'}
            </Button>
          </form>

          {traceResult && (
            <div className="bg-slate-800 rounded-xl p-3 text-[10px] font-mono text-emerald-400 overflow-auto max-h-48 border border-slate-700">
              <pre>{JSON.stringify(traceResult, null, 2)}</pre>
            </div>
          )}
          {!traceResult && !tracing && (
            <div className="text-[10px] text-slate-500 text-center py-4">
              Enter an ID to trace its double-entry journal lifecycle across the platform.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
