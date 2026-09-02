'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';
import { Mail, Eye, EyeOff } from 'lucide-react';
import { RunnerLogo } from '@/components/RunnerLogo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';

function SignupForm() {
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get('role') as 'user' | 'runner') || 'user';
  const [userRole, setUserRole] = useState<'user' | 'runner'>(initialRole);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    studentId: '',
    phoneNumber: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.confirmPassword || !formData.fullName || !formData.studentId || !formData.phoneNumber) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    const formattedRegNo = formData.studentId.trim().toUpperCase();
    const uniuyoRegRegex = /^\d{2}\/([A-Z]{2,5}\/)+\d{3,4}$/;
    
    if (!uniuyoRegRegex.test(formattedRegNo)) {
      toast.error('Invalid Registration Number format. Expected: YY/DEPT/NUM (e.g. 21/ENG/012 or 21/MS/CO/123)');
      return;
    }

    try {
      setLoading(true);

      const { data: existingUser } = await supabase
        .from('profiles')
        .select('student_id')
        .eq('student_id', formattedRegNo)
        .maybeSingle();

      if (existingUser) {
        toast.error('This Registration Number is already registered to another account.');
        setLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`,
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: authData.user.id,
            full_name: formData.fullName,
            student_id: formattedRegNo,
            phone_number: formData.phoneNumber,
            role: userRole,
            verification_status: 'pending',
          },
        ]);

        if (profileError) throw profileError;

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
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="text-center p-6 shadow-md border-slate-200">
            <CardContent className="pt-6 pb-6">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                <Mail className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Confirm your email</h2>
              <p className="text-slate-600 mb-6 text-sm">
                We've sent a confirmation link to <strong className="text-slate-900">{formData.email}</strong>. Click it to activate your account.
              </p>
              <Link href="/login" className="block w-full">
                <Button className="w-full" variant="primary">
                  Back to Sign In
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-4 py-12 relative">
      <Link
        href="/"
        className="absolute top-6 left-6 text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5 text-sm font-medium"
      >
        ← Back to Home
      </Link>

      <motion.div
        className="max-w-md w-full"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-2">
            <RunnerLogo className="w-9 h-9" animate={false} />
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              Errand<span className="text-blue-600">Run</span>
            </span>
          </Link>
          <p className="text-sm text-slate-500">Create your campus account</p>
        </div>

        {/* Role Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-5 border border-slate-200">
          <button
            type="button"
            onClick={() => setUserRole('user')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              userRole === 'user' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Student Requester
          </button>
          <button
            type="button"
            onClick={() => setUserRole('runner')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              userRole === 'runner' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Campus Runner
          </button>
        </div>

        <Card className="shadow-md border-slate-200">
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  University Email
                </label>
                <Input
                  type="email"
                  placeholder="student@uniuyo.edu.ng"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={loading}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Reg Number
                  </label>
                  <Input
                    type="text"
                    placeholder="21/ENG/012"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    disabled={loading}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    placeholder="08012345678"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repeat password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full font-bold mt-2"
                isLoading={loading}
              >
                Create {userRole === 'runner' ? 'Runner' : 'Requester'} Account
              </Button>
            </form>

            <p className="text-center text-xs text-slate-500 mt-5">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}
