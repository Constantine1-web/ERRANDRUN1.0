'use client';

import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';
import { formatCurrency } from '@/utils/pricing';

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

  if (authorized === null) return <div>Loading...</div>;
  if (!authorized) return <div>Access Denied</div>;

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

  const refreshAll = () => {
    fetchStats();
    if (activeTab === 'verification') fetchApplications();
    if (activeTab === 'errands') fetchErrands();
    if (activeTab === 'disputes') fetchDisputes();
    if (activeTab === 'payouts') fetchPayouts();
    toast.success('Data refreshed');
  };

  // ── STRIPPED: Awaiting redesign ──
  return (
    <AdminGuard>
      <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
        <h1>Admin Dashboard</h1>
        <button onClick={refreshAll}>Refresh Data</button>

        <div>
          <button onClick={() => setActiveTab('verification')}>Verification Queue</button>
          <button onClick={() => setActiveTab('disputes')}>Disputes</button>
          <button onClick={() => setActiveTab('errands')}>Errands</button>
          <button onClick={() => setActiveTab('payouts')}>Withdrawals</button>
        </div>

        <div>
          <h2>Stats Overview</h2>
          <p>Total Users: {stats?.totalUsers}</p>
          <p>Active Errands: {stats?.activeCount}</p>
          <p>Revenue: {formatCurrency(stats?.totalRevenue ?? 0)}</p>
          <p>Pending Applications: {stats?.pendingApplications}</p>
        </div>

        {activeTab === 'verification' && (
          <div>
            <h3>Verification Queue Placeholder</h3>
            <p>List of {filteredApps.length} pending applications goes here.</p>
          </div>
        )}

        {activeTab === 'disputes' && (
          <div>
            <h3>Disputes Placeholder</h3>
            <p>List of {disputes.length} disputes goes here.</p>
          </div>
        )}

        {activeTab === 'errands' && (
          <div>
            <h3>Errands Placeholder</h3>
            <p>List of {filteredErrands.length} errands goes here.</p>
          </div>
        )}

        {activeTab === 'payouts' && (
          <div>
            <h3>Withdrawals Placeholder</h3>
            <p>List of {payouts.length} payouts goes here.</p>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
