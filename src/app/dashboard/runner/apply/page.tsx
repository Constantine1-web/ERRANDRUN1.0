'use client';

import React, { useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function RunnerApplicationPage() {
  const { user } = useAppStore();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

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
    if (step === 2 && !selfiePhoto) return toast.error('Please take a selfie for verification');
    setStep(step + 1);
  };

  const handleSubmitApplication = async () => {
    setIsLoading(true);
    try {
      setTimeout(() => {
        toast.success('Application submitted for review!');
        setStep(4);
        setIsLoading(false);
      }, 1500);
    } catch {
      toast.error('Failed to submit application');
      setIsLoading(false);
    }
  };

  // ── STRIPPED: Awaiting redesign ──
  if (!user || user.verificationStatus !== 'verified') {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h2>Student Verification Required</h2>
        <button onClick={() => router.push('/dashboard/verify')}>Complete Student Verification</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Runner Verification</h1>
      
      {step === 1 && (
        <div>
          <h3>1. Upload Student ID</h3>
          <input ref={idInputRef} type="file" accept="image/*" onChange={handleIdUpload} />
          <p>{idPhoto ? idPhoto.name : 'No file selected'}</p>
          <button onClick={handleNextStep}>Continue to Face Match</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h3>2. Face Verification</h3>
          <input ref={selfieInputRef} type="file" accept="image/*" capture="user" onChange={handleSelfieUpload} />
          <p>{selfiePhoto ? 'Photo captured!' : 'Take selfie'}</p>
          <button onClick={() => setStep(1)}>Back</button>
          <button onClick={handleNextStep}>Continue</button>
        </div>
      )}

      {step === 3 && (
        <div>
          <h3>3. Submit Application</h3>
          <label>
            <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} />
            Code of Conduct Agreement
          </label>
          <button onClick={() => setStep(2)}>Back</button>
          <button onClick={handleSubmitApplication} disabled={isLoading || !agreedToTerms}>Submit Application</button>
        </div>
      )}

      {step === 4 && (
        <div>
          <h3>Application Under Review</h3>
          <button onClick={() => router.push('/dashboard/user')}>Return to Dashboard</button>
        </div>
      )}
    </div>
  );
}
