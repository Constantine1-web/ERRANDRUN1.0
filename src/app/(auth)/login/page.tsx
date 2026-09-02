'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';
import { Mail, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success('Signed in successfully');
      window.location.href = '/dashboard/user';
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Check your email for the magic link!');
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Google sign in error:', error);
      toast.error('Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-dark-base flex items-center justify-center px-4 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-500/20 blur-[120px] rounded-full pointer-events-none" />
        
        <motion.div
          className="max-w-md w-full z-10"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="text-center border-white/10 shadow-2xl shadow-black/50">
            <CardHeader className="pt-8 pb-4">
              <div className="w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary-500/20">
                <Mail className="w-8 h-8 text-primary-400" />
              </div>
              <CardTitle className="text-2xl">Check your email</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/60 mb-6">
                We've sent a magic link to <strong className="text-white">{email}</strong>. Click it to sign in.
              </p>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setSubmitted(false)}
              >
                Try another email
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-base flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient background glow for Mission Control aesthetic */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-900/20 blur-[150px] rounded-full pointer-events-none" />

      {/* Back to home */}
      <Link
        href="/"
        className="absolute top-6 left-6 text-white/60 hover:text-white transition-colors z-10 flex items-center gap-2 text-sm font-medium"
      >
        ← Back
      </Link>

      <motion.div
        className="max-w-md w-full z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-white/10 shadow-2xl shadow-black/50">
          <CardHeader className="text-center pb-2 pt-8">
            <CardTitle className="text-3xl font-bold mb-2">Welcome back</CardTitle>
            <p className="text-white/60">Sign in to access your ErrandRun account</p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handlePasswordLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/80">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@university.edu"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/80">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  isLoading={loading}
                >
                  Sign In
                </Button>
                
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={handleMagicLink}
                  isLoading={loading}
                >
                  Send Magic Link Instead
                </Button>
              </div>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/40 uppercase font-medium tracking-wider">Or continue with</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Google OAuth */}
            <Button
              type="button"
              variant="glass"
              className="w-full gap-3"
              onClick={handleGoogleLogin}
              isLoading={loading}
            >
              {!loading && (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              Sign in with Google
            </Button>
          </CardContent>

          <CardFooter className="justify-center border-t border-white/5 pt-6 pb-6 mt-2">
            <p className="text-white/60 text-sm">
              Don't have an account?{' '}
              <Link href="/signup" className="text-primary-400 hover:text-primary-300 transition-colors font-medium">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
