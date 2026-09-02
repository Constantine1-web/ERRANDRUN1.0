'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  ListOrdered, 
  MapPin, 
  Wallet, 
  User, 
  LogOut, 
  Menu, 
  X,
  ShieldAlert
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabaseClient';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, profile, clearSession } = useAppStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearSession();
    window.location.href = '/';
  };

  const navItems = [
    { href: '/dashboard/user', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/errands/new', label: 'Request Errand', icon: ListOrdered },
    { href: '/dashboard/runner', label: 'Run Errands', icon: MapPin },
    { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
    { href: '/dashboard/profile', label: 'Profile', icon: User },
  ];

  if (profile?.role === 'admin') {
    navItems.push({ href: '/dashboard/admin', label: 'Admin Panel', icon: ShieldAlert });
  }

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsMobileOpen(false)}
            className={cn(
              "flex items-center space-x-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
              isActive 
                ? "bg-primary-500/10 text-primary-400 border border-primary-500/20" 
                : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-[#0B0F17] text-white">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-white/10 bg-[#0B0F17] lg:flex">
        <div className="flex h-20 items-center px-8 border-b border-white/5">
          <Link href="/" className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
            <span className="bg-primary-500 text-white rounded-lg p-1.5 px-2">ER</span>
            <span>ErrandRun</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-2 p-4 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center space-x-3 rounded-xl px-4 py-3 text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header & Nav */}
      <div className="lg:hidden">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#0B0F17]/80 px-4 backdrop-blur-md">
          <Link href="/" className="text-lg font-bold text-white flex items-center space-x-2">
            <span className="bg-primary-500 text-white rounded-md p-1 px-1.5 text-xs">ER</span>
            <span>ErrandRun</span>
          </Link>
          <button 
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="rounded-lg p-2 text-white/70 hover:bg-white/10"
          >
            {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </header>
        
        {/* Mobile Menu Overlay */}
        {isMobileOpen && (
          <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)}>
            <div 
              className="absolute inset-y-0 left-0 w-3/4 max-w-sm bg-[#0B0F17] border-r border-white/10 p-4 shadow-2xl animate-slide-in-left flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <nav className="flex-1 space-y-2 mt-4">
                <NavLinks />
              </nav>
              <div className="pt-4 border-t border-white/5">
                <button 
                  onClick={handleLogout}
                  className="flex w-full items-center space-x-3 rounded-xl px-4 py-3 text-sm font-medium text-rose-400 hover:bg-rose-500/10"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="lg:pl-64">
        <div className="min-h-screen p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
