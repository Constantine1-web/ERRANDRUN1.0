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
  const [otpSent, setOtpSent] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // New states for Step 4 & 5
  const [idPreviewUrl, setIdPreviewUrl] = useState<string | null>(null);
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      toast.error('Camera access denied or unavailable.');
    }
  };

  const captureFace = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 640, 480);
        const imageData = canvasRef.current.toDataURL('image/jpeg');
        setFaceImage(imageData);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  // Cleanup camera on unmount
  React.useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleSendOTP = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (phone.length < 10) return toast.error('Enter a valid phone number');
    
    setIsLoading(true);
    // Simulate API call for OTP
    setTimeout(() => {
      toast.success('Verification code sent! (Use 1234)');
      setOtpSent(true);
      setIsLoading(false);
    }, 1500);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== '1234') return toast.error('Invalid OTP code. Use 1234.');
    setStep(2);
  };

  const handleCompleteVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (studentId.length < 5) return toast.error('Enter a valid Student ID');
    
    setIsLoading(true);
    try {
      // In a real app, this updates Supabase. We simulate the store update.
      if (user) {
        // Set expiration for exactly 1 year (365 days) from now
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        setUser({
          ...user,
          phoneNumber: phone,
          studentId: studentId,
          verificationStatus: 'verified',
          verificationExpiresAt: oneYearFromNow.toISOString(),
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
          {[1, 2].map((i) => (
            <div 
              key={i}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step >= i ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'bg-dark-base text-white/40 border border-white/10'
              }`}
            >
              {i === 1 ? <Smartphone className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </div>
          ))}
        </div>

        {/* STEP 1: PHONE VERIFICATION */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-bold text-white mb-6 text-center">Verify Phone</h2>
            {!otpSent ? (
              <form onSubmit={handleSendOTP}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-white/70 mb-2">
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
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Code'}
                  {!isLoading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Enter 4-Digit Code
                  </label>
                  <p className="text-xs text-brand-yellow mb-4">Code sent to {phone} (Demo: 1234)</p>
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
                  Verify & Continue
                </button>
                <div className="mt-4 text-center">
                  <button 
                    type="button" 
                    onClick={handleSendOTP} 
                    disabled={isLoading}
                    className="text-xs text-white/50 hover:text-white font-medium transition-colors"
                  >
                    Didn't receive the code? <span className="text-brand-blue underline underline-offset-2">Send again</span>
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}

        {/* STEP 2: IDENTITY VERIFICATION */}
        {step === 2 && (
          <motion.form initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleCompleteVerification} className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-2 text-center">Student Identity</h2>
            <p className="text-xs text-white/50 text-center mb-6">Provide a document and a selfie. We will verify your status manually.</p>

            {/* Reg Number */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-brand-blue" />
                Registration / Matric Number
              </label>
              <input 
                type="text" 
                className="input font-mono uppercase" 
                placeholder="e.g. MAT/2023/123"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
              />
            </div>

            {/* Document Upload */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Official Document (ID Card, Course Form, etc.)
              </label>
              {!idPreviewUrl ? (
                <label className="border-2 border-dashed border-white/20 hover:border-brand-blue rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white/5">
                  <ShieldCheck className="w-8 h-8 text-white/40 mb-2" />
                  <span className="text-sm font-bold text-white mb-1">Upload Document</span>
                  <span className="text-xs text-white/40">From gallery or files (Max 5MB)</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setIdPreviewUrl(url);
                      }
                    }}
                  />
                </label>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-white/20">
                  <img src={idPreviewUrl} alt="Document Preview" className="w-full h-32 object-cover" />
                  <button 
                    type="button"
                    onClick={() => setIdPreviewUrl(null)}
                    className="absolute top-2 right-2 bg-black/60 backdrop-blur text-white text-xs px-3 py-1 rounded-full hover:bg-black/80"
                  >
                    Replace
                  </button>
                </div>
              )}
            </div>

            {/* Face Capture */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Live Selfie
              </label>
              <div className="w-full bg-black/50 rounded-xl overflow-hidden aspect-video relative flex items-center justify-center border border-white/10">
                {!isCameraActive && !faceImage ? (
                  <button type="button" onClick={startCamera} className="bg-brand-blue/20 text-brand-blue px-6 py-3 rounded-full font-bold hover:bg-brand-blue/30 transition-colors text-sm">
                    Open Camera
                  </button>
                ) : null}
                
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className={`w-full h-full object-cover ${faceImage ? 'hidden' : 'block'} ${!isCameraActive ? 'hidden' : ''}`} 
                />
                <canvas ref={canvasRef} width="640" height="480" className="hidden" />
                
                {faceImage && (
                  <img src={faceImage} alt="Captured Face" className="w-full h-full object-cover" />
                )}
                
                {isCameraActive && !faceImage && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-32 h-44 border-2 border-brand-green/70 rounded-[100%] animate-pulse" />
                  </div>
                )}

                {isCameraActive && !faceImage && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <button 
                      type="button"
                      onClick={captureFace}
                      className="bg-brand-green text-dark-base font-bold py-2 px-6 rounded-full shadow-lg shadow-brand-green/20 text-sm"
                    >
                      Snap Photo
                    </button>
                  </div>
                )}
              </div>
              
              {faceImage && (
                <div className="mt-2 text-right">
                  <button 
                    type="button"
                    onClick={() => { setFaceImage(null); startCamera(); }}
                    className="text-xs text-white/60 hover:text-white underline"
                  >
                    Retake Selfie
                  </button>
                </div>
              )}
            </div>

            <button 
              type="submit"
              disabled={isLoading || !faceImage || !idPreviewUrl || !studentId}
              className="btn-primary w-full flex justify-center items-center gap-2 bg-brand-green hover:bg-brand-green/80 disabled:opacity-50 mt-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" /> Submit for Verification
                </>
              )}
            </button>
          </motion.form>
        )}
      </div>
    </div>
  );
}
