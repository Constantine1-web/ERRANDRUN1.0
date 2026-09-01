'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface RunnerGuardProps {
  children: React.ReactNode;
}

export function RunnerGuard({ children }: RunnerGuardProps) {
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      // Still loading auth state from layout.tsx
      return;
    }

    if (user.role !== 'runner') {
      router.replace('/dashboard/user');
      return;
    }

    setChecking(false);
  }, [user, router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950/90 px-4 py-10">
        <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-950/60 p-8 backdrop-blur-md shadow-2xl shadow-emerald-500/10">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-emerald-300" />
            <div>
              <h2 className="text-xl font-semibold text-white">Validating runner access</h2>
              <p className="mt-2 text-sm text-white/60">Please wait while we confirm your runner credentials.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
