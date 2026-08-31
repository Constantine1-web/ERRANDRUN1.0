'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Smartphone, GraduationCap, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function VerificationPage() {
  const { user, setUser } = useAppStore();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [studentId, setStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) return toast.error('Enter a valid phone number');
    
    setIsLoading(true);
    // Simulate API call for OTP
    setTimeout(() => {
      toast.success('Verification code sent! (Use 1234)');
      setStep(2);
      setIsLoading(false);
    }, 1500);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== '1234') return toast.error('Invalid OTP code. Use 1234.');
    setStep(3);
  };

  const handleCompleteVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (studentId.length < 5) return toast.error('Enter a valid Student ID');
    
    setIsLoading(true);
    try {
      // In a real app, this updates Supabase. We simulate the store update.
      if (user) {
        setUser({
          ...user,
          phoneNumber: phone,
          studentId: studentId,
          verificationStatus: 'verified',
        });
      }
      
      toast.success('Profile Verified Successfully!');
      setTimeout(() => {
        router.push('/dashboard/user');
      }, 1000);
    } catch (error) {
      toast.error('Failed to verify profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (user?.verificationStatus === 'verified') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6">
        <div className="w-20 h-20 bg-brand-green/20 text-brand-green rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Profile Verified</h2>
        <p className="text-white/60 mb-8 max-w-md">
          Your student profile is fully verified. You can now post errands and fund your wallet!
        </p>
        <button onClick={() => router.push('/dashboard/user')} className="btn-primary">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto w-full p-4 md:py-12">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-brand-blue/10 text-brand-blue rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="heading-page text-white mb-2">Verify Profile</h1>
        <p className="text-white/60 text-sm">
          To ensure community safety, you must verify your identity before posting errands.
        </p>
      </div>

      <div className="glass-card p-6">
        {/* Step Indicator */}
        <div className="flex justify-between mb-8 relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/10 -z-10 -translate-y-1/2" />
          {[1, 2, 3].map((i) => (
            <div 
              key={i}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step >= i ? 'bg-brand-blue text-white' : 'bg-dark-base text-white/40 border border-white/10'
              }`}
            >
              {i}
            </div>
          ))}
        </div>

        {/* Step 1: Phone */}
        {step === 1 && (
          <motion.form initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleSendOTP}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-brand-blue" />
                Phone Number
              </label>
              <input 
                type="tel" 
                className="input" 
                placeholder="+234 800 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className="btn-primary w-full flex justify-center items-center gap-2" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Verification Code'}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </motion.form>
        )}

        {/* Step 2: OTP */}
        {step === 2 && (
          <motion.form initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleVerifyOTP}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-white/70 mb-2">
                Enter 4-Digit Code
              </label>
              <p className="text-xs text-brand-yellow mb-4">A code has been sent to {phone}. (Use 1234 for demo)</p>
              <input 
                type="text" 
                className="input text-center text-2xl tracking-widest font-mono" 
                placeholder="0000"
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className="btn-primary w-full flex justify-center items-center gap-2">
              Verify Code
            </button>
          </motion.form>
        )}

        {/* Step 3: Student ID */}
        {step === 3 && (
          <motion.form initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleCompleteVerification}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-brand-blue" />
                Student Registration Number
              </label>
              <p className="text-xs text-white/50 mb-4">We use this to verify your active student status.</p>
              <input 
                type="text" 
                className="input font-mono uppercase" 
                placeholder="e.g. MAT/2023/123"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className="btn-primary w-full flex justify-center items-center gap-2 bg-brand-green hover:bg-brand-green/80" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Verification'}
              {!isLoading && <CheckCircle className="w-4 h-4" />}
            </button>
          </motion.form>
        )}
      </div>
    </div>
  );
}
