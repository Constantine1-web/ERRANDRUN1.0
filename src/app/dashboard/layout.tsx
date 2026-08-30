'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, setUser, logout } = useAppStore();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useSessionTracker();

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

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
              rating: profile.rating || undefined,
              insurancePlanId: profile.insurance_plan_id || undefined,
            });
          }
        } catch (error) {
          console.error('Failed to load user profile in layout:', error);
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
    { icon: Home, label: 'Home', href: '/dashboard/user' },
    { icon: Zap, label: 'Errands', href: '/dashboard/errands' },
    ...(user?.role === 'runner' || user?.role === 'admin'
      ? [{ icon: Bike, label: 'Runner Hub', href: '/dashboard/runner' }]
      : []),
    { icon: Wallet, label: 'Wallet', href: '/dashboard/wallet' },
    ...(user?.role === 'admin'
      ? [{ icon: ShieldCheck, label: 'Admin', href: '/dashboard/admin' }]
      : []),
    { icon: User, label: 'Profile', href: '/dashboard/profile' },
  ];

  const formatBalance = (val: number | null) => {
    if (val === null) return '…';
    return `₦${val.toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;
  };

  const UserAvatar = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => {
    const dim = size === 'md' ? 'w-10 h-10 text-base' : 'w-8 h-8 text-sm';
    return (
      <div
        className={`${dim} rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold overflow-hidden flex-shrink-0`}
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
        ? 'bg-accent-purple/20 text-purple-300 border-accent-purple/30'
        : user.role === 'runner'
        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
        : 'bg-white/10 text-white/70 border-white/10';
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors}`}
      >
        {user.role}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-dark-base text-white">
      {/* ═══ MOBILE TOP HEADER ═══ */}
      <header className="md:hidden sticky top-0 z-40 border-b border-white/10 bg-dark-base/90 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Hamburger */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>

          {/* Brand */}
          <Link
            href="/dashboard/user"
            className="text-lg font-black text-gradient"
          >
            ⚡ ErrandRun
          </Link>

          {/* Avatar */}
          <Link href="/dashboard/profile">
            <UserAvatar size="sm" />
          </Link>
        </div>
      </header>

      {/* ═══ DESKTOP TOP HEADER ═══ */}
      <header className="hidden md:block sticky top-0 z-30 border-b border-white/10 bg-dark-base/90 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-black text-gradient flex items-center gap-1.5"
          >
            <span>⚡</span>
            <span>ErrandRun</span>
          </Link>

          <div className="flex items-center gap-5">
            {/* Wallet Balance Pill */}
            <Link
              href="/dashboard/wallet"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono hover:bg-emerald-500/20 transition-colors"
            >
              {formatBalance(walletBalance)}
            </Link>

            {/* User Identity Block */}
            {user && (
              <div className="flex items-center gap-3">
                <UserAvatar size="sm" />
                <div className="text-right">
                  <p className="text-sm text-white font-medium leading-tight">
                    {user.fullName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-white/40 font-mono">
                      {user.studentId}
                    </span>
                    <RoleBadge />
                  </div>
                </div>
              </div>
            )}

            {/* Sign Out */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl hover:bg-white/5 text-white/50 hover:text-white transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ═══ MOBILE SLIDE-OUT DRAWER ═══ */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer panel */}
            <motion.aside
              className="fixed top-0 left-0 bottom-0 w-[280px] max-w-[85vw] z-50 md:hidden
                         bg-dark-base/95 backdrop-blur-2xl border-r border-white/10
                         flex flex-col overflow-y-auto"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <span className="text-lg font-black text-gradient">
                  ⚡ ErrandRun
                </span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-white/10 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* User identity card */}
              {user && (
                <div className="px-5 py-4 border-b border-white/5">
                  <div className="flex items-center gap-3 mb-3">
                    <UserAvatar size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {user.fullName}
                      </p>
                      <p className="text-[11px] text-white/40 font-mono truncate">
                        {user.studentId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RoleBadge />
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {formatBalance(walletBalance)}
                    </span>
                  </div>
                </div>
              )}

              {/* Navigation links */}
              <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium text-sm">{item.label}</span>
                      {isActive && (
                        <ChevronRight className="w-4 h-4 ml-auto opacity-60" />
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Drawer footer: Sign Out */}
              <div className="px-3 py-4 border-t border-white/10 mt-auto">
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 transition-all w-full"
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium text-sm">Sign Out</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex">
        {/* ═══ DESKTOP SIDEBAR ═══ */}
        <aside className="hidden md:flex md:flex-col md:fixed md:left-0 md:top-[57px] md:w-64 md:h-[calc(100vh-57px)] md:border-r md:border-white/10 md:bg-dark-base/80 md:backdrop-blur-xl z-20">
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop sidebar footer */}
          <div className="p-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all w-full"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium text-sm">Sign Out</span>
            </button>
          </div>
        </aside>

        {/* ═══ MAIN CONTENT ═══ */}
        <main className="flex-1 md:ml-64 min-h-[calc(100vh-57px)] w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
