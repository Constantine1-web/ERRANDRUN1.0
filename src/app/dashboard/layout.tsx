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
  Clock,
  MessageSquare,
  Heart,
  HelpCircle,
  Settings,
  MapPin,
  Bell,
  Menu,
  ChevronDown,
  TrendingUp,
  Power,
  RadioTower,
  Eye,
  EyeOff
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
  const { user, setUser, logout, hideBalance, setHideBalance } = useAppStore();
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
            fullName: profile.full_name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || '',
            phoneNumber: profile.phone_number || '',
            studentId: profile.student_id || '',
            role: updatedRole,
            verificationStatus: updatedVerificationStatus,
            verificationExpiresAt: profile.verification_expires_at,
            rating: profile.rating,
          });
        } else if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || '',
            phoneNumber: '',
            studentId: '',
            role: 'user',
            verificationStatus: 'unverified',
            verificationExpiresAt: null,
            rating: 5.0,
          });
        }
      } catch (err) {
        console.warn('Session verification error:', err);
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
        console.warn('Telemetry fetch failed:', err);
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

  // Desktop Sidebar Links
  const sidebarLinks = [
    { label: 'Home', href: '/dashboard/user', icon: Home },
    { label: 'Activity', href: '/dashboard/errands', icon: Clock },
    { label: 'Wallet', href: '/dashboard/wallet', icon: Wallet },
    { label: 'Messages', href: '/dashboard/messages', icon: MessageSquare, badge: 3 },
    { label: 'Favorites', href: '/dashboard/favorites', icon: Heart },
    { label: 'Help & Support', href: '/dashboard/support', icon: HelpCircle },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  
  // Runner Desktop Sidebar Links
  const runnerSidebarLinks = [
    { label: 'Runner Console', href: '/dashboard/runner', icon: Radio },
    { label: 'Radar', href: '/dashboard/runner/radar', icon: RadioTower },
    { label: 'Tasks', href: '/dashboard/runner/tasks', icon: Package },
    { label: 'Earnings', href: '/dashboard/runner/earnings', icon: Wallet },
    { label: 'Performance', href: '/dashboard/runner/performance', icon: TrendingUp },
    { label: 'Wallet', href: '/dashboard/wallet', icon: Wallet },
    { label: 'Account', href: '/dashboard/profile', icon: User },
    { label: 'Help & Support', href: '/dashboard/support', icon: HelpCircle },
  ];

  const currentSidebarLinks = isRunner ? runnerSidebarLinks : sidebarLinks;

  // Mobile Bottom Nav Links
  
  const runnerMobileNav = [
    { label: 'Radar', href: '/dashboard/runner', icon: RadioTower },
    { label: 'Tasks', href: '/dashboard/runner/tasks', icon: Package },
    { label: 'Go Online', href: '/dashboard/runner/online', icon: Zap, isCta: true },
    { label: 'Earnings', href: '/dashboard/wallet', icon: Wallet },
    { label: 'Account', href: '/dashboard/profile', icon: User },
  ];

  const mobileNav = [
    { label: 'Home', href: '/dashboard/user', icon: Home },
    { label: 'Activity', href: '/dashboard/errands', icon: Clock },
    { label: 'Request', href: '/dashboard/errands/new', icon: Plus, isCta: true },
    { label: 'Wallet', href: '/dashboard/wallet', icon: Wallet },
    { label: 'Account', href: '/dashboard/profile', icon: User },
  ];

  const currentMobileNav = isRunner ? runnerMobileNav : mobileNav;

  return (
    <div className="min-h-screen flex antialiased bg-[#F4F7FE] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100">
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50">
        <div className="p-6">
          <Link href="/dashboard/user" className="flex items-center gap-2 group">
            <RunnerLogo className="w-8 h-8 text-blue-600 dark:text-blue-500 transition-transform group-hover:scale-105" animate={false} />
            <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white">ERRANDRUN</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {currentSidebarLinks.map((link) => {
            const isActive = pathname === link.href || (link.href === '/dashboard/user' && pathname === '/dashboard');
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive 
                    ? (isRunner ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400') 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? (isRunner ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400') : 'text-slate-400 dark:text-slate-500'}`} />
                  {link.label}
                </div>
                {link.badge && (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          {isRunner ? (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Go Online</h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Start receiving student requests and earn
              </p>
              <button 
                className="w-full py-2.5 rounded-xl bg-[#00A859] hover:bg-green-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Power className="w-4 h-4" /> Go Online
              </button>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 text-center space-y-3">
              <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Want to earn? Switch to Runner Mode and start making money.
              </p>
              <button 
                onClick={() => handleModeSwitch('runner')}
                className="w-full py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Switch Now
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── MAIN CONTENT WRAPPER ── */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        
        {/* ── TOP HEADER ── */}
        {/* ── TOP HEADER (RESPONSIVE) ── */}
        <header className="sticky top-0 z-40 bg-white/90 lg:bg-[#F4F7FE]/90 dark:bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50">
          
          {/* MOBILE VIEW HEADER */}
          <div className="lg:hidden px-4 h-14 flex items-center justify-between">
            <button className="p-2 -ml-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
              <Menu className="w-6 h-6" />
            </button>
            
            <Link href="/dashboard/user" className="flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2">
              <RunnerLogo className="w-6 h-6 text-blue-600 dark:text-blue-500" animate={false} />
              <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white">ERRANDRUN</span>
            </Link>

            <div className="flex items-center gap-1">
              <button className="relative p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#0B0F19]"></span>
              </button>
              <Link href="/dashboard/profile" className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-[10px] shadow-sm overflow-hidden">
                {user?.fullName?.charAt(0) || <User className="w-3.5 h-3.5" />}
              </Link>
            </div>
          </div>

          {/* DESKTOP VIEW HEADER */}
          <div className="hidden lg:flex px-6 h-16 items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">UniUyo Campus</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center bg-slate-200/50 dark:bg-slate-800 p-1 rounded-full text-xs font-semibold border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => handleModeSwitch('request')}
                  className={`px-4 py-1.5 rounded-full transition-all ${!isRunner ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  Request
                </button>
                <button
                  onClick={() => handleModeSwitch('runner')}
                  className={`px-4 py-1.5 rounded-full transition-all ${isRunner ? 'bg-[#00A859] text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  Runner
                </button>
              </div>

              {isRunner ? (
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[#00A859]"></span>
                  <span className="text-xs font-bold text-[#00A859]">You are Offline</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm pl-1 pr-1 py-1">
                  <Link href="/dashboard/wallet" className="flex items-center gap-2 px-2 hover:opacity-80 transition-opacity">
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 p-1.5 rounded-full">
                      <Wallet className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-500" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {hideBalance ? '****' : `₦${walletBalance !== null ? walletBalance.toLocaleString('en-NG') : '…'}`}
                    </span>
                  </Link>
                  <button 
                    onClick={() => setHideBalance(!hideBalance)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    {hideBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              <ThemeToggle variant="icon" />

              <button className="relative p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#F4F7FE] dark:border-[#0B0F19]"></span>
              </button>

              <Link href="/dashboard/profile" className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs shadow-sm overflow-hidden">
                 {user?.fullName?.charAt(0) || <User className="w-4 h-4" />}
              </Link>
              
              {user?.role === 'admin' && (
                <Link href="/dashboard/admin" className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-full">
                  <ShieldCheck className="w-5 h-5" />
                </Link>
              )}
              
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* ── ACTIVE ERRAND TICKER ── */}
        {activeErrand && (
          <div className="bg-blue-600 text-white px-4 py-2.5 shadow-sm text-xs font-medium">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 truncate">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                </span>
                <span className="font-bold text-[10px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  Active Ride
                </span>
                <span className="truncate font-semibold">{activeErrand.title}</span>
              </div>
              <Link
                href={`/dashboard/user/errand/${activeErrand.id}`}
                className="flex items-center gap-1 font-bold text-blue-600 bg-white hover:bg-slate-50 px-3 py-1 rounded-full text-xs shrink-0 transition-colors shadow-sm"
              >
                Track Live <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 pb-24 lg:pb-8 w-full">
          {children}
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAVIGATION ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-[max(env(safe-area-inset-bottom),8px)] pt-1">
        <nav className="flex items-center justify-around px-2">
          {currentMobileNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            if (item.isCta) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`p-3 rounded-2xl shadow-lg active:scale-95 transition-all -translate-y-3.5 border-2 border-white dark:border-slate-900 ${isRunner ? "bg-[#00A859] hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"} text-white`}
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
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400'
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
