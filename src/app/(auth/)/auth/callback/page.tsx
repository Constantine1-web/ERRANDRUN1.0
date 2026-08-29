'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        router.push('/login');
        return;
      }

      // Redirect to dashboard
      router.push('/dashboard/user');
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-dark-base flex items-center justify-center">
      <div className="text-center">
        <Loader className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
        <p className="text-white/60">Signing you in...</p>
      </div>
    </div>
  );
}
