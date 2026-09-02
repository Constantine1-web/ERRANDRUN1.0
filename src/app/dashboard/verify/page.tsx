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

export default function VerificationPage() {
  const { user, setUser } = useAppStore();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    } catch {
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

  React.useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleSendOTP = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (phone.length < 10) return toast.error('Enter a valid phone number');
    
    setIsLoading(true);
    setTimeout(() => {
      toast.success('Verification code sent! (Use 1234)');
      setOtpSent(true);
      setIsLoading(false);
    }, 1000);
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
      if (user) {
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
    } catch {
      toast.error('Failed to verify profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (user?.verificationStatus === 'verified') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Profile Already Verified</h2>
        <p className="text-slate-500 mb-6 max-w-md text-xs">
          Your student profile is active. You have full access to post and accept campus errands.
        </p>
        <Button onClick={() => router.push('/dashboard/user')} size="md" variant="primary" className="font-bold">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 md:py-12 space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Student Identity Verification</h1>
        <p className="text-slate-500 text-xs max-w-md mx-auto">
          Verify your student identity to ensure trust and accountability across the campus network.
        </p>
      </div>

      <Card className="shadow-md">
        <CardContent className="p-6 sm:p-8">
          {/* Step Indicator */}
          <div className="flex justify-between mb-8 relative px-4">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -z-10 -translate-y-1/2" />
            {[1, 2].map((i) => (
              <div 
                key={i}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all bg-white ${
                  step >= i ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-100' : 'text-slate-400 border border-slate-300'
                }`}
              >
                {i === 1 ? <Smartphone className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              </div>
            ))}
          </div>

          {/* STEP 1: PHONE VERIFICATION */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 text-center mb-4">Step 1: Phone Verification</h2>
              {!otpSent ? (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Phone Number
                    </label>
                    <Input 
                      type="tel" 
                      placeholder="08012345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full font-bold" disabled={isLoading} size="lg">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Verification Code'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Enter 4-Digit SMS Code
                    </label>
                    <p className="text-xs text-amber-700 font-medium mb-3">Code sent to {phone} (Demo code: <strong>1234</strong>)</p>
                    <Input 
                      type="text" 
                      className="text-center text-2xl tracking-[0.4em] font-mono py-3" 
                      placeholder="0000"
                      maxLength={4}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full font-bold" size="lg">
                    Verify & Continue <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                  <div className="text-center mt-3">
                    <button 
                      type="button" 
                      onClick={handleSendOTP} 
                      disabled={isLoading}
                      className="text-xs text-slate-500 hover:text-blue-600 transition-colors"
                    >
                      Didn't get code? <span className="underline font-semibold">Resend</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          )}

          {/* STEP 2: IDENTITY VERIFICATION */}
          {step === 2 && (
            <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleCompleteVerification} className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900 text-center mb-1">Step 2: Student Identity</h2>
                <p className="text-xs text-slate-500 text-center mb-4">Provide matriculation details and upload ID proof.</p>
              </div>

              {/* Reg Number */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  Registration Number
                </label>
                <Input 
                  type="text" 
                  className="font-mono uppercase" 
                  placeholder="21/ENG/012"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                />
              </div>

              {/* Document Upload */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Student ID Card Photo
                </label>
                {!idPreviewUrl ? (
                  <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50 hover:bg-blue-50/20">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-2 text-blue-600">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Upload ID Card Photo</span>
                    <span className="text-[10px] text-slate-400">JPEG or PNG up to 5MB</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
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
                  <div className="relative rounded-xl overflow-hidden border border-slate-200">
                    <img src={idPreviewUrl} alt="Document Preview" className="w-full h-40 object-cover" />
                    <div className="p-2 bg-slate-50 text-right">
                      <Button 
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIdPreviewUrl(null)}
                        className="text-xs text-rose-600 hover:text-rose-700"
                      >
                        Replace Image
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Face Capture */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Live Selfie
                </label>
                <div className="w-full bg-slate-100 rounded-xl overflow-hidden aspect-[4/3] relative flex items-center justify-center border border-slate-300">
                  {!isCameraActive && !faceImage ? (
                    <Button type="button" onClick={startCamera} variant="outline" size="sm" className="gap-1.5 text-xs font-bold">
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
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                      <Button 
                        type="button"
                        onClick={captureFace}
                        variant="primary"
                        className="rounded-full px-6 text-xs font-bold"
                      >
                        Capture Photo
                      </Button>
                    </div>
                  )}
                </div>
                
                {faceImage && (
                  <div className="flex justify-end pt-1">
                    <button 
                      type="button" 
                      onClick={() => { setFaceImage(null); startCamera(); }}
                      className="text-xs text-blue-600 font-semibold"
                    >
                      Retake Selfie
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Button 
                  type="submit"
                  disabled={isLoading || !faceImage || !idPreviewUrl || !studentId}
                  variant="primary"
                  className="w-full font-bold"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Verifying...
                    </>
                  ) : (
                    'Submit Verification'
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
