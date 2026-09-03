'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  CheckCircle2,
  Phone,
  KeyRound,
  GraduationCap,
  Camera,
  ArrowRight,
  ArrowLeft,
  FileImage,
  RefreshCw,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function VerificationPage() {
  const { user, setUser } = useAppStore();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [studentId, setStudentId] = useState(user?.studentId || '');
  const [isLoading, setIsLoading] = useState(false);

  const [idPreviewUrl, setIdPreviewUrl] = useState<string | null>(null);
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch {
      toast.error('Camera access denied or unavailable on this device.');
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
        toast.success('Selfie captured!');
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      setIsCameraActive(false);
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleSendOTP = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (phone.length < 10) return toast.error('Enter a valid phone number (10+ digits)');

    setIsLoading(true);
    setTimeout(() => {
      toast.success('Verification code sent! (Use demo code: 1234)');
      setOtpSent(true);
      setIsLoading(false);
    }, 800);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== '1234') return toast.error('Invalid code. Use demo code 1234.');
    toast.success('Phone number verified!');
    setStep(2);
  };

  const handleIdFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIdPreviewUrl(URL.createObjectURL(file));
      toast.success('Student ID photo attached');
    }
  };

  const handleCompleteVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (studentId.trim().length < 5) return toast.error('Enter a valid University Matriculation / Reg number');

    setIsLoading(true);
    try {
      if (user) {
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        setUser({
          ...user,
          phoneNumber: phone,
          studentId: studentId.trim().toUpperCase(),
          verificationStatus: 'verified',
          verificationExpiresAt: oneYearFromNow.toISOString(),
        });
      }

      toast.success('Student Identity Verified Successfully!');
      setTimeout(() => {
        router.push('/dashboard/user');
      }, 1200);
    } catch {
      toast.error('Failed to verify profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (user?.verificationStatus === 'verified') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4 animate-fadeIn">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Student Profile Verified</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Your identity is verified. You have full requester and runner privileges on the campus network.
        </p>
        <Button onClick={() => router.push('/dashboard/user')} variant="primary" className="font-bold text-xs">
          Return to Hub
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-6 animate-fadeIn">

      {/* ── HEADER ── */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Campus Trust Verification
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          To protect students against impersonation and theft, all participants verify their campus phone and university matric number.
        </p>
      </div>

      {/* ── STEP TABS ── */}
      <div className="flex justify-between items-center bg-white p-2 rounded-2xl border border-slate-200 shadow-sm max-w-md mx-auto text-xs font-bold">
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
            step === 1 ? 'bg-blue-600 text-white shadow-sm' : 'text-emerald-700 bg-emerald-50'
          }`}
        >
          {step > 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>1.</span>}
          <span>Phone OTP</span>
        </div>
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
            step === 2 ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400'
          }`}
        >
          <span>2.</span>
          <span>Matric & Photo</span>
        </div>
      </div>

      {/* ── STEP 1: PHONE OTP VERIFICATION ── */}
      {step === 1 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Stage 1 of 2</span>
            <h2 className="text-lg font-bold text-slate-900">Verify Campus Phone Number</h2>
            <p className="text-xs text-slate-500">We send a fast SMS code to confirm your active contact line.</p>
          </div>

          {!otpSent ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600" /> Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 08123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full font-bold text-xs shadow-md"
              >
                Send SMS Code <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="space-y-1.5 text-center">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  Enter 4-Digit Code Sent to {phone}
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-40 h-14 mx-auto text-center font-mono text-3xl font-black tracking-[0.3em] rounded-2xl border-2 border-blue-500 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  Demo code: <strong className="text-blue-600">1234</strong>
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSendOTP}
                  disabled={isLoading}
                  className="text-xs font-semibold"
                >
                  Resend Code
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={otp.length !== 4}
                  className="flex-1 font-bold text-xs shadow-md"
                >
                  Verify Code & Continue <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── STEP 2: MATRIC & LIVE CAMERA CAPTURE ── */}
      {step === 2 && (
        <form onSubmit={handleCompleteVerification} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Stage 2 of 2</span>
            <h2 className="text-lg font-bold text-slate-900">Student Matric & Face Match</h2>
            <p className="text-xs text-slate-500">Provide your official university reg number and a face verification snap.</p>
          </div>

          {/* Student Reg Number Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
              University Matric / Reg Number
            </label>
            <input
              type="text"
              placeholder="e.g. 21/SC/CO/123"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-slate-300 font-mono text-sm uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Student ID Card Upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Student ID Card Photo
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 flex items-center gap-3 cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <FileImage className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {idPreviewUrl ? 'ID Photo Selected' : 'Click to attach Student ID Card'}
                </p>
                <p className="text-[10px] text-slate-400">Physical card or school portal screenshot</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleIdFileSelect}
              />
            </div>
          </div>

          {/* Webcam Live Capture Zone */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Live Selfie Verification</span>
              {faceImage && <span className="text-emerald-600 text-[10px]">✓ Selfie Captured</span>}
            </label>

            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-900 text-center p-4 relative min-h-[220px] flex flex-col items-center justify-center">
              {faceImage ? (
                <div className="space-y-3">
                  <img src={faceImage} alt="Captured face" className="w-36 h-36 rounded-full object-cover mx-auto border-4 border-emerald-500 shadow-md" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFaceImage(null);
                      startCamera();
                    }}
                    className="text-xs text-white border-white/30 hover:bg-white/10"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retake Photo
                  </Button>
                </div>
              ) : isCameraActive ? (
                <div className="space-y-3 w-full">
                  <video ref={videoRef} autoPlay playsInline className="w-full max-h-[200px] object-cover rounded-xl mx-auto" />
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={captureFace}
                    className="font-bold text-xs bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Camera className="w-4 h-4 mr-1.5" /> Snap Photo
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 py-4">
                  <Camera className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-300">Allow camera access to capture instant face match</p>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={startCamera}
                    className="font-bold text-xs"
                  >
                    Activate Camera
                  </Button>
                </div>
              )}
            </div>
            <canvas ref={canvasRef} width="640" height="480" className="hidden" />
          </div>

          <div className="flex gap-2 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(1)}
              className="font-semibold text-xs"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="flex-1 font-bold text-xs shadow-md bg-emerald-600 hover:bg-emerald-700"
            >
              Complete Student Verification
            </Button>
          </div>
        </form>
      )}

    </div>
  );
}
