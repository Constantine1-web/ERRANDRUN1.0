'use client';

import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';
import { formatCurrency } from '@/utils/pricing';
import {
  ShieldCheck,
  Radio,
  Users,
  AlertTriangle,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  ExternalLink,
  Search,
  Building2,
  RefreshCw,
  Sliders,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface RunnerApp {
  id: string;
  user_id: string;
  reg_number: string;
  campus_record_checked: boolean;
  transport_method: string;
  availability_schedule: Record<string, string[]>;
  document_proof_url: string;
  status: 'pending' | 'approved' | 'denied';
  admin_notes?: string;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string;
    student_id: string;
    phone_number: string;
    role: string;
    verification_status: string;
    avatar_url?: string;
  };
}

interface ErrandRecord {
  id: string;
  title: string;
  description: string;
  category: string;
  pickup_location: string;
  delivery_location: string;
  total_fee: number;
  platform_fee: number;
  runner_amount: number;
  status: string;
  priority: string;
  created_at: string;
  requester?: { id: string; full_name: string; phone_number: string; student_id: string };
  runner?: { id: string; full_name: string; phone_number: string; student_id: string; rating?: number };
}

interface DisputeRecord {
  id: string;
  errand_id: string;
  reason: string;
  description: string;
  status: 'open' | 'under_review' | 'resolved' | 'closed';
  resolution_type?: string;
  resolution_amount?: number;
  admin_notes?: string;
  created_at: string;
  initiator?: { id: string; full_name: string; phone_number: string };
  respondent?: { id: string; full_name: string; phone_number: string };
  errand?: {
    id: string;
    title: string;
    total_fee: number;
    status: string;
    delivery_pin?: string;
    pickup_photo_url?: string;
    dropoff_photo_url?: string;
  };
}

interface PlatformStats {
  totalErrands: number;
  completedCount: number;
  activeCount: number;
  totalRevenue: number;
  totalVolume: number;
  totalRunnerPayouts: number;
  totalRunners: number;
  pendingApplications: number;
  totalUsers: number;
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setAuthorized(false); return; }
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      setAuthorized(data?.role === 'admin');
    });
  }, []);

  if (authorized === null) {
    return <div className="p-16 text-center text-xs text-slate-400">Authenticating Operations Credentials…</div>;
  }
  if (!authorized) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500">Only verified platform administrators can enter the Operations Command Room.</p>
      </div>
    );
  }

  return <>{children}</>;
}

type TabId = 'verification' | 'disputes' | 'errands' | 'payouts';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('verification');

  // Runner Apps State
  const [appStatusFilter, setAppStatusFilter] = useState<'pending' | 'approved' | 'denied' | 'all'>('pending');
  const [applications, setApplications] = useState<RunnerApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);

  // Errands State
  const [errands, setErrands] = useState<ErrandRecord[]>([]);
  const [errandStatusFilter, setErrandStatusFilter] = useState<string>('all');
  const [loadingErrands, setLoadingErrands] = useState(false);

  // Disputes State
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [loadingDisputes, setLoadingDisputes] = useState(false);
  const [disputeNotes, setDisputeNotes] = useState<Record<string, string>>({});

  // Stats State
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Payouts State
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [processingPayoutId, setProcessingPayoutId] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // ── Fetchers ──────────────────────────────────────────────────────────────
  const fetchPayouts = useCallback(async () => {
    setLoadingPayouts(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, profiles(full_name, bank_name, account_number, account_name)')
        .eq('type', 'withdrawal')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPayouts(data || []);
    } catch {
      toast.error('Failed to load pending payouts');
    } finally {
      setLoadingPayouts(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch admin stats', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    try {
      setLoadingApps(true);
      const res = await fetch(`/api/admin/runners?status=${appStatusFilter}`);
      const data = await res.json();
      if (data.success) setApplications(data.data || []);
    } catch {
      toast.error('Could not load runner applications');
    } finally {
      setLoadingApps(false);
    }
  }, [appStatusFilter]);

  const fetchErrands = useCallback(async () => {
    try {
      setLoadingErrands(true);
      const res = await fetch(`/api/admin/errands?status=${errandStatusFilter}`);
      const data = await res.json();
      if (data.success) setErrands(data.data || []);
    } catch {
      toast.error('Could not load platform errands');
    } finally {
      setLoadingErrands(false);
    }
  }, [errandStatusFilter]);

  const fetchDisputes = useCallback(async () => {
    try {
      setLoadingDisputes(true);
      const res = await fetch('/api/admin/disputes');
      const data = await res.json();
      if (data.success) setDisputes(data.data || []);
    } catch {
      toast.error('Failed to fetch disputes');
    } finally {
      setLoadingDisputes(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'verification') fetchApplications();
    if (activeTab === 'errands') fetchErrands();
    if (activeTab === 'disputes') fetchDisputes();
    if (activeTab === 'payouts') fetchPayouts();
  }, [activeTab, fetchApplications, fetchErrands, fetchDisputes, fetchPayouts]);

  // ── Action Handlers ───────────────────────────────────────────────────────
  const handleReview = async (app: RunnerApp, action: 'approve' | 'reject') => {
    try {
      setProcessingId(app.id);
      const notes = adminNotes[app.id] || '';
      const res = await fetch('/api/admin/runners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId: app.id, userId: app.user_id, action, adminNotes: notes }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || 'Review failed');
      toast.success(action === 'approve' ? 'Runner verified and activated!' : 'Application rejected');
      await Promise.all([fetchApplications(), fetchStats()]);
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleErrandAction = async (errandId: string, action: 'cancel' | 'complete' | 'unassign') => {
    try {
      const res = await fetch('/api/admin/errands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errandId, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Action failed');
      toast.success(data.message || 'Errand state updated');
      await Promise.all([fetchErrands(), fetchStats()]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update errand');
    }
  };

  const handleProcessPayout = async (transactionId: string) => {
    setProcessingPayoutId(transactionId);
    try {
      const res = await fetch('/api/admin/payouts/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Payout transferred via Paystack!');
      fetchPayouts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process payout');
    } finally {
      setProcessingPayoutId(null);
    }
  };

  const handleResolveDispute = async (d: DisputeRecord, action: 'refund' | 'payout_runner' | 'no_action') => {
    try {
      const res = await fetch('/api/admin/disputes/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disputeId: d.id,
          errandId: d.errand_id,
          resolutionType: action,
          adminNotes: disputeNotes[d.id] || '',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Resolution failed');
      toast.success('Dispute resolved & escrow settled!');
      fetchDisputes();
    } catch (err: any) {
      toast.error(err.message || 'Failed to resolve dispute');
    }
  };

  return (
    <AdminGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-8 animate-fadeIn">

        {/* ── TOP OPS ROOM BANNER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-700">
                Command & Control
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Campus Operations Center
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live oversight of campus tasks, runner verifications, escrow disputes, and treasury payouts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchStats();
                if (activeTab === 'verification') fetchApplications();
                if (activeTab === 'errands') fetchErrands();
                if (activeTab === 'disputes') fetchDisputes();
                if (activeTab === 'payouts') fetchPayouts();
              }}
              className="text-xs font-bold gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              Refresh Grid
            </Button>
          </div>
        </div>

        {/* ── TELEMETRY HIGH-DENSITY HUD (5 STATS) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Volume</span>
            <span className="text-xl font-black text-slate-900 font-mono">
              {formatCurrency(stats?.totalVolume || 0)}
            </span>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Active In-Flight</span>
            <span className="text-xl font-black text-blue-600 font-mono">
              {stats?.activeCount || 0}
            </span>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Active Runners</span>
            <span className="text-xl font-black text-emerald-600 font-mono">
              {stats?.totalRunners || 0}
            </span>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pending KYC</span>
            <span className="text-xl font-black text-amber-600 font-mono">
              {stats?.pendingApplications || 0}
            </span>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Platform Revenue</span>
            <span className="text-xl font-black text-purple-600 font-mono">
              {formatCurrency(stats?.totalRevenue || 0)}
            </span>
          </div>
        </div>

        {/* ── WORKSPACE TABS ── */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          {[
            { id: 'verification', label: 'Runner Verification Queue', count: applications.filter(a => a.status === 'pending').length },
            { id: 'disputes', label: 'Dispute Adjudication', count: disputes.filter(d => d.status === 'open').length },
            { id: 'errands', label: 'Campus Errands Monitor', count: errands.length },
            { id: 'payouts', label: 'Treasury Payouts', count: payouts.length },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: RUNNER VERIFICATION QUEUE ── */}
        {activeTab === 'verification' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                KYC Verification Requests
              </h2>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {(['pending', 'approved', 'denied', 'all'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setAppStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                      appStatusFilter === st ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {loadingApps ? (
              <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-xs text-slate-400 animate-pulse">
                Loading applicant queue…
              </div>
            ) : applications.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-dashed border-slate-300 text-center text-xs text-slate-400">
                No runner applications matching "{appStatusFilter}".
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={app.status === 'approved' ? 'success' : app.status === 'pending' ? 'warning' : 'danger'}
                          className="text-[10px] uppercase font-bold"
                        >
                          {app.status}
                        </Badge>
                        <span className="text-xs font-mono font-bold text-slate-900">
                          Matric: {app.reg_number}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500 capitalize">
                          Transport: {app.transport_method || 'On Foot'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900">
                        {app.profiles?.full_name || 'Applicant'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        📞 Phone: {app.profiles?.phone_number || 'N/A'} • Submitted {new Date(app.created_at).toLocaleDateString()}
                      </p>

                      {app.document_proof_url && (
                        <div className="pt-2">
                          <button
                            onClick={() => setSelectedDocUrl(app.document_proof_url)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> Inspect ID Card Document
                          </button>
                        </div>
                      )}
                    </div>

                    {app.status === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="primary"
                          size="md"
                          isLoading={processingId === app.id}
                          onClick={() => handleReview(app, 'approve')}
                          className="font-bold text-xs bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Approve Runner
                        </Button>
                        <Button
                          variant="outline"
                          size="md"
                          isLoading={processingId === app.id}
                          onClick={() => handleReview(app, 'reject')}
                          className="font-bold text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Deny
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: DISPUTES ADJUDICATION ── */}
        {activeTab === 'disputes' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Open Campus Escrow Disputes
            </h2>

            {loadingDisputes ? (
              <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-xs text-slate-400 animate-pulse">
                Loading dispute queue…
              </div>
            ) : disputes.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-dashed border-slate-300 text-center text-xs text-slate-400">
                No disputes filed at this time. All campus escrows operating normally.
              </div>
            ) : (
              <div className="space-y-4">
                {disputes.map((d) => (
                  <div
                    key={d.id}
                    className="bg-white rounded-3xl border-2 border-amber-300 p-6 shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="warning" className="text-[10px] uppercase font-bold">
                          {d.status}
                        </Badge>
                        <span className="text-xs font-bold text-slate-900">
                          Dispute on Task: {d.errand?.title || d.errand_id}
                        </span>
                      </div>
                      <span className="font-mono text-base font-black text-emerald-600">
                        {formatCurrency(d.errand?.total_fee || 0)} In Escrow
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-1 text-xs">
                      <p className="font-bold text-amber-900">Issue: {d.reason}</p>
                      <p className="text-slate-700 leading-relaxed">{d.description}</p>
                    </div>

                    {/* Resolution Controls */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveDispute(d, 'refund')}
                        className="text-xs font-bold text-blue-600 border-blue-200"
                      >
                        Refund Customer (100%)
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleResolveDispute(d, 'payout_runner')}
                        className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700"
                      >
                        Release Payout to Runner
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: ERRANDS MONITOR ── */}
        {activeTab === 'errands' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Live Platform Errands
              </h2>
              <select
                value={errandStatusFilter}
                onChange={(e) => setErrandStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border border-slate-300 text-xs font-bold"
              >
                <option value="all">All States</option>
                <option value="unassigned">Unassigned</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {loadingErrands ? (
              <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-xs text-slate-400 animate-pulse">
                Querying platform tasks…
              </div>
            ) : errands.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-dashed border-slate-300 text-center text-xs text-slate-400">
                No errands found.
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
                {errands.map((e) => (
                  <div key={e.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-[9px] uppercase font-bold">
                          {e.status}
                        </Badge>
                        <span className="font-bold text-slate-900 text-sm">{e.title}</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        📍 {e.pickup_location} → 📦 {e.delivery_location}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(e.total_fee)}
                      </span>
                      {e.status !== 'completed' && e.status !== 'cancelled' && (
                        <Button
                          size="xs"
                          variant="danger"
                          onClick={() => handleErrandAction(e.id, 'cancel')}
                          className="font-bold text-[10px]"
                        >
                          Force Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: TREASURY PAYOUTS ── */}
        {activeTab === 'payouts' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Pending Runner Bank Payouts
            </h2>

            {loadingPayouts ? (
              <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-xs text-slate-400 animate-pulse">
                Loading pending payouts…
              </div>
            ) : payouts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-dashed border-slate-300 text-center text-xs text-slate-400">
                No pending runner payout requests.
              </div>
            ) : (
              <div className="space-y-3">
                {payouts.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">
                        {p.profiles?.full_name || 'Runner'}
                      </span>
                      <p className="text-slate-400 mt-0.5">
                        Bank: {p.profiles?.bank_name || 'N/A'} • Acc: {p.profiles?.account_number || 'N/A'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-mono text-xl font-black text-emerald-600">
                        {formatCurrency(p.amount)}
                      </span>
                      <Button
                        size="sm"
                        variant="primary"
                        isLoading={processingPayoutId === p.id}
                        onClick={() => handleProcessPayout(p.id)}
                        className="font-bold text-xs bg-emerald-600 hover:bg-emerald-700"
                      >
                        Process Transfer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Document Preview Modal */}
        {selectedDocUrl && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900">Student ID Proof</h3>
                <button onClick={() => setSelectedDocUrl(null)} className="font-bold text-slate-400">✕</button>
              </div>
              <img src={selectedDocUrl} alt="Document proof" className="max-h-[70vh] mx-auto rounded-xl object-contain" />
            </div>
          </div>
        )}

      </div>
    </AdminGuard>
  );
}
