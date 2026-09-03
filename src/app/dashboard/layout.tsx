'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { useSessionTracker } from '@/hooks/useSessionTracker';
import toast from 'react-hot-toast';
import {
  Home,
  Plus,
  Package,
  Radio,
  Wallet,
  User,
  ShieldCheck,
  LogOut,
  ArrowRight,
  Zap,
  Clock
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

  // Real-time telemetry: wallet balance & active order
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

  const isRunner = activeMode === 'runner';

  // Consumer App Navigation Tabs
  const requestNav = [
    { label: 'Home', href: '/dashboard/user', icon: Home },
    { label: 'Activity', href: '/dashboard/errands', icon: Clock },
    { label: 'Request', href: '/dashboard/errands/new', icon: Plus, isCta: true },
    { label: 'Wallet', href: '/dashboard/wallet', icon: Wallet },
    { label: 'Account', href: '/dashboard/profile', icon: User },
  ];

  const runnerNav = [
    { label: 'Radar', href: '/dashboard/runner', icon: Radio },
    { label: 'Tasks', href: '/dashboard/runner/tasks', icon: Package },
    { label: 'Go Live', href: '/dashboard/runner/track', icon: Zap, isCta: true },
    { label: 'Earnings', href: '/dashboard/wallet', icon: Wallet },
    { label: 'Account', href: '/dashboard/profile', icon: User },
  ];

  const currentNav = isRunner ? runnerNav : requestNav;

  return (
    <div
      className={`min-h-screen flex flex-col antialiased transition-colors duration-200 ${
        isRunner
          ? 'bg-slate-50 dark:bg-[#070D12] text-slate-900 dark:text-slate-100'
          : 'bg-[#F8FAFC] dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100'
      }`}
    >
      {/* ── TOP UBER-STYLE HEADER ── */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          
          {/* Brand & Campus Pill */}
          <div className="flex items-center gap-3">
            <Link
              href={isRunner ? '/dashboard/runner' : '/dashboard/user'}
              className="flex items-center gap-2 group"
            >
              <RunnerLogo
                className={`w-7 h-7 transition-transform group-hover:scale-105 ${
                  isRunner ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                }`}
                animate={false}
              />
              <span className="font-black text-slate-900 dark:text-white text-base tracking-tight leading-none">
                ERRANDRUN
              </span>
            </Link>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <span className={`w-1.5 h-1.5 rounded-full ${isRunner ? 'bg-emerald-500' : 'bg-blue-500'}`} />
              UniUyo Campus
            </span>
          </div>

          {/* Center Mode Switcher (Uber vs Uber Driver toggle) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200/80 dark:border-slate-700 text-xs">
            <button
              onClick={() => handleModeSwitch('request')}
              className={`px-3 sm:px-4 py-1.5 rounded-full font-bold transition-all ${
                !isRunner
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Request
            </button>
            <button
              onClick={() => handleModeSwitch('runner')}
              className={`px-3 sm:px-4 py-1.5 rounded-full font-bold transition-all ${
                isRunner
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Runner
            </button>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            {/* Quick Wallet Pill */}
            <Link
              href="/dashboard/wallet"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white transition-colors"
            >
              <span className="text-emerald-600 dark:text-emerald-400">₦</span>
              <span>{walletBalance !== null ? walletBalance.toLocaleString('en-NG') : '…'}</span>
            </Link>

            {/* Theme Toggle */}
            <ThemeToggle variant="icon" />

            {/* User Avatar */}
            <Link
              href="/dashboard/profile"
              className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs shadow-inner"
            >
              {user?.fullName?.charAt(0) || <User className="w-3.5 h-3.5" />}
            </Link>

            {user?.role === 'admin' && (
              <Link
                href="/dashboard/admin"
                className="hidden lg:flex p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl"
                title="Admin Ops"
              >
                <ShieldCheck className="w-4 h-4" />
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="hidden lg:flex p-2 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── ACTIVE ERRAND FLOATING TICKER (Deliveroo style) ── */}
      {activeErrand && (
        <div className="bg-blue-600 text-white px-4 py-2.5 shadow-sm text-xs font-medium">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 truncate">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
              </span>
              <span className="font-bold text-[10px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                Active Ride
              </span>
              <span className="truncate font-semibold">{activeErrand.title}</span>
            </div>
            <Link
              href={`/dashboard/user/errand/${activeErrand.id}`}
              className="flex items-center gap-1 font-bold text-white bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs shrink-0 transition-colors"
            >
              Track Live <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ── MAIN CONSUMER APP VIEWPORT ── */}
      <main className="flex-1 pb-24 md:pb-12 max-w-5xl mx-auto w-full px-4 sm:px-6">
        {children}
      </main>

      {/* ── APP-LIKE BOTTOM NAVIGATION DOCK (Uber / Bolt Style) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-[max(env(safe-area-inset-bottom),8px)] pt-1 transition-colors">
        <nav className="max-w-md mx-auto flex items-center justify-around px-2">
          {currentNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            if (item.isCta) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`p-3 rounded-2xl shadow-lg active:scale-95 transition-all -translate-y-3.5 border-2 border-white dark:border-slate-900 ${
                    isRunner
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/30'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30'
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
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-bold transition-all ${
                  isActive
                    ? isRunner
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

    </div>
  );
}
