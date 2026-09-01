'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, FileImage, ShieldCheck, CheckCircle, ArrowRight, Loader2, Info } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { RunnerLogo } from '@/components/RunnerLogo';

export default function RunnerApplicationPage() {
  const { user } = useAppStore();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Fallback refs if user prefers standard file picker
  const idInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIdPhoto(e.target.files[0]);
    }
  };

  const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelfiePhoto(e.target.files[0]);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && !idPhoto) return toast.error('Please upload your Student ID Card');
    if (step === 2 && !selfiePhoto) return toast.error('Please take a live selfie for verification');
    setStep(step + 1);
  };

  const handleSubmitApplication = async () => {
    setIsLoading(true);
    try {
      // Simulate API call to upload photos and create runner_app record
      // In reality: 
      // 1. Upload idPhoto to Supabase Storage
      // 2. Upload selfiePhoto to Supabase Storage
      // 3. Insert into `runner_apps` with `face_verification_url`
      
      setTimeout(() => {
        toast.success('Application submitted for review!');
        setStep(4);
        setIsLoading(false);
      }, 2000);
    } catch (error) {
      toast.error('Failed to submit application');
      setIsLoading(false);
    }
  };

  if (!user || user.verificationStatus !== 'verified') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6">
        <div className="w-20 h-20 bg-brand-yellow/20 text-brand-yellow rounded-full flex items-center justify-center mb-4">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Level 2 Required</h2>
        <p className="text-white/60 mb-8 max-w-md">
          You must complete basic profile verification (Phone & ID Number) before applying to become a runner.
        </p>
        <button onClick={() => router.push('/dashboard/verify')} className="btn-primary bg-brand-yellow text-dark-base hover:bg-yellow-500">
          Complete Basic Verification
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full p-4 md:py-12">
      <div className="text-center mb-10">
        <RunnerLogo className="w-16 h-16 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(56,189,248,0.3)]" animate={false} />
        <h1 className="heading-page text-white mb-2">Runner Verification</h1>
        <p className="text-white/60 text-sm max-w-md mx-auto">
          To protect our community, runners undergo strict KYC. We need to verify that your face matches your Student ID.
        </p>
      </div>

      <div className="glass-card p-6 md:p-8">
        
        {/* Step Indicator */}
        <div className="flex justify-between mb-10 relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/10 -z-10 -translate-y-1/2" />
          {['ID Card', 'Face Match', 'Submit'].map((label, index) => {
            const i = index + 1;
            const isActive = step === i;
            const isCompleted = step > i;
            return (
              <div key={i} className="flex flex-col items-center gap-2">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    isActive ? 'bg-brand-blue text-white ring-4 ring-brand-blue/20' : 
                    isCompleted ? 'bg-brand-green text-white' : 
                    'bg-dark-base text-white/40 border border-white/10'
                  }`}
                >
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : i}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive || isCompleted ? 'text-white' : 'text-white/40'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step 1: ID Card Upload */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h3 className="text-xl font-bold text-white mb-4">1. Upload Student ID</h3>
            <p className="text-sm text-white/60 mb-6">Please upload a clear photo of your official University Student ID card.</p>
            
            <div 
              onClick={() => idInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-brand-blue hover:bg-brand-blue/5 transition-all group"
            >
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileImage className="w-8 h-8 text-brand-blue" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white mb-1">
                  {idPhoto ? idPhoto.name : 'Tap to upload ID photo'}
                </p>
                <p className="text-xs text-white/40">JPEG, PNG up to 5MB</p>
              </div>
              <input 
                ref={idInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleIdUpload}
              />
            </div>

            <button onClick={handleNextStep} className="btn-primary w-full mt-8 flex justify-center items-center gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Step 2: Live Selfie / Face Verification */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h3 className="text-xl font-bold text-white mb-4">2. Face Verification</h3>
            
            <div className="bg-brand-blue/10 border border-brand-blue/20 rounded-xl p-4 mb-6 flex items-start gap-3">
              <Info className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
              <p className="text-xs text-brand-blue leading-relaxed">
                Take a selfie holding your face clearly in the frame. Our admin team will verify that this matches the face on your Student ID card to prevent identity fraud.
              </p>
            </div>

            <div 
              onClick={() => selfieInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-brand-green hover:bg-brand-green/5 transition-all group"
            >
              <div className="w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center group-hover:scale-110 transition-transform relative overflow-hidden">
                {selfiePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={URL.createObjectURL(selfiePhoto)} alt="Selfie preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-brand-green" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white mb-1">
                  {selfiePhoto ? 'Photo captured! Tap to retake' : 'Open Camera to take a selfie'}
                </p>
                <p className="text-xs text-white/40">Please ensure good lighting</p>
              </div>
              {/* `capture="user"` asks mobile devices to use the front camera! */}
              <input 
                ref={selfieInputRef}
                type="file" 
                accept="image/*" 
                capture="user"
                className="hidden" 
                onChange={handleSelfieUpload}
              />
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
              <button onClick={handleNextStep} className="btn-primary flex-1 flex justify-center items-center gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h3 className="text-xl font-bold text-white mb-6">3. Submit Application</h3>
            
            <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl mb-6">
              <input 
                type="checkbox" 
                id="agree_rules" 
                required 
                className="mt-1 bg-dark-base border-rose-500/50 rounded"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
              />
              <label htmlFor="agree_rules" className="text-xs text-rose-200 leading-relaxed">
                <strong>CRITICAL ACKNOWLEDGEMENT:</strong> I understand that stealing, intentionally abandoning packages, or defrauding students will result in an immediate report to the University Disciplinary Committee, potentially leading to expulsion and permanent platform ban.
              </label>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <FileImage className="w-5 h-5 text-brand-blue" />
                  <div>
                    <p className="text-sm font-bold text-white">Student ID Card</p>
                    <p className="text-xs text-brand-green flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Uploaded</p>
                  </div>
                </div>
                <button onClick={() => setStep(1)} className="text-xs font-bold text-brand-blue hover:underline">Edit</button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <Camera className="w-5 h-5 text-brand-green" />
                  <div>
                    <p className="text-sm font-bold text-white">Face Match Selfie</p>
                    <p className="text-xs text-brand-green flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Captured</p>
                  </div>
                </div>
                <button onClick={() => setStep(2)} className="text-xs font-bold text-brand-blue hover:underline">Edit</button>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
              <button 
                onClick={handleSubmitApplication} 
                className="btn-primary flex-1 flex justify-center items-center gap-2 bg-brand-green hover:bg-brand-green/80 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || !agreedToTerms}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Application'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
            <div className="w-20 h-20 bg-brand-green/20 text-brand-green rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Under Review</h3>
            <p className="text-sm text-white/60 mb-8 max-w-sm mx-auto">
              Your application and KYC documents have been securely submitted. Our team will verify your face matches your ID within 24 hours.
            </p>
            <button onClick={() => router.push('/dashboard/user')} className="btn-primary w-full">
              Return to Dashboard
            </button>
          </motion.div>
        )}

      </div>
    </div>
  );
}
