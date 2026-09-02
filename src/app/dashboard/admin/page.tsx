'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ExternalLink,
  Search,
  Loader2,
  RefreshCw,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';
import { formatCurrency } from '@/utils/pricing';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { TabsList, TabsTrigger } from '@/components/ui/Tabs';

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface UserProfileRecord {
  id: string;
  full_name: string;
  student_id: string;
  phone_number: string;
  role: 'user' | 'runner' | 'admin';
  verification_status: string;
  rating?: number;
  total_ratings?: number;
  created_at: string;
  wallets?: { balance: number; total_earned: number; total_spent: number }[];
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

// ─── Status Badge helpers ─────────────────────────────────────────────────────

function errandStatusVariant(status: string): 'success' | 'danger' | 'info' | 'warning' {
  if (status === 'completed') return 'success';
  if (status === 'cancelled') return 'danger';
  if (status === 'in_progress' || status === 'assigned') return 'info';
  return 'warning';
}

function disputeStatusVariant(status: string): 'danger' | 'warning' | 'success' | 'default' {
  if (status === 'open') return 'danger';
  if (status === 'under_review') return 'warning';
  if (status === 'resolved') return 'success';
  return 'default';
}

// ─── Simple AdminGuard wrapper ────────────────────────────────────────────────
// If a dedicated AdminGuard component is added later, replace this with an import.

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
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">Access Denied</p>
          <p className="text-slate-500 mt-2">You do not have admin privileges.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// ─── Errand Inspect Modal ─────────────────────────────────────────────────────

function ErrandModal({
  errand,
  onClose,
  onAction,
}: {
  errand: ErrandRecord;
  onClose: () => void;
  onAction: (id: string, action: 'cancel' | 'complete' | 'unassign') => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-mono text-blue-600 font-bold block">
              Errand #{errand.id.substring(0, 8)}
            </span>
            <h3 className="text-base font-bold text-slate-900">{errand.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm">
          <div>
            <span className="text-xs text-slate-500 block mb-1">Description</span>
            <p className="p-3 bg-slate-50 rounded-xl text-slate-700 border border-slate-100">
              {errand.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <span className="text-xs text-slate-500 block">Pickup</span>
              <span className="font-semibold text-slate-900">{errand.pickup_location}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Drop-off</span>
              <span className="font-semibold text-slate-900">{errand.delivery_location}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Requester</span>
              <span className="font-semibold text-slate-900">{errand.requester?.full_name || '—'}</span>
              <span className="text-xs text-slate-400">{errand.requester?.phone_number}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Runner</span>
              <span className="font-semibold text-slate-900">{errand.runner?.full_name || 'Unassigned'}</span>
              <span className="text-xs text-slate-400">{errand.runner?.phone_number || '—'}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <div>
              <span className="text-xs text-slate-500 block">Total Fee</span>
              <span className="font-bold text-slate-900">{formatCurrency(errand.total_fee)}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Runner Share</span>
              <span className="font-bold text-green-600">{formatCurrency(errand.runner_amount)}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Platform (20%)</span>
              <span className="font-bold text-blue-600">{formatCurrency(errand.platform_fee)}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => {
                if (window.confirm('Unassign the runner from this errand?')) {
                  onAction(errand.id, 'unassign');
                }
              }}
            >
              Unassign Runner
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (window.confirm('Force-complete this errand?')) {
                  onAction(errand.id, 'complete');
                }
              }}
            >
              Force Complete
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (window.confirm('Cancel this errand? This cannot be undone.')) {
                  onAction(errand.id, 'cancel');
                }
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Document Preview Modal ───────────────────────────────────────────────────

function DocModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Student Verification Document</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-50">
          {url.endsWith('.pdf') ? (
            <iframe src={url} className="w-full h-[500px] rounded-xl border border-slate-200" title="Document PDF" />
          ) : (
            <img src={url} alt="Student ID Card" className="max-h-[500px] w-auto object-contain rounded-xl" />
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center">
          <span className="text-xs text-slate-500">Verify student photo, matric number, and institution seal</span>
          <Button variant="secondary" size="sm" onClick={onClose}>Close Preview</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

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
  const [selectedErrand, setSelectedErrand] = useState<ErrandRecord | null>(null);

  // Users State
  const [usersList, setUsersList] = useState<UserProfileRecord[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Disputes State
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [loadingDisputes, setLoadingDisputes] = useState(false);
  const [disputeNotes, setDisputeNotes] = useState<Record<string, string>>({});
  const [disputeRunnerPayouts, setDisputeRunnerPayouts] = useState<Record<string, number>>({});
  const [disputeCustomerRefunds, setDisputeCustomerRefunds] = useState<Record<string, number>>({});
  const [runnerStrikes, setRunnerStrikes] = useState<Record<string, boolean>>({});
  const [customerStrikes, setCustomerStrikes] = useState<Record<string, boolean>>({});

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
    } catch (err) {
      console.error('Failed to fetch runner applications', err);
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
    } catch (err) {
      console.error('Failed to fetch errands', err);
      toast.error('Could not load platform errands');
    } finally {
      setLoadingErrands(false);
    }
  }, [errandStatusFilter]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch(`/api/admin/users?role=${userRoleFilter}`);
      const data = await res.json();
      if (data.success) setUsersList(data.data || []);
    } catch (err) {
      console.error('Failed to fetch users', err);
      toast.error('Could not load users directory');
    } finally {
      setLoadingUsers(false);
    }
  }, [userRoleFilter]);

  const fetchDisputes = useCallback(async () => {
    try {
      setLoadingDisputes(true);
      const res = await fetch('/api/admin/disputes');
      const data = await res.json();
      if (data.success) setDisputes(data.data || []);
    } catch (err) {
      console.error('Failed to fetch disputes', err);
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
      if (!res.ok || !result.success) throw new Error(result.error || 'Failed to review application');
      toast.success(action === 'approve' ? 'Runner verified & approved!' : 'Application rejected.');
      await Promise.all([fetchApplications(), fetchStats()]);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Action failed');
    } finally {
      setProcessingId(null);
    }
  };

  // Aliases used in the spec
  const handleApproveRunner = (appId: string) => {
    const app = applications.find((a) => a.id === appId);
    if (app) handleReview(app, 'approve');
  };
  const handleDenyRunner = (appId: string) => {
    const app = applications.find((a) => a.id === appId);
    if (app) handleReview(app, 'reject');
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
      toast.success(data.message || 'Action executed successfully');
      setSelectedErrand(null);
      await Promise.all([fetchErrands(), fetchStats()]);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to execute errand action');
    }
  };

  const handleUserRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update role');
      toast.success(`User role updated to ${newRole}`);
      await fetchUsers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update role');
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
      toast.success('Payout processed successfully!');
      fetchPayouts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process payout');
    } finally {
      setProcessingPayoutId(null);
    }
  };

  const handleMarkPaid = async (transactionId: string) => {
    try {
      const res = await fetch('/api/admin/payouts/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Marked as paid!');
      fetchPayouts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark as paid');
    }
  };

  const handleResolveDispute = async (d: DisputeRecord) => {
    try {
      setProcessingId(d.id);
      const notes = disputeNotes[d.id] || '';
      const runnerPayout = disputeRunnerPayouts[d.id] ?? 0;
      const customerRefund = disputeCustomerRefunds[d.id] ?? 0;
      const addRunnerStrike = runnerStrikes[d.id] ?? false;
      const addCustomerStrike = customerStrikes[d.id] ?? false;

      const res = await fetch('/api/admin/disputes/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errandId: d.errand_id,
          runnerPayout,
          customerRefund,
          addRunnerStrike,
          addCustomerStrike,
          adminNotes: notes,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || 'Failed to resolve dispute');
      toast.success('Dispute resolved successfully');
      await Promise.all([fetchDisputes(), fetchStats()]);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to resolve dispute');
    } finally {
      setProcessingId(null);
    }
  };

  // ── Filters ───────────────────────────────────────────────────────────────

  const filteredApps = applications.filter((app) => {
    const q = searchQuery.toLowerCase();
    return (
      app.profiles?.full_name?.toLowerCase().includes(q) ||
      app.profiles?.student_id?.toLowerCase().includes(q) ||
      app.reg_number?.toLowerCase().includes(q) ||
      app.profiles?.phone_number?.includes(q)
    );
  });

  const filteredErrands = errands.filter((e) => {
    const q = searchQuery.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      e.pickup_location.toLowerCase().includes(q) ||
      e.delivery_location.toLowerCase().includes(q) ||
      e.requester?.full_name?.toLowerCase().includes(q) ||
      e.runner?.full_name?.toLowerCase().includes(q)
    );
  });

  const filteredUsers = usersList.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.student_id?.toLowerCase().includes(q) ||
      u.phone_number?.includes(q)
    );
  });

  // ── Refresh all ───────────────────────────────────────────────────────────

  const refreshAll = () => {
    fetchStats();
    if (activeTab === 'verification') fetchApplications();
    if (activeTab === 'errands') fetchErrands();
    if (activeTab === 'disputes') fetchDisputes();
    if (activeTab === 'payouts') fetchPayouts();
    toast.success('Data refreshed');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50 p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <Button variant="secondary" size="sm" onClick={refreshAll} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Users */}
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total Users</p>
              <p className="text-3xl font-black text-slate-900 mt-1">
                {loadingStats ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : (stats?.totalUsers ?? 0)}
              </p>
            </CardContent>
          </Card>

          {/* Active Errands */}
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Active Errands</p>
              <p className="text-3xl font-black text-blue-600 mt-1">
                {loadingStats ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : (stats?.activeCount ?? 0)}
              </p>
            </CardContent>
          </Card>

          {/* Platform Revenue */}
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Platform Revenue</p>
              <p className="text-3xl font-black text-green-600 mt-1">
                {loadingStats ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : formatCurrency(stats?.totalRevenue ?? 0)}
              </p>
            </CardContent>
          </Card>

          {/* Pending Verification */}
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Pending Verification</p>
              <p className="text-3xl font-black text-amber-500 mt-1">
                {loadingStats ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : (stats?.pendingApplications ?? 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Navigation */}
        <TabsList>
          {(
            [
              { id: 'verification', label: 'Verification Queue' },
              { id: 'disputes', label: 'Disputes' },
              { id: 'errands', label: 'Errands' },
              { id: 'payouts', label: 'Withdrawals' },
            ] as { id: TabId; label: string }[]
          ).map((tab) => (
            <TabsTrigger
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
            >
              {tab.label}
              {tab.id === 'verification' && stats && stats.pendingApplications > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                  {stats.pendingApplications}
                </span>
              )}
              {tab.id === 'disputes' && disputes.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black">
                  {disputes.length}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── TAB: VERIFICATION QUEUE ────────────────────────────────────── */}
        {activeTab === 'verification' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {(['pending', 'approved', 'denied', 'all'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setAppStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all border ${
                      appStatusFilter === s
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="w-full sm:w-72">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, matric, phone…"
                  icon={<Search className="w-4 h-4" />}
                />
              </div>
            </div>

            {/* Cards */}
            {loadingApps ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : filteredApps.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-slate-500 text-sm">
                    {appStatusFilter === 'pending'
                      ? 'All caught up — no pending verification requests.'
                      : `No applications with status "${appStatusFilter}".`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredApps.map((app) => {
                  const profile = app.profiles;
                  const isProcessing = processingId === app.id;
                  return (
                    <Card key={app.id}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          {/* Left: info */}
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-base shrink-0">
                                {profile?.full_name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{profile?.full_name || 'Unknown'}</p>
                                <p className="text-sm text-slate-500">{profile?.phone_number || 'No phone'}</p>
                              </div>
                              <Badge
                                variant={
                                  app.status === 'approved' ? 'success'
                                  : app.status === 'denied' ? 'danger'
                                  : 'warning'
                                }
                                className="ml-1"
                              >
                                {app.status}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500 pl-1">
                              <span>Reg #: <strong className="text-slate-800 font-mono">{app.reg_number}</strong></span>
                              <span>Student ID: <strong className="text-slate-800 font-mono">{profile?.student_id || 'N/A'}</strong></span>
                              <span>Transport: <strong className="text-slate-800 capitalize">{app.transport_method}</strong></span>
                              <span>Applied: <strong className="text-slate-800">{new Date(app.created_at).toLocaleDateString()}</strong></span>
                            </div>

                            {/* Document links */}
                            {app.document_proof_url ? (
                              <div className="flex items-center gap-2 pt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5"
                                  onClick={() => setSelectedDocUrl(app.document_proof_url)}
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  View ID Document
                                </Button>
                                <a
                                  href={app.document_proof_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Open
                                </a>
                              </div>
                            ) : (
                              <p className="text-xs text-red-500 pt-1">No document attached</p>
                            )}

                            {/* Admin notes */}
                            <Input
                              value={adminNotes[app.id] ?? (app.admin_notes || '')}
                              onChange={(e) =>
                                setAdminNotes((prev) => ({ ...prev, [app.id]: e.target.value }))
                              }
                              placeholder="Admin review notes (e.g. Matric matches university list)"
                              className="text-xs"
                            />
                          </div>

                          {/* Right: action buttons */}
                          <div className="flex sm:flex-col gap-2 shrink-0">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 gap-1.5"
                              isLoading={isProcessing}
                              onClick={() => handleApproveRunner(app.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={isProcessing}
                              onClick={() => {
                                if (window.confirm('Reject this runner application?')) {
                                  handleDenyRunner(app.id);
                                }
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: DISPUTES ──────────────────────────────────────────────── */}
        {activeTab === 'disputes' && (
          <div className="space-y-4">
            {loadingDisputes ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : disputes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-slate-500 text-sm">Zero open disputes — platform is healthy.</p>
                </CardContent>
              </Card>
            ) : (
              disputes.map((d) => (
                <Card key={d.id} className="mb-4">
                  <CardContent className="pt-4 space-y-4">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold text-red-500 uppercase tracking-wider block mb-0.5">
                          Dispute #{d.id.substring(0, 8)}
                        </span>
                        <h3 className="font-semibold text-slate-900">{d.reason}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{d.description}</p>
                      </div>
                      <Badge variant={disputeStatusVariant(d.status)}>
                        {d.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Parties + errand value */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Initiator (Customer)</span>
                        <span className="font-semibold text-slate-800">{d.initiator?.full_name || 'N/A'}</span>
                        <span className="text-slate-400 block">{d.initiator?.phone_number}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Respondent (Runner)</span>
                        <span className="font-semibold text-slate-800">{d.respondent?.full_name || 'N/A'}</span>
                        <span className="text-slate-400 block">{d.respondent?.phone_number}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Errand Value</span>
                        <span className="font-semibold text-slate-800">{formatCurrency(d.errand?.total_fee || 0)}</span>
                        <span className="text-slate-400 block">{d.errand?.title}</span>
                      </div>
                    </div>

                    {/* Evidence images + PIN */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-1.5">Photo Evidence</span>
                        <div className="flex gap-2 flex-wrap">
                          {d.errand?.pickup_photo_url ? (
                            <a
                              href={d.errand.pickup_photo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-lg font-medium hover:bg-green-100 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" /> Pickup Photo
                            </a>
                          ) : (
                            <span className="text-slate-400">No Pickup Photo</span>
                          )}
                          {d.errand?.dropoff_photo_url ? (
                            <a
                              href={d.errand.dropoff_photo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" /> Dropoff Photo
                            </a>
                          ) : (
                            <span className="text-slate-400">No Dropoff Photo</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-1.5">Delivery PIN</span>
                        <span className="font-mono font-bold text-slate-900 tracking-widest text-base">
                          {d.errand?.delivery_pin || 'NONE'}
                        </span>
                      </div>
                    </div>

                    {/* Resolution controls */}
                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-4">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Resolution Controls — Total: {formatCurrency(d.errand?.total_fee || 0)}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Runner payout */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-slate-600 block">Runner Payout (₦)</label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={disputeRunnerPayouts[d.id] ?? ''}
                            onChange={(e) =>
                              setDisputeRunnerPayouts((prev) => ({ ...prev, [d.id]: Number(e.target.value) }))
                            }
                          />
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={runnerStrikes[d.id] || false}
                              onChange={(e) =>
                                setRunnerStrikes((prev) => ({ ...prev, [d.id]: e.target.checked }))
                              }
                              className="rounded border-slate-300"
                            />
                            <span className="text-xs text-red-600 font-medium">Issue Warning Strike to Runner</span>
                          </label>
                        </div>

                        {/* Customer refund */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-slate-600 block">Customer Refund (₦)</label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={disputeCustomerRefunds[d.id] ?? ''}
                            onChange={(e) =>
                              setDisputeCustomerRefunds((prev) => ({ ...prev, [d.id]: Number(e.target.value) }))
                            }
                          />
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={customerStrikes[d.id] || false}
                              onChange={(e) =>
                                setCustomerStrikes((prev) => ({ ...prev, [d.id]: e.target.checked }))
                              }
                              className="rounded border-slate-300"
                            />
                            <span className="text-xs text-red-600 font-medium">Issue Warning Strike to Customer</span>
                          </label>
                        </div>
                      </div>

                      {/* Notes + resolve */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Input
                          placeholder="Admin arbitration notes (internal)…"
                          value={disputeNotes[d.id] || ''}
                          onChange={(e) =>
                            setDisputeNotes((prev) => ({ ...prev, [d.id]: e.target.value }))
                          }
                          className="flex-1"
                        />
                        <Button
                          className="shrink-0 bg-green-600 hover:bg-green-700"
                          isLoading={processingId === d.id}
                          onClick={() => {
                            if (window.confirm('Resolve this dispute with the configured payouts and strikes?')) {
                              handleResolveDispute(d);
                            }
                          }}
                        >
                          Resolve Dispute
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ── TAB: ERRANDS ───────────────────────────────────────────────── */}
        {activeTab === 'errands' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {['all', 'unassigned', 'assigned', 'in_progress', 'completed', 'cancelled'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setErrandStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all border whitespace-nowrap ${
                      errandStatusFilter === s
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
              <div className="w-full sm:w-72">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search errand, requester, runner…"
                  icon={<Search className="w-4 h-4" />}
                />
              </div>
            </div>

            {loadingErrands ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : filteredErrands.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-slate-500 text-sm">No errands match the selected filter.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredErrands.map((errand) => (
                  <Card key={errand.id}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-blue-600 font-bold">
                              #{errand.id.substring(0, 8)}
                            </span>
                            <h3 className="font-semibold text-slate-900 truncate">{errand.title}</h3>
                            <Badge variant={errandStatusVariant(errand.status)}>
                              {errand.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1">{errand.description}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>From: <strong className="text-slate-700">{errand.pickup_location}</strong></span>
                            <span>To: <strong className="text-slate-700">{errand.delivery_location}</strong></span>
                            <span>Requester: <strong className="text-slate-700">{errand.requester?.full_name || 'N/A'}</strong></span>
                            <span>Runner: <strong className="text-slate-700">{errand.runner?.full_name || 'Unassigned'}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <span className="text-xs text-slate-400 block">Total Fee</span>
                            <span className="font-bold text-slate-900">{formatCurrency(errand.total_fee)}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => setSelectedErrand(errand)}>
                              Inspect
                            </Button>
                            {errand.status !== 'completed' && errand.status !== 'cancelled' && (
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => {
                                  if (window.confirm('Cancel this errand?')) {
                                    handleErrandAction(errand.id, 'cancel');
                                  }
                                }}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: WITHDRAWALS ───────────────────────────────────────────── */}
        {activeTab === 'payouts' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Pending Runner Withdrawals</h2>
            {loadingPayouts ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : payouts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-slate-500 text-sm">No pending withdrawal requests.</p>
                </CardContent>
              </Card>
            ) : (
              payouts.map((tx) => (
                <Card key={tx.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-slate-900">{tx.profiles?.full_name}</h3>
                        <p className="text-xs text-slate-500">
                          Requested: {new Date(tx.created_at).toLocaleString()}
                        </p>
                        <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-sm">
                          <p className="font-mono font-bold text-green-600 text-base">
                            ₦{tx.amount?.toLocaleString()}
                          </p>
                          <p className="text-slate-500 text-xs">
                            Bank: <span className="text-slate-800 font-medium">{tx.profiles?.bank_name || 'NOT PROVIDED'}</span>
                          </p>
                          <p className="text-slate-500 text-xs">
                            Account: <span className="text-slate-800 font-medium font-mono">{tx.profiles?.account_number || 'NOT PROVIDED'}</span>
                          </p>
                          <p className="text-slate-500 text-xs">
                            Name: <span className="text-slate-800 font-medium">{tx.profiles?.account_name || 'NOT PROVIDED'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          isLoading={processingPayoutId === tx.id}
                          disabled={processingPayoutId === tx.id || !tx.profiles?.bank_name}
                          onClick={() => handleProcessPayout(tx.id)}
                          className="whitespace-nowrap"
                        >
                          Process via Paystack
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            if (window.confirm('Mark this withdrawal as manually paid?')) {
                              handleMarkPaid(tx.id);
                            }
                          }}
                          className="whitespace-nowrap"
                        >
                          Mark as Paid
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

      </div>

      {/* Modals */}
      {selectedErrand && (
        <ErrandModal
          errand={selectedErrand}
          onClose={() => setSelectedErrand(null)}
          onAction={handleErrandAction}
        />
      )}
      {selectedDocUrl && (
        <DocModal url={selectedDocUrl} onClose={() => setSelectedDocUrl(null)} />
      )}
    </AdminGuard>
  );
}
