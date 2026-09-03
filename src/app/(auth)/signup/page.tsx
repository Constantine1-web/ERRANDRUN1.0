'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';
import {
  User,
  Mail,
  Lock,
  Phone,
  GraduationCap,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Compass,
  Radio
} from 'lucide-react';
import { RunnerLogo } from '@/components/RunnerLogo';
import { Button } from '@/components/ui/Button';

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
        toast.success('Account registered! Check email to activate.');
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
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 border border-slate-200 text-center space-y-4 shadow-sm animate-scaleIn">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Check Your Email</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            We've dispatched a confirmation link to <strong className="text-slate-800">{formData.email}</strong>. Click it to activate your campus profile.
          </p>
          <Link
            href="/login"
            className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2">
          <RunnerLogo className="w-8 h-8 text-blue-600" animate={false} />
          <span className="font-black text-slate-900 text-xl tracking-tight">ERRANDRUN</span>
        </Link>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create Campus Account</h1>
        <p className="text-xs text-slate-500">Join verified students delegating and running errands.</p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-5">
          
          {/* Role Switcher */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Primary Role</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setUserRole('user')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  userRole === 'user' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-blue-600" />
                Requester
              </button>
              <button
                type="button"
                onClick={() => setUserRole('runner')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  userRole === 'runner' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-emerald-600" />
                Campus Runner
              </button>
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Full Legal Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Emmanuel Okon"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Student Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="e.g. emmanuel@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Matric / Reg Number</label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. 21/ENG/012 or 21/MS/CO/123"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 font-mono text-xs uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="e.g. 08123456789"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full h-11 px-3 pr-8 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Confirm</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full h-11 px-3 pr-8 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full font-bold text-xs shadow-md mt-2"
            >
              Create Account <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          <p className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            Already registered?{' '}
            <Link href="/login" className="text-blue-600 font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Loading registration…</div>}>
      <SignupForm />
    </Suspense>
  );
}
