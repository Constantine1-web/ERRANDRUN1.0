'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { useSessionTracker } from '@/hooks/useSessionTracker';
import { Home, Zap, Wallet, User, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, setUser, logout } = useAppStore();

  // Session tracking
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      logout();
      router.push('/');
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const navItems = [
    { icon: Home, label: 'Home', href: '/dashboard/user', section: 'user' },
    { icon: Zap, label: 'Errands', href: '/dashboard/errands', section: 'user' },
    { icon: Wallet, label: 'Wallet', href: '/dashboard/wallet', section: 'user' },
    { icon: User, label: 'Profile', href: '/dashboard/profile', section: 'user' },
  ];

  return (
    <div className="min-h-screen bg-dark-base">
      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}

      {/* Desktop Header */}
      <header className="hidden md:block sticky top-0 z-30 border-b border-white/10 bg-dark-base/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-gradient">
            ⚡ ErrandRun
          </Link>
          <div className="flex items-center gap-6">
            {user && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                  ) : (
                    user.fullName?.charAt(0) || <User className="w-4 h-4" />
                  )}
                </div>
                <div className="text-sm">
                  <p className="text-white font-medium">{user.fullName}</p>
                  <p className="text-white/50 text-xs capitalize">{user.role}</p>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:fixed md:left-0 md:top-[73px] md:w-64 md:h-[calc(100vh-73px)] md:border-r md:border-white/10 md:p-6 md:block bg-dark-base/80 backdrop-blur-xl z-20">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 pb-24 md:pb-0 md:ml-64 relative min-h-[calc(100vh-73px)]">
          {children}
        </main>
      </div>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-white/10 bg-dark-secondary/80 backdrop-blur-xl">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center py-4 transition-all duration-200 ${
                  isActive ? 'text-primary-400' : 'text-white/40 hover:text-white/60'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-accent-purple"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
