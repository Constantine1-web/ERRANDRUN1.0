'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { useSessionTracker } from '@/hooks/useSessionTracker';
import toast from 'react-hot-toast';
import {
  Compass,
  PlusCircle,
  Clock,
  Radio,
  Bike,
  Wallet,
  User,
  ShieldCheck,
  ChevronRight,
  LogOut,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { RunnerLogo } from '@/components/RunnerLogo';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser, logout } = useAppStore();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [activeErrand, setActiveErrand] = useState<{ id: string; title: string; status: string } | null>(null);

  useSessionTracker();

  // Determine current mode: 'request' or 'runner'
  const isRunnerRoute = pathname.startsWith('/dashboard/runner');
  const [activeMode, setActiveMode] = useState<'request' | 'runner'>(isRunnerRoute ? 'runner' : 'request');

  useEffect(() => {
    if (pathname.startsWith('/dashboard/runner')) {
      setActiveMode('runner');
    } else if (pathname === '/dashboard/user' || pathname.startsWith('/dashboard/errands')) {
      setActiveMode('request');
    }
  }, [pathname]);

  // Check verification expiration (Yearly Renewal)
  useEffect(() => {
    if (user && user.verificationStatus === 'verified' && user.verificationExpiresAt) {
      const expirationDate = new Date(user.verificationExpiresAt);
      if (new Date() > expirationDate) {
        useAppStore.getState().setUser({
          ...user,
          verificationStatus: 'unverified'
        });
        if (pathname !== '/dashboard/verify') {
          router.push('/dashboard/verify');
        }
      }
    }
  }, [user, router, pathname]);

  // Check auth & load user profile
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      if (!user) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) throw error;

          if (profile) {
            setUser({
              id: profile.id,
              email: session.user.email || '',
              fullName: profile.full_name,
              studentId: profile.student_id,
              phoneNumber: profile.phone_number,
              role: profile.role,
              avatarUrl: profile.avatar_url || undefined,
              verificationStatus: profile.verification_status,
              verificationExpiresAt: profile.verification_expires_at || undefined,
              rating: profile.rating || undefined,
              insurancePlanId: profile.insurance_plan_id || undefined,
            });
          }
        } catch (error: any) {
          console.warn('Failed to load user profile in layout:', error?.message || error);
        }
      }
    };

    checkAuth();
  }, [router, user, setUser]);

  // Fetch wallet balance & active errand
  useEffect(() => {
    if (!user?.id) return;

    const fetchTelemetry = async () => {
      // Wallet
      const { data: walletData } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      if (walletData) setWalletBalance(Number(walletData.balance));

      // Active Errand for Customer
      const { data: errandData } = await supabase
        .from('errands')
        .select('id, title, status')
        .eq('requester_id', user.id)
        .in('status', ['unassigned', 'assigned', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (errandData) {
        setActiveErrand(errandData);
      } else {
        setActiveErrand(null);
      }
    };

    fetchTelemetry();

    // Subscribe to errands table changes for real-time ticker
    const errandSub = supabase
      .channel(`user_active_errands_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'errands', filter: `requester_id.eq.${user.id}` },
        () => fetchTelemetry()
      )
      .subscribe();

    return () => {
      errandSub.unsubscribe();
    };
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      logout();
      router.push('/');
      toast.success('Signed out successfully');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  const handleModeSwitch = (mode: 'request' | 'runner') => {
    setActiveMode(mode);
    if (mode === 'runner') {
      if (user?.role !== 'runner' && user?.role !== 'admin') {
        router.push('/dashboard/runner/apply');
      } else {
        router.push('/dashboard/runner');
      }
    } else {
      router.push('/dashboard/user');
    }
  };

  // Nav configurations based on active mode
  const requestNav = [
    { label: 'Campus Hub', href: '/dashboard/user', icon: Compass },
    { label: 'Dispatch Errand', href: '/dashboard/errands/new', icon: PlusCircle, isCta: true },
    { label: 'My Requests', href: '/dashboard/errands', icon: Clock },
    { label: 'Money Hub', href: '/dashboard/wallet', icon: Wallet },
  ];

  const runnerNav = [
    { label: 'Opportunity Radar', href: '/dashboard/runner', icon: Radio },
    { label: 'Missions', href: '/dashboard/runner/tasks', icon: Bike },
    { label: 'GPS Broadcaster', href: '/dashboard/runner/track', icon: Zap },
    { label: 'Earnings & Wallet', href: '/dashboard/wallet', icon: Wallet },
  ];

  const currentNav = activeMode === 'runner' ? runnerNav : requestNav;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col antialiased selection:bg-blue-100 selection:text-blue-900">
      
      {/* ── TOP TELEMETRY COMMAND HEADER ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          
          {/* Brand & Campus Status */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href={activeMode === 'runner' ? '/dashboard/runner' : '/dashboard/user'} className="flex items-center gap-2 group">
              <RunnerLogo className="w-8 h-8 text-blue-600 transition-transform group-hover:scale-105" animate={false} />
              <div className="flex flex-col">
                <span className="font-black text-slate-900 text-base tracking-tight leading-none flex items-center gap-1.5">
                  ERRANDRUN
                  <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60">
                    2.0
                  </span>
                </span>
                <span className="text-[10px] font-semibold text-slate-500 tracking-wider flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Campus Grid Live
                </span>
              </div>
            </Link>
          </div>

          {/* Persistent Global Mode Switcher (Pill Architecture) */}
          <div className="hidden md:flex items-center bg-slate-100/90 p-1 rounded-full border border-slate-200">
            <button
              onClick={() => handleModeSwitch('request')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeMode === 'request'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Request Mode
            </button>
            <button
              onClick={() => handleModeSwitch('runner')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeMode === 'runner'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Runner Mode
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {currentNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    item.isCta
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm ml-2 px-4'
                      : isActive
                      ? 'bg-slate-100 text-blue-700 border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${item.isCta ? 'text-white' : isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}

            {user?.role === 'admin' && (
              <Link
                href="/dashboard/admin"
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ml-1 ${
                  pathname.startsWith('/dashboard/admin')
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                Ops Room
              </Link>
            )}
          </nav>

          {/* Wallet Balance & User Terminal */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Wallet Telemetry */}
            <Link
              href="/dashboard/wallet"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-mono transition-all group"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                ₦
              </div>
              <span className="font-bold text-slate-800 hidden sm:inline">
                {walletBalance !== null ? walletBalance.toLocaleString('en-NG') : '…'}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold sm:hidden">
                ₦{walletBalance !== null ? walletBalance.toLocaleString('en-NG') : '…'}
              </span>
            </Link>

            {/* Day / Night Mode Toggle */}
            <ThemeToggle variant="icon" />

            {/* Profile / Trust Seal */}
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shadow-inner">
                {user?.fullName?.charAt(0) || <User className="w-4 h-4" />}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[100px]">
                  {user?.fullName?.split(' ')[0] || 'Account'}
                </span>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  {user?.role === 'admin' ? 'Admin' : user?.role === 'runner' ? 'Runner' : 'Student'}
                </span>
              </div>
            </Link>

            {/* Sign out */}
            <button
              onClick={handleLogout}
              className="hidden sm:flex p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── ACTIVE ERRAND FLIGHT TICKER ── */}
      {activeErrand && (
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white px-4 py-2 text-xs font-medium shadow-sm transition-all animate-fadeIn">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 truncate">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="font-bold uppercase tracking-wider text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
                Live Mission
              </span>
              <span className="truncate font-semibold">{activeErrand.title}</span>
              <span className="text-blue-200 capitalize text-[11px] hidden sm:inline">
                ({activeErrand.status.replace('_', ' ')})
              </span>
            </div>
            <Link
              href={`/dashboard/user/errand/${activeErrand.id}`}
              className="flex items-center gap-1 font-bold text-white hover:underline shrink-0 text-xs bg-white/15 px-2.5 py-1 rounded-lg hover:bg-white/25 transition-colors"
            >
              Open Flight Tracker
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ── MOBILE MODE TOGGLE BAR ── */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full">
          <button
            onClick={() => handleModeSwitch('request')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeMode === 'request' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Request Mode
          </button>
          <button
            onClick={() => handleModeSwitch('runner')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeMode === 'runner' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Runner Mode
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT VIEWPORT ── */}
      <main className="flex-1 pb-24 md:pb-12">
        {children}
      </main>

      {/* ── MOBILE FLOATING THUMB ACTION DOCK ── */}
      <div className="md:hidden fixed bottom-3 left-0 right-0 z-50 px-4 pointer-events-none">
        <nav className="max-w-md mx-auto pointer-events-auto bg-slate-900/95 backdrop-blur-lg text-white rounded-2xl shadow-xl border border-slate-800 p-1.5 flex items-center justify-around">
          {currentNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            if (item.isCta) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="bg-blue-600 text-white p-3 rounded-xl shadow-lg hover:bg-blue-500 active:scale-95 transition-all -translate-y-2 border-2 border-slate-900"
                  title={item.label}
                >
                  <Icon className="w-5 h-5" />
                </Link>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl text-[10px] font-bold transition-all ${
                  isActive ? 'text-blue-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
          <Link
            href="/dashboard/profile"
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl text-[10px] font-bold transition-all ${
              pathname === '/dashboard/profile' ? 'text-blue-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </Link>
        </nav>
      </div>

    </div>
  );
}
