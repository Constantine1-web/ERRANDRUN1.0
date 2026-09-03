'use client';

import React, { useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  CheckCircle2,
  FileImage,
  Camera,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  Lock,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

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
    if (step === 1 && !idPhoto) return toast.error('Please upload your Student ID Card photo');
    if (step === 2 && !selfiePhoto) return toast.error('Please take a clear selfie for face verification');
    setStep(step + 1);
  };

  const handleSubmitApplication = async () => {
    setIsLoading(true);
    try {
      setTimeout(() => {
        toast.success('Runner application submitted for admin review!');
        setStep(4);
        setIsLoading(false);
      }, 1500);
    } catch {
      toast.error('Failed to submit application');
      setIsLoading(false);
    }
  };

  if (!user || user.verificationStatus !== 'verified') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4 animate-fadeIn">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Student Verification Required</h2>
        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
          Before applying to run errands and earn money on the campus network, you must complete your primary student profile verification.
        </p>
        <Button
          onClick={() => router.push('/dashboard/verify')}
          variant="primary"
          size="lg"
          className="font-bold text-xs"
        >
          Verify Student ID First <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-6 animate-fadeIn">

      {/* ── HEADER ── */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Runner Fleet Onboarding
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          We verify every runner's student matriculation and live selfie to maintain trust, accountability, and safety across campus.
        </p>
      </div>

      {/* ── STEP INDICATOR ── */}
      <div className="flex justify-between items-center bg-white p-2 rounded-2xl border border-slate-200 shadow-sm max-w-md mx-auto text-xs font-bold">
        {[
          { num: 1, label: 'Student ID' },
          { num: 2, label: 'Face Match' },
          { num: 3, label: 'Honor Code' },
        ].map((s) => (
          <div
            key={s.num}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              step === s.num
                ? 'bg-blue-600 text-white shadow-sm'
                : step > s.num
                ? 'text-emerald-700 bg-emerald-50'
                : 'text-slate-400'
            }`}
          >
            {step > s.num ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{s.num}.</span>}
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── STEP 1: STUDENT ID PHOTO ── */}
      {step === 1 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5 animate-fadeIn">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Step 1 of 3</span>
            <h3 className="text-lg font-bold text-slate-900">Upload University ID Card</h3>
            <p className="text-xs text-slate-500">Ensure matric number, student photo, and expiry date are visible.</p>
          </div>

          <div
            onClick={() => idInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-slate-50 hover:bg-blue-50/20 transition-all text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <FileImage className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                {idPhoto ? idPhoto.name : 'Click to select or snap ID photo'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">JPEG or PNG up to 5MB</p>
            </div>
            <input
              ref={idInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleIdUpload}
            />
          </div>

          <Button
            size="lg"
            variant="primary"
            disabled={!idPhoto}
            onClick={handleNextStep}
            className="w-full font-bold text-xs"
          >
            Continue to Face Match <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      )}

      {/* ── STEP 2: FACE VERIFICATION ── */}
      {step === 2 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5 animate-fadeIn">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Step 2 of 3</span>
            <h3 className="text-lg font-bold text-slate-900">Live Face Verification</h3>
            <p className="text-xs text-slate-500">Take a clear live selfie to match your face with the student ID card.</p>
          </div>

          <div
            onClick={() => selfieInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-slate-50 hover:bg-emerald-50/20 transition-all text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                {selfiePhoto ? 'Photo captured! Tap to retake' : 'Open camera to take selfie'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Ensure good lighting and face camera directly</p>
            </div>
            <input
              ref={selfieInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handleSelfieUpload}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(1)} className="font-semibold text-xs">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
            <Button
              size="lg"
              variant="primary"
              disabled={!selfiePhoto}
              onClick={handleNextStep}
              className="flex-1 font-bold text-xs"
            >
              Continue to Honor Code <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: HONOR CODE & SUBMIT ── */}
      {step === 3 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5 animate-fadeIn">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Final Step</span>
            <h3 className="text-lg font-bold text-slate-900">Campus Runner Honor Code</h3>
            <p className="text-xs text-slate-500">Read and agree to the platform safety charter before activating.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-600 leading-relaxed">
            <p><strong>1. Prompt Execution:</strong> I agree to execute accepted errands promptly and honestly.</p>
            <p><strong>2. Escrow Compliance:</strong> I will never demand off-platform cash surcharges or bypass the delivery PIN system.</p>
            <p><strong>3. Zero Tolerance:</strong> Any theft, fraud, or harassment leads to an instant ban and referral to university security.</p>
          </div>

          <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-bold text-slate-900">
              I have read and solemnly agree to uphold the Campus Runner Honor Code.
            </span>
          </label>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(2)} className="font-semibold text-xs">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
            <Button
              size="lg"
              variant="primary"
              disabled={!agreedToTerms || isLoading}
              isLoading={isLoading}
              onClick={handleSubmitApplication}
              className="flex-1 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 shadow-sm"
            >
              Submit Application
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 4: SUCCESS / PENDING REVIEW ── */}
      {step === 4 && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 shadow-sm animate-scaleIn">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Application Submitted!</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Your student ID card and live face verification photos have been sent to our campus verification team. Approvals are typically processed in under 2 hours.
          </p>
          <Button onClick={() => router.push('/dashboard/user')} variant="primary" className="font-bold text-xs">
            Return to Dashboard
          </Button>
        </div>
      )}

    </div>
  );
}
