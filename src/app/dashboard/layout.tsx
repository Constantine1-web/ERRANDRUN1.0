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

  // Mode state: 'request' (Customer / Blue) or 'runner' (Courier / Emerald)
  const isRunnerRoute = pathname.startsWith('/dashboard/runner');
  const [activeMode, setActiveMode] = useState<'request' | 'runner'>(
    isRunnerRoute ? 'runner' : 'request'
  );

  useEffect(() => {
    if (pathname.startsWith('/dashboard/runner')) {
      setActiveMode('runner');
    } else if (
      pathname.startsWith('/dashboard/user') ||
      pathname.startsWith('/dashboard/errands')
    ) {
      setActiveMode('request');
    }
  }, [pathname]);

  // Fetch user profile and sync verification status
  useEffect(() => {
    const fetchUserAndVerify = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          router.replace('/login');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!profileError && profile) {
          // Yearly verification expiration check
          const expiresAt = profile.verification_expires_at
            ? new Date(profile.verification_expires_at)
            : null;
          const isExpired = expiresAt ? expiresAt < new Date() : false;

          let updatedVerificationStatus = profile.verification_status;
          let updatedRole = profile.role;

          if (isExpired && profile.verification_status === 'verified') {
            updatedVerificationStatus = 'expired';
            if (profile.role === 'runner') {
              updatedRole = 'user';
            }

            await supabase
              .from('profiles')
              .update({ verification_status: 'expired', role: updatedRole })
              .eq('id', session.user.id);

            toast.error('Student verification expired. Re-verify to unlock runner mode.');
          }

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            fullName: profile.full_name,
            phoneNumber: profile.phone_number,
            studentId: profile.student_id,
            role: updatedRole,
            verificationStatus: updatedVerificationStatus,
            verificationExpiresAt: profile.verification_expires_at,
            rating: profile.rating,
          });
        }
      } catch (err) {
        console.error('Session verification error:', err);
      }
    };

    fetchUserAndVerify();
  }, [router, setUser]);

  // Real-time telemetry: wallet balance & in-flight active errand
  useEffect(() => {
    if (!user?.id) return;

    const fetchTelemetry = async () => {
      try {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        if (wallet) setWalletBalance(wallet.balance);

        // Check for in-flight errands
        const { data: inFlight } = await supabase
          .from('errands')
          .select('id, title, status')
          .eq('requester_id', user.id)
          .in('status', ['assigned', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setActiveErrand(inFlight || null);
      } catch (err) {
        console.error('Telemetry fetch failed:', err);
      }
    };

    fetchTelemetry();

    // Listen to real-time wallet & errand events
    const walletSub = supabase
      .channel(`wallet_telemetry_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallets', filter: `user_id.eq.${user.id}` },
        () => fetchTelemetry()
      )
      .subscribe();

    const errandSub = supabase
      .channel(`active_errand_telemetry_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'errands', filter: `requester_id.eq.${user.id}` },
        () => fetchTelemetry()
      )
      .subscribe();

    return () => {
      walletSub.unsubscribe();
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
    { label: 'Roster', href: '/dashboard/runner/tasks', icon: Bike },
    { label: 'GPS Broadcaster', href: '/dashboard/runner/track', icon: Zap },
    { label: 'Earnings & Wallet', href: '/dashboard/wallet', icon: Wallet },
  ];

  const currentNav = activeMode === 'runner' ? runnerNav : requestNav;
  const isRunner = activeMode === 'runner';

  return (
    <div
      className={`min-h-screen flex flex-col antialiased transition-colors duration-300 ${
        isRunner
          ? 'bg-slate-50 dark:bg-[#070D12] text-slate-900 dark:text-slate-100 selection:bg-emerald-100 selection:text-emerald-900'
          : 'bg-[#F8FAFC] dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 selection:bg-blue-100 selection:text-blue-900'
      }`}
    >
      {/* ── TOP DISTINCT COLOR STRIPE (Instant Visual Identity) ── */}
      <div
        className={`w-full transition-all duration-300 ${
          isRunner
            ? 'h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
            : 'h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500'
        }`}
      />

      {/* ── TOP TELEMETRY COMMAND HEADER ── */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          
          {/* Brand & Dynamic Mode Badge */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href={isRunner ? '/dashboard/runner' : '/dashboard/user'}
              className="flex items-center gap-2 group"
            >
              <RunnerLogo
                className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform group-hover:scale-105 ${
                  isRunner ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                }`}
                animate={isRunner}
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-slate-900 dark:text-white text-sm sm:text-base tracking-tight leading-none">
                    ERRANDRUN
                  </span>
                  <span
                    className={`text-[9px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded transition-colors ${
                      isRunner
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    {isRunner ? 'RUNNER FLEET' : 'REQUEST'}
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1 mt-0.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isRunner ? 'bg-emerald-500 animate-ping' : 'bg-emerald-500 animate-pulse'
                    }`}
                  ></span>
                  {isRunner ? '⚡ Runner Telemetry' : 'Campus Grid Live'}
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Mode Switcher (Pill Architecture) */}
          <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800/90 p-1 rounded-full border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => handleModeSwitch('request')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                !isRunner
                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/20'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Request Mode
            </button>
            <button
              onClick={() => handleModeSwitch('runner')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                isRunner
                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/20'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
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
                      ? isRunner
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm ml-2 px-4'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm ml-2 px-4'
                      : isActive
                      ? isRunner
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      item.isCta
                        ? 'text-white'
                        : isActive
                        ? isRunner
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-400'
                    }`}
                  />
                  {item.label}
                </Link>
              );
            })}

            {user?.role === 'admin' && (
              <Link
                href="/dashboard/admin"
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ml-1 ${
                  pathname.startsWith('/dashboard/admin')
                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                Ops Room
              </Link>
            )}
          </nav>

          {/* Right Header Controls: Wallet, Day/Night, Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Quick Wallet Telemetry */}
            <Link
              href="/dashboard/wallet"
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-mono transition-all group"
            >
              <div
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform ${
                  isRunner
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                }`}
              >
                ₦
              </div>
              <span className="font-bold text-slate-900 dark:text-white text-xs">
                {walletBalance !== null ? walletBalance.toLocaleString('en-NG') : '…'}
              </span>
            </Link>

            {/* Day / Night Mode Toggle */}
            <ThemeToggle variant="icon" />

            {/* Profile Avatar */}
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full font-bold flex items-center justify-center text-xs shadow-inner ${
                  isRunner
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 ring-2 ring-blue-500/20'
                }`}
              >
                {user?.fullName?.charAt(0) || <User className="w-3.5 h-3.5" />}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[100px]">
                  {user?.fullName?.split(' ')[0] || 'Account'}
                </span>
                <span className="text-[9px] text-slate-400 uppercase font-semibold">
                  {user?.role === 'admin' ? 'Admin' : user?.role === 'runner' ? 'Runner' : 'Student'}
                </span>
              </div>
            </Link>

            {/* Sign out */}
            <button
              onClick={handleLogout}
              className="hidden sm:flex p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── ACTIVE ERRAND FLIGHT TICKER ── */}
      {activeErrand && (
        <div
          className={`px-3 sm:px-4 py-2 text-xs font-medium shadow-sm transition-all animate-fadeIn ${
            isRunner
              ? 'bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white'
              : 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white'
          }`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate text-xs">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <span className="font-bold uppercase tracking-wider text-[9px] bg-white/20 px-1.5 py-0.5 rounded">
                Live Mission
              </span>
              <span className="truncate font-semibold text-xs">{activeErrand.title}</span>
            </div>
            <Link
              href={`/dashboard/user/errand/${activeErrand.id}`}
              className="flex items-center gap-1 font-bold text-white hover:underline shrink-0 text-[11px] bg-white/20 px-2 py-1 rounded-lg hover:bg-white/30 transition-colors"
            >
              Open Tracker
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* ── MOBILE TACTILE MODE SELECTOR BAR (Pinned at top on phones) ── */}
      <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-between shadow-sm transition-colors">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => handleModeSwitch('request')}
            className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              !isRunner
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Request Mode</span>
          </button>
          <button
            onClick={() => handleModeSwitch('runner')}
            className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              isRunner
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Runner Mode</span>
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT VIEWPORT (Fully responsive on mobile) ── */}
      <main className="flex-1 pb-24 md:pb-12 w-full max-w-full overflow-x-hidden">
        {children}
      </main>

      {/* ── MOBILE FLOATING THUMB ACTION DOCK (Ergonomic for 80% students) ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom),10px)] pt-1 pointer-events-none">
        <nav
          className={`max-w-md mx-auto pointer-events-auto backdrop-blur-xl rounded-2xl shadow-2xl border p-1.5 flex items-center justify-around transition-all ${
            isRunner
              ? 'bg-slate-950/95 border-emerald-900/50 shadow-emerald-950/30'
              : 'bg-slate-900/95 border-slate-800 shadow-slate-950/40'
          }`}
        >
          {currentNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            if (item.isCta) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`p-3 rounded-xl shadow-lg active:scale-95 transition-all -translate-y-3 border-2 ${
                    isRunner
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-slate-950 shadow-emerald-500/40'
                      : 'bg-blue-600 hover:bg-blue-500 text-white border-slate-900 shadow-blue-500/40'
                  }`}
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
                className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-all min-w-[54px] ${
                  isActive
                    ? isRunner
                      ? 'text-emerald-400'
                      : 'text-blue-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? (isRunner ? 'text-emerald-400' : 'text-blue-400') : ''}`} />
                <span className="truncate max-w-[62px]">{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}

          <Link
            href="/dashboard/profile"
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-all min-w-[54px] ${
              pathname === '/dashboard/profile'
                ? isRunner
                  ? 'text-emerald-400'
                  : 'text-blue-400'
                : 'text-slate-400 hover:text-white'
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
