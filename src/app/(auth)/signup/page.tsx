'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';
import { Mail, Loader, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

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
    // Supports 21/ENG/012 or 21/MS/CO/1234
    const uniuyoRegRegex = /^\d{2}\/([A-Z]{2,5}\/)+\d{3,4}$/;
    
    if (!uniuyoRegRegex.test(formattedRegNo)) {
      toast.error('Invalid Registration Number format. Expected: YY/DEPT/NUM (e.g. 21/ENG/012 or 21/MS/CO/123)');
      return;
    }

    try {
      setLoading(true);

      // Check for duplicate Registration Number first
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

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`,
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile
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
      <div className="min-h-screen bg-dark-base flex items-center justify-center px-4 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md z-10"
        >
          <Card className="text-center">
            <CardContent className="pt-8 pb-8">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Confirm your email</h2>
              <p className="text-white/60 mb-8">
                We've sent a confirmation link to <strong className="text-white">{formData.email}</strong>. Click it to activate your account.
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
    <div className="min-h-screen bg-dark-base flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      {/* Back button */}
      <Link href="/" className="absolute top-6 left-6 text-white/60 hover:text-white transition-colors z-10 flex items-center gap-2 text-sm font-medium">
        &larr; Back
      </Link>

      <motion.div
        className="w-full max-w-md z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-white/10 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-3xl font-bold text-white mb-2">Join ErrandRun</CardTitle>
            <p className="text-white/60">
              Sign up to get started on campus
            </p>
          </CardHeader>
          <CardContent>
            {/* Role Selector Tabs */}
            <div className="flex bg-white/5 p-1 rounded-xl mb-8 border border-white/5">
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  userRole === 'user' 
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                onClick={() => setUserRole('user')}
              >
                Student
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  userRole === 'runner' 
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                onClick={() => setUserRole('runner')}
              >
                Runner
              </button>
            </div>

            <form onSubmit={handleSignup} className="space-y-5 mb-6">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-white/80">Full Name</label>
                <Input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Doe"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-white/80">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@university.edu"
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-white/80">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      disabled={loading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-white/80">Confirm Password</label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      disabled={loading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors focus:outline-none"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-white/80">Student ID</label>
                  <Input
                    type="text"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    placeholder="UNIUYO/2023/001"
                    className="font-mono text-sm"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-white/80">Phone Number</label>
                  <Input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="+234 800 0000"
                    className="font-mono text-sm"
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-6"
                isLoading={loading}
              >
                Create Account
              </Button>
            </form>

            {/* Already have account */}
            <p className="text-center text-white/60 text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-primary-400 hover:text-primary-300 transition-colors font-medium">
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
    <React.Suspense fallback={
      <div className="min-h-screen bg-dark-base flex items-center justify-center">
        <Loader className="w-12 h-12 text-primary-500 animate-spin" />
      </div>
    }>
      <SignupForm />
    </React.Suspense>
  );
}
