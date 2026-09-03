'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';

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
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <h2>Confirm your email</h2>
        <p>We sent a confirmation link to <strong>{formData.email}</strong></p>
        <Link href="/login">Back to Sign In</Link>
      </div>
    );
  }

  // ── STRIPPED: Awaiting redesign ──
  return (
    <div style={{ maxWidth: '400px', margin: '80px auto', padding: '20px' }}>
      <h1>Create Account</h1>
      <div style={{ display: 'flex', gap: '8px', margin: '16px 0' }}>
        <button onClick={() => setUserRole('user')} style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '6px', background: userRole === 'user' ? '#2563EB' : '#fff', color: userRole === 'user' ? '#fff' : '#333', cursor: 'pointer' }}>Requester</button>
        <button onClick={() => setUserRole('runner')} style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '6px', background: userRole === 'runner' ? '#2563EB' : '#fff', color: userRole === 'runner' ? '#fff' : '#333', cursor: 'pointer' }}>Runner</button>
      </div>
      <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input placeholder="Full Name" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
        <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
        <input placeholder="Reg Number (e.g. 21/ENG/012)" value={formData.studentId} onChange={(e) => setFormData({ ...formData, studentId: e.target.value })} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
        <input placeholder="Phone Number" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
        <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
        <input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm Password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
        <button type="submit" disabled={loading} style={{ padding: '10px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>
      <p style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ padding: '80px 20px', textAlign: 'center' }}>Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}
