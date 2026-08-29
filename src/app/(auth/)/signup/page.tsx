'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';
import { Mail, Loader } from 'lucide-react';

function SignupForm() {
  const searchParams = useSearchParams();
  const userRole = (searchParams.get('role') as 'user' | 'runner') || 'user';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    studentId: '',
    phoneNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.fullName || !formData.studentId || !formData.phoneNumber) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: authData.user.id,
            full_name: formData.fullName,
            student_id: formData.studentId,
            phone_number: formData.phoneNumber,
            role: userRole,
            verification_status: 'pending',
          },
        ]);

        if (profileError) throw profileError;

        // Create wallet for new user
        const { error: walletError } = await supabase.from('wallets').insert([
          {
            user_id: authData.user.id,
            balance: 0,
            total_earned: 0,
            total_spent: 0,
          },
        ]);

        if (walletError) throw walletError;

        setSubmitted(true);
        toast.success('Account created! Check your email to confirm.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-dark-base flex items-center justify-center px-4">
        <motion.div
          className="glass-card rounded-3xl p-8 max-w-md w-full text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Confirm your email</h2>
          <p className="text-white/60 mb-6">
            We've sent a confirmation link to <strong>{formData.email}</strong>. Click it to activate your account.
          </p>
          <Link href="/login" className="btn-primary w-full">
            Back to Sign In
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-base flex flex-col items-center justify-center px-4">
      {/* Back button */}
      <Link href="/" className="absolute top-6 left-6 text-white/60 hover:text-white transition-colors">
        ← Back
      </Link>

      <motion.div
        className="glass-card rounded-3xl p-8 max-w-md w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">Join ErrandRun</h1>
        <p className="text-white/60 mb-8">
          Sign up as a {userRole === 'runner' ? 'runner' : 'student'} to get started
        </p>

        <form onSubmit={handleSignup} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Full Name</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="John Doe"
              className="input-field"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@university.edu"
              className="input-field"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="input-field"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Student ID</label>
            <input
              type="text"
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              placeholder="UI/2023/001234"
              className="input-field"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Phone Number</label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="+234 800 000 0000"
              className="input-field"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 mt-6"
          >
            {loading && <Loader className="w-4 h-4 animate-spin" />}
            Create Account
          </button>
        </form>

        {/* Already have account */}
        <p className="text-center text-white/60 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-400 hover:text-primary-300 transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-dark-base flex items-center justify-center">
        <Loader className="w-12 h-12 text-white animate-spin" />
      </div>
    }>
      <SignupForm />
    </React.Suspense>
  );
}
