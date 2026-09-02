'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { useSessionTracker } from '@/hooks/useSessionTracker';
import {
  Home,
  Zap,
  Wallet,
  User,
  LogOut,
  ShieldCheck,
  Bike,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { RunnerLogo } from '@/components/RunnerLogo';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser, logout } = useAppStore();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useSessionTracker();

  // Check verification expiration (Yearly Renewal)
  useEffect(() => {
    if (user && user.verificationStatus === 'verified' && user.verificationExpiresAt) {
      const expirationDate = new Date(user.verificationExpiresAt);
      if (new Date() > expirationDate) {
        // Demote user to unverified
        useAppStore.getState().setUser({
          ...user,
          verificationStatus: 'unverified'
        });

        // Show notification once
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

  // Fetch wallet balance
  useEffect(() => {
    if (!user?.id) return;

    const fetchBalance = async () => {
      const { data } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      if (data) setWalletBalance(Number(data.balance));
    };

    fetchBalance();
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

  const navItems = [
    { icon: Home, label: 'Overview', href: '/dashboard/user' },
    { icon: Zap, label: 'My Errands', href: '/dashboard/errands' },
    ...(user?.role === 'runner' || user?.role === 'admin'
      ? [{ icon: Bike, label: 'Run Errands', href: '/dashboard/runner' }]
      : []),
    { icon: Wallet, label: 'Wallet', href: '/dashboard/wallet' },
    { icon: User, label: 'Profile', href: '/dashboard/profile' },
    ...(user?.role === 'admin'
      ? [{ icon: ShieldCheck, label: 'Admin', href: '/dashboard/admin' }]
      : []),
  ];

  const formatBalance = (val: number | null) => {
    if (val === null) return '…';
    return `₦${val.toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;
  };

  // Group nav items for desktop sidebar
  const customerNav = navItems.filter(item => ['Overview', 'My Errands', 'Wallet', 'Profile'].includes(item.label));
  const runnerNav = navItems.filter(item => item.label === 'Run Errands');
  const adminNav = navItems.filter(item => item.label === 'Admin');

  const UserAvatar = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => {
    const dim = size === 'md' ? 'w-10 h-10 text-base' : 'w-8 h-8 text-sm';
    return (
      <div
        className={`${dim} rounded-full bg-slate-200 flex items-center justify-center text-blue-600 font-bold overflow-hidden flex-shrink-0`}
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName}
            className="w-full h-full object-cover"
          />
        ) : (
          user?.fullName?.charAt(0) || <User className="w-4 h-4" />
        )}
      </div>
    );
  };

  const RoleBadge = () => {
    if (!user?.role) return null;
    const colors =
      user.role === 'admin'
        ? 'bg-purple-100 text-purple-700'
        : user.role === 'runner'
        ? 'bg-green-100 text-green-700'
        : 'bg-slate-100 text-slate-600';
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors}`}>
        {user.role}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">

      {/* ═══ MOBILE TOP HEADER ═══ */}
      <header className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RunnerLogo className="w-7 h-7" animate={false} />
          <span className="font-bold text-slate-900 tracking-tight">
            Errand<span className="text-blue-600">Run</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/wallet"
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <Wallet className="w-4 h-4" />
          </Link>
          <Link href="/dashboard/profile" className="flex-shrink-0">
            <UserAvatar size="sm" />
          </Link>
        </div>
      </header>

      {/* ═══ DESKTOP SIDEBAR ═══ */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:h-screen md:sticky md:top-0 bg-white border-r border-slate-200 shrink-0 z-20">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 shrink-0 gap-3">
          <RunnerLogo className="w-8 h-8" animate={false} />
          <h1 className="text-lg font-black text-slate-900 tracking-tight">
            Errand<span className="text-blue-600">Run</span>
          </h1>
        </div>

        {/* User Card */}
        {user && (
          <div className="px-4 py-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <UserAvatar size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user.fullName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-400 font-mono truncate">{user.studentId}</span>
                  <RoleBadge />
                </div>
              </div>
            </div>
            {/* Wallet pill */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500">Wallet</span>
              <span className="text-sm font-mono font-bold text-green-700">
                {formatBalance(walletBalance)}
              </span>
            </div>
          </div>
        )}

        {/* Desktop Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-5 scrollbar-none">
          {/* Customer section */}
          <div className="space-y-0.5">
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Menu</p>
            {customerNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Runner section */}
          {runnerNav.length > 0 && (
            <div className="space-y-0.5 pt-3 border-t border-slate-100">
              <p className="px-3 text-[10px] font-bold text-green-600/70 uppercase tracking-wider mb-1.5">Runner Mode</p>
              {runnerNav.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                      isActive
                        ? 'bg-green-50 text-green-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Admin section */}
          {adminNav.length > 0 && (
            <div className="space-y-0.5 pt-3 border-t border-slate-100">
              <p className="px-3 text-[10px] font-bold text-purple-600/70 uppercase tracking-wider mb-1.5">Admin Mode</p>
              {adminNav.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                      isActive
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-200 shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all w-full"
          >
            <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 flex flex-col bg-slate-50 pb-20 md:pb-0">
        {/* Verification banner */}
        {user && user.verificationStatus !== 'verified' && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-amber-800 font-medium">
                Please verify your student profile to post or accept errands.
              </p>
            </div>
            <Link
              href="/dashboard/verify"
              className="shrink-0 bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-600 transition-colors ml-3"
            >
              Verify Now
            </Link>
          </div>
        )}
        <div className="flex-1 relative">
          {children}
        </div>
      </main>

      {/* ═══ MOBILE BOTTOM NAVIGATION ═══ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors touch-manipulation ${
                isActive ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>

    </div>
  );
}
