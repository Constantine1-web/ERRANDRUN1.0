'use client';

import React, { useState } from 'react';
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

  // ── STRIPPED: Awaiting redesign ──
  if (user?.verificationStatus === 'verified') {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h2>Profile Already Verified</h2>
        <button onClick={() => router.push('/dashboard/user')}>Return to Dashboard</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Student Identity Verification</h1>
      
      {step === 1 && (
        <div>
          <h2>Step 1: Phone Verification</h2>
          {!otpSent ? (
            <form onSubmit={handleSendOTP}>
              <label>Phone Number:</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              <button type="submit" disabled={isLoading}>Send Verification Code</button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <label>Enter 4-Digit SMS Code:</label>
              <input type="text" maxLength={4} value={otp} onChange={(e) => setOtp(e.target.value)} />
              <button type="submit">Verify & Continue</button>
              <button type="button" onClick={handleSendOTP} disabled={isLoading}>Resend</button>
            </form>
          )}
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleCompleteVerification}>
          <h2>Step 2: Student Identity</h2>
          
          <div>
            <label>Registration Number:</label>
            <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} required />
          </div>

          <div>
            <label>Student ID Card Photo:</label>
            <input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setIdPreviewUrl(URL.createObjectURL(file));
            }} />
            {idPreviewUrl && (
              <div>
                <img src={idPreviewUrl} alt="Document Preview" style={{ width: '200px' }} />
                <button type="button" onClick={() => setIdPreviewUrl(null)}>Replace Image</button>
              </div>
            )}
          </div>

          <div>
            <label>Live Selfie:</label>
            {!isCameraActive && !faceImage && (
              <button type="button" onClick={startCamera}>Open Camera</button>
            )}
            <video ref={videoRef} autoPlay playsInline muted style={{ display: isCameraActive && !faceImage ? 'block' : 'none', width: '200px' }} />
            <canvas ref={canvasRef} width="640" height="480" style={{ display: 'none' }} />
            {faceImage && <img src={faceImage} alt="Captured Face" style={{ width: '200px' }} />}
            {isCameraActive && !faceImage && <button type="button" onClick={captureFace}>Capture Photo</button>}
            {faceImage && <button type="button" onClick={() => { setFaceImage(null); startCamera(); }}>Retake Selfie</button>}
          </div>

          <button type="submit" disabled={isLoading || !faceImage || !idPreviewUrl || !studentId}>
            Submit Verification
          </button>
        </form>
      )}
    </div>
  );
}
