'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { useSessionTracker } from '@/hooks/useSessionTracker';
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
    { label: 'Overview', href: '/dashboard/user' },
    { label: 'My Errands', href: '/dashboard/errands' },
    ...(user?.role === 'runner' || user?.role === 'admin'
      ? [{ label: 'Run Errands', href: '/dashboard/runner' }]
      : []),
    { label: 'Wallet', href: '/dashboard/wallet' },
    { label: 'Profile', href: '/dashboard/profile' },
    ...(user?.role === 'admin'
      ? [{ label: 'Admin', href: '/dashboard/admin' }]
      : []),
  ];

  // ── STRIPPED: Awaiting redesign ──
  return (
    <div>
      <nav style={{ display: 'flex', gap: '16px', padding: '12px 16px', borderBottom: '1px solid #eee' }}>
        <strong>ERRANDRUN</strong>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} style={{ color: pathname === item.href ? '#2563EB' : '#666', textDecoration: 'none', fontSize: '14px' }}>
            {item.label}
          </Link>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#666' }}>
          {user?.fullName} · ₦{walletBalance?.toLocaleString() ?? '…'}
        </span>
        <button onClick={handleLogout} style={{ fontSize: '13px', color: '#e33', background: 'none', border: 'none', cursor: 'pointer' }}>
          Logout
        </button>
      </nav>
      <main>{children}</main>
    </div>
  );
}
