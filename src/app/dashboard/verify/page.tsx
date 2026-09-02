'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Smartphone, GraduationCap, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Timeline } from '@/components/ui/Timeline';

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
        <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/20">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-black text-white mb-4">Profile Verified</h2>
        <p className="text-white/60 mb-8 max-w-md text-lg">
          Your student profile is fully verified. You can now post errands and fund your wallet!
        </p>
        <Button onClick={() => router.push('/dashboard/user')} size="lg">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto w-full p-4 md:py-12 space-y-8">
      <div className="text-center">
        <div className="w-20 h-20 bg-brand-blue/10 text-brand-blue rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-blue/10">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Verify Profile</h1>
        <p className="text-white/60 text-lg max-w-md mx-auto">
          To ensure community safety, you must verify your identity before posting errands.
        </p>
      </div>

      <Card>
        <CardContent className="p-8">
          {/* Step Indicator */}
          <div className="flex justify-between mb-12 relative px-4">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/10 -z-10 -translate-y-1/2" />
            {[1, 2].map((i) => (
              <div 
                key={i}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  step >= i ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/30 scale-110' : 'bg-dark-base text-white/40 border-2 border-white/10'
                }`}
              >
                {i === 1 ? <Smartphone className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
            ))}
          </div>

          {/* STEP 1: PHONE VERIFICATION */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <h2 className="text-2xl font-bold text-white text-center mb-8">Verify Phone Number</h2>
              {!otpSent ? (
                <form onSubmit={handleSendOTP} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Phone Number
                    </label>
                    <Input 
                      type="tel" 
                      placeholder="+234 800 000 0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full flex justify-center items-center gap-2" disabled={isLoading} size="lg">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Verification Code'}
                    {!isLoading && <ArrowRight className="w-4 h-4" />}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Enter 4-Digit Code
                    </label>
                    <p className="text-sm text-brand-yellow mb-4">Code sent to {phone} (Demo: 1234)</p>
                    <Input 
                      type="text" 
                      className="text-center text-3xl tracking-[1em] font-mono py-6" 
                      placeholder="0000"
                      maxLength={4}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full flex justify-center items-center gap-2" size="lg">
                    Verify & Continue
                  </Button>
                  <div className="text-center mt-6">
                    <button 
                      type="button" 
                      onClick={handleSendOTP} 
                      disabled={isLoading}
                      className="text-sm text-white/50 hover:text-white font-medium transition-colors"
                    >
                      Didn't receive the code? <span className="text-brand-blue underline underline-offset-4">Send again</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          )}

          {/* STEP 2: IDENTITY VERIFICATION */}
          {step === 2 && (
            <motion.form initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleCompleteVerification} className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white text-center mb-2">Student Identity</h2>
                <p className="text-sm text-white/50 text-center mb-8">Provide a document and a selfie. We will verify your status manually.</p>
              </div>

              {/* Reg Number */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-brand-blue" />
                  Registration / Matric Number
                </label>
                <Input 
                  type="text" 
                  className="font-mono uppercase" 
                  placeholder="e.g. MAT/2023/123"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                />
              </div>

              {/* Document Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70">
                  Official Document (ID Card, Course Form, etc.)
                </label>
                {!idPreviewUrl ? (
                  <label className="border-2 border-dashed border-white/20 hover:border-brand-blue rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-white/5 hover:bg-white/10 group">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-brand-blue/10 group-hover:text-brand-blue transition-colors text-white/40">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <span className="text-lg font-bold text-white mb-2">Upload Document</span>
                    <span className="text-sm text-white/40">From gallery or files (Max 5MB)</span>
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
                  <div className="relative rounded-xl overflow-hidden border-2 border-white/20 group">
                    <img src={idPreviewUrl} alt="Document Preview" className="w-full h-48 object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button 
                        type="button"
                        variant="secondary"
                        onClick={() => setIdPreviewUrl(null)}
                      >
                        Replace Document
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Face Capture */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70">
                  Live Selfie
                </label>
                <div className="w-full bg-black/50 rounded-xl overflow-hidden aspect-[4/3] relative flex items-center justify-center border-2 border-white/10">
                  {!isCameraActive && !faceImage ? (
                    <Button type="button" onClick={startCamera} variant="outline" className="gap-2">
                      <Smartphone className="w-4 h-4" />
                      Open Camera
                    </Button>
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
                      <div className="w-48 h-64 border-4 border-green-500/70 rounded-[100%] animate-pulse" />
                    </div>
                  )}

                  {isCameraActive && !faceImage && (
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                      <Button 
                        type="button"
                        onClick={captureFace}
                        className="bg-green-500 hover:bg-green-600 text-white rounded-full px-8 py-6 shadow-lg shadow-green-500/20 text-lg"
                      >
                        Snap Photo
                      </Button>
                    </div>
                  )}
                </div>
                
                {faceImage && (
                  <div className="flex justify-end pt-2">
                    <button 
                      type="button"
                      onClick={() => { setFaceImage(null); startCamera(); }}
                      className="text-sm text-brand-blue hover:text-brand-blue/80 font-medium transition-colors"
                    >
                      Retake Selfie
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-white/10">
                <Button 
                  type="submit"
                  disabled={isLoading || !faceImage || !idPreviewUrl || !studentId}
                  className="w-full flex justify-center items-center gap-2 bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" /> Submit for Verification
                    </>
                  )}
                </Button>
              </div>
            </motion.form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
