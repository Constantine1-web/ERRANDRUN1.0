'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  TrendingUp,
  PackageCheck,
  FileText,
  ExternalLink,
  Search,
  Users,
  DollarSign,
  Loader2,
  Package,
  AlertTriangle,
  RefreshCw,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/pricing';

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
  errand?: { id: string; title: string; total_fee: number; status: string };
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

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'applications' | 'errands' | 'users' | 'disputes' | 'stats'>('applications');
  
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

  // Stats State
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch admin stats', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // 2. Fetch Runner Applications
  const fetchApplications = useCallback(async () => {
    try {
      setLoadingApps(true);
      const res = await fetch(`/api/admin/runners?status=${appStatusFilter}`);
      const data = await res.json();
      if (data.success) {
        setApplications(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch runner applications', err);
      toast.error('Could not load runner applications');
    } finally {
      setLoadingApps(false);
    }
  }, [appStatusFilter]);

  // 3. Fetch Errands
  const fetchErrands = useCallback(async () => {
    try {
      setLoadingErrands(true);
      const res = await fetch(`/api/admin/errands?status=${errandStatusFilter}`);
      const data = await res.json();
      if (data.success) {
        setErrands(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch errands', err);
      toast.error('Could not load platform errands');
    } finally {
      setLoadingErrands(false);
    }
  }, [errandStatusFilter]);

  // 4. Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch(`/api/admin/users?role=${userRoleFilter}`);
      const data = await res.json();
      if (data.success) {
        setUsersList(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
      toast.error('Could not load users directory');
    } finally {
      setLoadingUsers(false);
    }
  }, [userRoleFilter]);

  // 5. Fetch Disputes
  const fetchDisputes = useCallback(async () => {
    try {
      setLoadingDisputes(true);
      const res = await fetch('/api/admin/disputes');
      const data = await res.json();
      if (data.success) {
        setDisputes(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch disputes', err);
    } finally {
      setLoadingDisputes(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'applications') fetchApplications();
    if (activeTab === 'errands') fetchErrands();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'disputes') fetchDisputes();
  }, [activeTab, fetchApplications, fetchErrands, fetchUsers, fetchDisputes]);

  // Handle Review Runner
  const handleReview = async (app: RunnerApp, action: 'approve' | 'reject') => {
    try {
      setProcessingId(app.id);
      const notes = adminNotes[app.id] || '';

      const res = await fetch('/api/admin/runners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: app.id,
          userId: app.user_id,
          action,
          adminNotes: notes,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to review application');
      }

      toast.success(
        action === 'approve'
          ? `Runner verified & approved! Account upgraded to runner.`
          : `Application rejected.`
      );

      await Promise.all([fetchApplications(), fetchStats()]);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Action failed');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Errand Intervention
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

  // Handle User Role Change
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

  // Handle Dispute Resolution
  const handleResolveDispute = async (disputeId: string, resolutionType: string) => {
    try {
      const notes = disputeNotes[disputeId] || '';
      const res = await fetch('/api/admin/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disputeId,
          resolutionType,
          adminNotes: notes,
          status: 'resolved',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to resolve dispute');

      toast.success(`Dispute marked as resolved (${resolutionType})`);
      await fetchDisputes();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update dispute');
    }
  };

  // Search Filters
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-purple/20 border border-primary-500/30">
              <ShieldCheck className="w-7 h-7 text-primary-400" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white">Platform Administration</h1>
              <p className="text-white/60 text-sm">
                Runner identity verification, live errand management, disputes, and marketplace metrics
              </p>
            </div>
          </div>
        </div>

        {/* Global Action & Refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchStats();
              if (activeTab === 'applications') fetchApplications();
              if (activeTab === 'errands') fetchErrands();
              if (activeTab === 'users') fetchUsers();
              if (activeTab === 'disputes') fetchDisputes();
              toast.success('Data refreshed');
            }}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/80 hover:text-white flex items-center gap-2 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Data
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card rounded-3xl p-5 border border-white/10">
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Vetting</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white">
            {loadingStats ? '…' : stats?.pendingApplications || 0}
          </div>
          <p className="text-xs text-amber-400/80 mt-1">Awaiting ID Card Inspection</p>
        </div>

        <div className="glass-card rounded-3xl p-5 border border-white/10">
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Verified Runners</span>
            <UserCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white">
            {loadingStats ? '…' : stats?.totalRunners || 0}
          </div>
          <p className="text-xs text-emerald-400/80 mt-1">Authorized campus runners</p>
        </div>

        <div className="glass-card rounded-3xl p-5 border border-white/10">
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed Tasks</span>
            <PackageCheck className="w-5 h-5 text-primary-400" />
          </div>
          <div className="text-3xl font-black text-white">
            {loadingStats ? '…' : stats?.completedCount || 0}
          </div>
          <p className="text-xs text-white/60 mt-1">
            of {stats?.totalErrands || 0} total placed
          </p>
        </div>

        <div className="glass-card rounded-3xl p-5 border border-white/10">
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Platform Revenue</span>
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-black text-green-400">
            {loadingStats ? '…' : formatCurrency(stats?.totalRevenue || 0)}
          </div>
          <p className="text-xs text-white/60 mt-1">20% commission earned</p>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-white/10 scrollbar-none">
        {[
          {
            id: 'applications',
            label: 'Runner Applications',
            icon: ShieldCheck,
            badge: stats && stats.pendingApplications > 0 ? stats.pendingApplications : null,
          },
          { id: 'errands', label: 'All Campus Errands', icon: Package },
          { id: 'users', label: 'User Directory', icon: Users },
          { id: 'disputes', label: 'Disputes & Claims', icon: AlertTriangle },
          { id: 'stats', label: 'Financial Analytics', icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSearchQuery('');
              }}
              className={`px-4 py-2.5 rounded-2xl text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-dark-base">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: RUNNER APPLICATIONS (VETTING CENTER) */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          {/* Filter & Search Bar */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {(['pending', 'approved', 'denied', 'all'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setAppStatusFilter(status)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    appStatusFilter === status
                      ? 'bg-white text-dark-base'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search runner name, matric, phone..."
                className="input pl-10 w-full text-xs"
              />
            </div>
          </div>

          {/* Applications Grid */}
          {loadingApps ? (
            <div className="glass-card rounded-3xl p-12 text-center">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
              <p className="text-white/60 text-sm">Loading applications...</p>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center border border-white/10">
              <CheckCircle2 className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">No runner applications found</h3>
              <p className="text-white/60 text-sm max-w-md mx-auto">
                {appStatusFilter === 'pending'
                  ? 'All caught up! No pending runner verification requests.'
                  : `No applications match filter "${appStatusFilter}".`}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {filteredApps.map((app) => {
                const profile = app.profiles;
                const isProcessing = processingId === app.id;

                return (
                  <motion.div
                    key={app.id}
                    layout
                    className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-purple/20 border border-primary-500/30 flex items-center justify-center text-primary-300 font-bold text-lg">
                            {profile?.full_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-base">{profile?.full_name || 'Unknown Student'}</h3>
                            <p className="text-xs text-white/60">{profile?.phone_number || 'No phone'}</p>
                          </div>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                            app.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : app.status === 'denied'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>

                      {/* Meta Grid */}
                      <div className="grid grid-cols-2 gap-3 p-3.5 bg-white/5 rounded-2xl border border-white/5 mb-4 text-xs">
                        <div>
                          <span className="text-white/40 block mb-0.5">Student ID</span>
                          <span className="font-semibold text-white font-mono">{profile?.student_id || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-white/40 block mb-0.5">Registration Number</span>
                          <span className="font-semibold text-white font-mono">{app.reg_number}</span>
                        </div>
                        <div>
                          <span className="text-white/40 block mb-0.5">Transport Mode</span>
                          <span className="font-semibold text-primary-300 capitalize">{app.transport_method}</span>
                        </div>
                        <div>
                          <span className="text-white/40 block mb-0.5">Submitted On</span>
                          <span className="text-white/70">{new Date(app.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Document Viewer Button */}
                      <div className="mb-4">
                        <label className="text-xs text-white/60 font-medium block mb-2">
                          Uploaded Student ID / Document Proof:
                        </label>
                        {app.document_proof_url ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedDocUrl(app.document_proof_url)}
                              className="flex items-center gap-2 px-3.5 py-2 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/30 rounded-xl text-primary-300 text-xs font-semibold transition-all"
                            >
                              <FileText className="w-4 h-4" />
                              Inspect Uploaded Document
                            </button>
                            <a
                              href={app.document_proof_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-all text-xs"
                              title="Open in new window"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-rose-400">No document attached</span>
                        )}
                      </div>

                      {/* Admin Notes */}
                      <div className="mb-4">
                        <label className="text-xs text-white/60 font-medium block mb-1.5">
                          Admin Review Notes:
                        </label>
                        <input
                          type="text"
                          value={adminNotes[app.id] ?? (app.admin_notes || '')}
                          onChange={(e) =>
                            setAdminNotes((prev) => ({ ...prev, [app.id]: e.target.value }))
                          }
                          placeholder="e.g. Matric matches university list"
                          className="input w-full text-xs"
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => handleReview(app, 'approve')}
                        disabled={isProcessing}
                        className="flex-1 btn-primary py-2.5 text-xs flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 border-emerald-500 disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Approve & Verify Runner
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReview(app, 'reject')}
                        disabled={isProcessing}
                        className="px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL CAMPUS ERRANDS (LIVE FEED & INTERVENTIONS) */}
      {activeTab === 'errands' && (
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {['all', 'unassigned', 'assigned', 'in_progress', 'completed', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => setErrandStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                    errandStatusFilter === status
                      ? 'bg-white text-dark-base'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search errand title, ID, requester..."
                className="input pl-10 w-full text-xs"
              />
            </div>
          </div>

          {loadingErrands ? (
            <div className="glass-card rounded-3xl p-12 text-center">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
              <p className="text-white/60 text-sm">Loading errands...</p>
            </div>
          ) : filteredErrands.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center border border-white/10">
              <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">No errands found</h3>
              <p className="text-white/60 text-sm">No tasks matching the selected filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredErrands.map((errand) => (
                <div
                  key={errand.id}
                  className="glass-card rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-primary-400 font-bold">
                        #{errand.id.substring(0, 8)}
                      </span>
                      <h3 className="font-bold text-white text-base">{errand.title}</h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          errand.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : errand.status === 'cancelled'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : errand.status === 'in_progress' || errand.status === 'assigned'
                            ? 'bg-primary-500/20 text-primary-300 border-primary-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {errand.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-white/60 line-clamp-1">{errand.description}</p>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-white/60">
                      <span>From: <strong className="text-white">{errand.pickup_location}</strong></span>
                      <span>To: <strong className="text-white">{errand.delivery_location}</strong></span>
                      <span>Requester: <strong className="text-white">{errand.requester?.full_name || 'N/A'}</strong></span>
                      <span>Runner: <strong className="text-white">{errand.runner?.full_name || 'Unassigned'}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/10">
                    <div className="text-right">
                      <span className="text-xs text-white/40 block">Total Fee</span>
                      <span className="text-base font-bold text-white">{formatCurrency(errand.total_fee)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedErrand(errand)}
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </button>

                      {errand.status !== 'completed' && errand.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => handleErrandAction(errand.id, 'cancel')}
                          className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-semibold transition-all"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: USER DIRECTORY */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {['all', 'user', 'runner', 'admin'].map((role) => (
                <button
                  key={role}
                  onClick={() => setUserRoleFilter(role)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    userRoleFilter === role
                      ? 'bg-white text-dark-base'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user name, ID, phone..."
                className="input pl-10 w-full text-xs"
              />
            </div>
          </div>

          {loadingUsers ? (
            <div className="glass-card rounded-3xl p-12 text-center">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
              <p className="text-white/60 text-sm">Loading user directory...</p>
            </div>
          ) : (
            <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-white/40 uppercase tracking-wider font-semibold border-b border-white/10">
                    <tr>
                      <th className="p-4">Student / User</th>
                      <th className="p-4">Student ID</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Verification</th>
                      <th className="p-4">Rating</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-bold text-white">{u.full_name}</td>
                        <td className="p-4 font-mono text-white/80">{u.student_id || 'N/A'}</td>
                        <td className="p-4 text-white/60">{u.phone_number || 'N/A'}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                              u.role === 'admin'
                                ? 'bg-accent-purple/20 text-accent-purple'
                                : u.role === 'runner'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-white/10 text-white/80'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-semibold text-[10px] ${
                              u.verification_status === 'verified'
                                ? 'text-emerald-400'
                                : u.verification_status === 'pending'
                                ? 'text-amber-400'
                                : 'text-white/40'
                            }`}
                          >
                            {u.verification_status}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-amber-400">
                          {u.rating ? `★ ${u.rating}` : '—'}
                        </td>
                        <td className="p-4 text-right">
                          <select
                            value={u.role}
                            onChange={(e) => handleUserRoleChange(u.id, e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg text-[11px] p-1 text-white"
                          >
                            <option value="user" className="bg-dark-base">Set as User</option>
                            <option value="runner" className="bg-dark-base">Set as Runner</option>
                            <option value="admin" className="bg-dark-base">Set as Admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DISPUTES CENTER */}
      {activeTab === 'disputes' && (
        <div className="space-y-6">
          {loadingDisputes ? (
            <div className="glass-card rounded-3xl p-12 text-center">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
              <p className="text-white/60 text-sm">Loading disputes...</p>
            </div>
          ) : disputes.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center border border-white/10">
              <CheckCircle2 className="w-12 h-12 text-emerald-400/40 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">Zero Open Disputes</h3>
              <p className="text-white/60 text-sm">No unresolved issues or claims from students.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {disputes.map((d) => (
                <div key={d.id} className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block mb-1">
                        Dispute #{d.id.substring(0, 8)}
                      </span>
                      <h3 className="text-base font-bold text-white">{d.reason}</h3>
                      <p className="text-xs text-white/60 mt-1">{d.description}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {d.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-white/5 rounded-2xl text-xs">
                    <div>
                      <span className="text-white/40 block mb-0.5">Initiator</span>
                      <span className="font-semibold text-white">{d.initiator?.full_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-white/40 block mb-0.5">Respondent</span>
                      <span className="font-semibold text-white">{d.respondent?.full_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-white/40 block mb-0.5">Errand Value</span>
                      <span className="font-semibold text-white">{formatCurrency(d.errand?.total_fee || 0)}</span>
                    </div>
                  </div>

                  {/* Resolution Input */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <input
                      type="text"
                      placeholder="Admin arbitration notes..."
                      value={disputeNotes[d.id] || ''}
                      onChange={(e) => setDisputeNotes((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      className="input w-full text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleResolveDispute(d.id, 'refund')}
                      className="btn-primary py-2 px-4 text-xs whitespace-nowrap bg-rose-600 hover:bg-rose-500 border-rose-500"
                    >
                      Refund Requester
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolveDispute(d.id, 'compensation')}
                      className="btn-secondary py-2 px-4 text-xs whitespace-nowrap"
                    >
                      Compensate Runner
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolveDispute(d.id, 'no_action')}
                      className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs whitespace-nowrap"
                    >
                      Dismiss Claim
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: FINANCIAL & PLATFORM ANALYTICS */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-green-500/10 text-green-400">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Gross Marketplace Volume</h3>
                  <p className="text-xs text-white/60">Total transaction value</p>
                </div>
              </div>
              <div className="text-3xl font-black text-white">
                {formatCurrency(stats.totalVolume)}
              </div>
              <div className="text-xs text-white/60">
                Total paid to student runners:{' '}
                <strong className="text-green-400">{formatCurrency(stats.totalRunnerPayouts)}</strong>
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-primary-500/10 text-primary-400">
                  <PackageCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Fulfillment Health</h3>
                  <p className="text-xs text-white/60">Completion rate</p>
                </div>
              </div>
              <div className="text-3xl font-black text-white">
                {stats.totalErrands > 0
                  ? `${Math.round((stats.completedCount / stats.totalErrands) * 100)}%`
                  : '100%'}
              </div>
              <div className="text-xs text-white/60">
                {stats.completedCount} completed of {stats.totalErrands} total requests
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-accent-purple/10 text-accent-purple">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Community Size</h3>
                  <p className="text-xs text-white/60">Registered students</p>
                </div>
              </div>
              <div className="text-3xl font-black text-white">
                {stats.totalUsers}
              </div>
              <div className="text-xs text-white/60">
                {stats.totalRunners} verified runners actively fulfilling tasks
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ERRAND INSPECT MODAL */}
      <AnimatePresence>
        {selectedErrand && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card rounded-3xl p-6 max-w-xl w-full border border-white/20 relative"
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <div>
                  <span className="text-xs font-mono text-primary-400 font-bold block">
                    Errand #{selectedErrand.id}
                  </span>
                  <h3 className="text-lg font-bold text-white">{selectedErrand.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedErrand(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-white/40 block mb-1">Description</span>
                  <p className="p-3 bg-white/5 rounded-2xl text-white/80">{selectedErrand.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3.5 bg-white/5 rounded-2xl">
                  <div>
                    <span className="text-white/40 block">Pickup Point</span>
                    <span className="font-semibold text-white">{selectedErrand.pickup_location}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Drop-off Point</span>
                    <span className="font-semibold text-white">{selectedErrand.delivery_location}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Requester</span>
                    <span className="font-semibold text-white">{selectedErrand.requester?.full_name}</span>
                    <span className="text-white/40 block">{selectedErrand.requester?.phone_number}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Runner</span>
                    <span className="font-semibold text-white">{selectedErrand.runner?.full_name || 'None'}</span>
                    <span className="text-white/40 block">{selectedErrand.runner?.phone_number || '—'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3.5 bg-white/5 rounded-2xl text-center">
                  <div>
                    <span className="text-white/40 block">Total Fee</span>
                    <span className="font-bold text-white text-sm">{formatCurrency(selectedErrand.total_fee)}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Runner Share</span>
                    <span className="font-bold text-emerald-400 text-sm">{formatCurrency(selectedErrand.runner_amount)}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Platform (20%)</span>
                    <span className="font-bold text-primary-400 text-sm">{formatCurrency(selectedErrand.platform_fee)}</span>
                  </div>
                </div>

                {/* Admin Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleErrandAction(selectedErrand.id, 'unassign')}
                    className="flex-1 btn-secondary py-2 text-xs"
                  >
                    Unassign Runner
                  </button>
                  <button
                    type="button"
                    onClick={() => handleErrandAction(selectedErrand.id, 'complete')}
                    className="flex-1 btn-primary py-2 text-xs bg-emerald-600 hover:bg-emerald-500 border-emerald-500"
                  >
                    Force Complete
                  </button>
                  <button
                    type="button"
                    onClick={() => handleErrandAction(selectedErrand.id, 'cancel')}
                    className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DOCUMENT PREVIEW MODAL */}
      <AnimatePresence>
        {selectedDocUrl && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] flex flex-col relative border border-white/20"
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary-400" />
                  <h3 className="font-bold text-white">Student Verification Document</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDocUrl(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-auto rounded-2xl border border-white/10 bg-black/40 p-2 flex items-center justify-center">
                {selectedDocUrl.endsWith('.pdf') ? (
                  <iframe src={selectedDocUrl} className="w-full h-[500px] rounded-xl" title="Document PDF" />
                ) : (
                  <img
                    src={selectedDocUrl}
                    alt="Student ID Card"
                    className="max-h-[500px] w-auto object-contain rounded-xl"
                  />
                )}
              </div>

              <div className="pt-4 flex justify-between items-center text-xs text-white/60">
                <span>Verify student photo, matric number, and institution seal</span>
                <button
                  type="button"
                  onClick={() => setSelectedDocUrl(null)}
                  className="btn-secondary py-1.5 px-4 text-xs"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
