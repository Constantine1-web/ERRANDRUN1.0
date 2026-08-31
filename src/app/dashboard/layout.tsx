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
} from 'lucide-react';
import toast from 'react-hot-toast';

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
      ? [{ icon: Bike, label: 'Runner', href: '/dashboard/runner' }]
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
    <div className="min-h-[100dvh] bg-dark-base text-white flex flex-col md:flex-row">
      
      {/* ═══ MOBILE TOP HEADER ═══ */}
      <header className="md:hidden sticky top-0 z-40 bg-dark-base/80 backdrop-blur-xl pt-2 pb-2 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary-500/20">
              ⚡
            </div>
            <div>
              <h1 className="font-bold text-white leading-none tracking-tight">ErrandRun</h1>
              <span className="text-[10px] text-white/50 font-medium">Campus Network</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80 backdrop-blur-md">
               <Wallet className="w-4.5 h-4.5" />
             </div>
             <Link href="/dashboard/profile" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
               <UserAvatar size="sm" />
             </Link>
          </div>
        </div>
      </header>

      {/* ═══ DESKTOP SIDEBAR ═══ */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:h-[100dvh] md:sticky md:top-0 md:border-r md:border-white/10 md:bg-dark-base/80 md:backdrop-blur-xl z-20">
        <div className="h-20 flex items-center px-6 border-b border-white/10 shrink-0">
          <Link href="/" className="text-2xl font-black text-gradient">
            ⚡ ErrandRun
          </Link>
        </div>
        
        {/* User Card Desktop */}
        {user && (
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <UserAvatar size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{user.fullName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-white/40 font-mono truncate">{user.studentId}</span>
                  <RoleBadge />
                </div>
              </div>
            </div>
            {/* Wallet Pill */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10">
              <span className="text-xs text-white/50">Wallet</span>
              <span className="text-sm font-mono font-bold text-emerald-400">
                {formatBalance(walletBalance)}
              </span>
            </div>
          </div>
        )}

        {/* Desktop Nav */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-none">
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

        {/* Desktop Footer */}
        <div className="p-4 border-t border-white/10 shrink-0">
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
      <main className="flex-1 w-full min-h-[calc(100dvh-57px)] md:min-h-[100dvh] pb-[calc(100px+env(safe-area-inset-bottom))] md:pb-0 relative">
        {children}
      </main>

      {/* ═══ FLOATING PILL BOTTOM NAVIGATION BAR (MOBILE) ═══ */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 pb-[env(safe-area-inset-bottom)]">
        <nav className="flex items-center justify-between px-2 h-[72px] bg-[#121826]/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl shadow-black/50">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center w-[60px] h-[60px] gap-1 transition-all duration-300 touch-manipulation rounded-full ${
                  isActive 
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25 -translate-y-2' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-[22px] h-[22px] transition-transform ${isActive ? 'scale-110' : ''}`} />
                <span className={`text-[9px] font-bold leading-none ${isActive ? 'text-white' : 'text-white/50'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

    </div>
  );
}
