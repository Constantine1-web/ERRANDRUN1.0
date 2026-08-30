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
  const [activeTab, setActiveTab] = useState<'applications' | 'stats' | 'users'>('applications');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('pending');
  const [applications, setApplications] = useState<RunnerApp[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');

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

  const fetchApplications = useCallback(async () => {
    try {
      setLoadingApps(true);
      const res = await fetch(`/api/admin/runners?status=${statusFilter}`);
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
  }, [statusFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

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
          ? `Runner verified & approved! Account role upgraded.`
          : `Application rejected.`
      );

      // Refresh list & stats
      await Promise.all([fetchApplications(), fetchStats()]);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Action failed');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredApps = applications.filter((app) => {
    const q = searchQuery.toLowerCase();
    const name = app.profiles?.full_name?.toLowerCase() || '';
    const studentId = app.profiles?.student_id?.toLowerCase() || '';
    const regNum = app.reg_number?.toLowerCase() || '';
    const phone = app.profiles?.phone_number || '';
    return name.includes(q) || studentId.includes(q) || regNum.includes(q) || phone.includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-purple/20 border border-primary-500/30">
              <ShieldCheck className="w-7 h-7 text-primary-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Campus Vetting & Admin Panel</h1>
              <p className="text-white/60 text-sm">
                Anti-fraud runner identity checks, student ID validation, and platform metrics
              </p>
            </div>
          </div>
        </div>

        {/* Quick Tabs */}
        <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'applications'
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Runner Vetting
            {stats && stats.pendingApplications > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                {stats.pendingApplications}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'stats'
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Platform Stats
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card rounded-3xl p-5 border border-white/10">
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Pending Vetting</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-white">
            {loadingStats ? '…' : stats?.pendingApplications || 0}
          </div>
          <p className="text-xs text-amber-400/80 mt-1">Awaiting ID check</p>
        </div>

        <div className="glass-card rounded-3xl p-5 border border-white/10">
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Verified Runners</span>
            <UserCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-white">
            {loadingStats ? '…' : stats?.totalRunners || 0}
          </div>
          <p className="text-xs text-emerald-400/80 mt-1">Approved students</p>
        </div>

        <div className="glass-card rounded-3xl p-5 border border-white/10">
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Completed Tasks</span>
            <PackageCheck className="w-5 h-5 text-primary-400" />
          </div>
          <div className="text-3xl font-bold text-white">
            {loadingStats ? '…' : stats?.completedCount || 0}
          </div>
          <p className="text-xs text-white/60 mt-1">
            out of {stats?.totalErrands || 0} placed
          </p>
        </div>

        <div className="glass-card rounded-3xl p-5 border border-white/10">
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Platform Revenue</span>
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-green-400">
            {loadingStats ? '…' : formatCurrency(stats?.totalRevenue || 0)}
          </div>
          <p className="text-xs text-white/60 mt-1">20% commission collected</p>
        </div>
      </div>

      {/* TAB 1: RUNNER APPLICATIONS VETTING */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {(['pending', 'approved', 'denied', 'all'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                    statusFilter === status
                      ? 'bg-white text-dark-base'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, matric, phone..."
                className="input pl-9 w-full text-sm"
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
              <h3 className="text-lg font-semibold text-white mb-1">No applications found</h3>
              <p className="text-white/60 text-sm max-w-md mx-auto">
                {statusFilter === 'pending'
                  ? 'All caught up! There are no pending runner applications to review at this moment.'
                  : `No applications with status "${statusFilter}".`}
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
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top status bar */}
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

                      {/* Academic & Logistics Meta */}
                      <div className="grid grid-cols-2 gap-3 p-3.5 bg-white/5 rounded-2xl border border-white/5 mb-4 text-xs">
                        <div>
                          <span className="text-white/40 block mb-0.5">Student Matric/ID</span>
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
                          <span className="text-white/40 block mb-0.5">Applied Date</span>
                          <span className="text-white/70">{new Date(app.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Document Preview Link */}
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
                              View Uploaded ID Card / Doc
                            </button>
                            <a
                              href={app.document_proof_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-all text-xs flex items-center gap-1"
                              title="Open in new tab"
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
                          Admin Notes (Reason / Confirmation record):
                        </label>
                        <input
                          type="text"
                          value={adminNotes[app.id] ?? (app.admin_notes || '')}
                          onChange={(e) =>
                            setAdminNotes((prev) => ({ ...prev, [app.id]: e.target.value }))
                          }
                          placeholder="e.g. Verified against Department list"
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

      {/* TAB 2: PLATFORM STATS */}
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
                  <p className="text-xs text-white/60">Total errand transactions</p>
                </div>
              </div>
              <div className="text-3xl font-bold text-white">
                {formatCurrency(stats.totalVolume)}
              </div>
              <div className="text-xs text-white/60">
                Paid out to student runners:{' '}
                <strong className="text-green-400">{formatCurrency(stats.totalRunnerPayouts)}</strong>
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-primary-500/10 text-primary-400">
                  <PackageCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Errand Completion Rate</h3>
                  <p className="text-xs text-white/60">Successful fulfillment</p>
                </div>
              </div>
              <div className="text-3xl font-bold text-white">
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
                  <h3 className="font-bold text-white">Campus Community</h3>
                  <p className="text-xs text-white/60">Registered users</p>
                </div>
              </div>
              <div className="text-3xl font-bold text-white">
                {stats.totalUsers}
              </div>
              <div className="text-xs text-white/60">
                {stats.totalRunners} verified runners actively working
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Proof Modal Preview */}
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
                <span>Check student ID name, photo, and matric against registration record</span>
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
