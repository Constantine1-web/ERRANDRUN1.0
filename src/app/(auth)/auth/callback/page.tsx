'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        if (error) {
          setErrorMsg(errorDescription || error);
          toast.error(errorDescription || error);
          setTimeout(() => router.push('/login'), 3000);
          return;
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
             console.error('Exchange error:', exchangeError);
             throw exchangeError;
          }
        }

        // Wait a small bit for session to populate locally if using hash fragment
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !data.session) {
          toast.error('Session not found or expired. Please try again.');
          router.push('/login');
          return;
        }

        toast.success('Successfully signed in!');
        router.push('/dashboard/user');
      } catch (err: any) {
        console.error('Callback error:', err);
        setErrorMsg(err.message || 'An error occurred during sign in');
        toast.error('Sign in failed. Please try again.');
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-dark-base flex items-center justify-center">
      <div className="text-center p-8 bg-white/5 border border-white/10 rounded-2xl max-w-sm w-full mx-4">
        {errorMsg ? (
          <div>
            <div className="text-rose-400 text-4xl mb-4">?</div>
            <p className="text-white font-medium mb-2">Sign in failed</p>
            <p className="text-white/60 text-sm mb-6">{errorMsg}</p>
            <button onClick={() => router.push('/login')} className="btn-secondary w-full">Back to Login</button>
          </div>
        ) : (
          <div>
            <Loader className="w-12 h-12 text-primary-400 animate-spin mx-auto mb-4" />
            <p className="text-white font-medium">Authenticating...</p>
            <p className="text-white/60 text-sm mt-2">Please wait while we securely sign you in.</p>
          </div>
        )}
      </div>
    </div>
  );
}
