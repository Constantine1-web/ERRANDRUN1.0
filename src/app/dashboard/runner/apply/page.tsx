'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, FileImage, ShieldCheck, CheckCircle, ArrowRight, Info } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { RunnerLogo } from '@/components/RunnerLogo';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

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

  if (!user || user.verificationStatus !== 'verified') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6">
        <Card className="max-w-md w-full shadow-sm">
          <CardContent className="pt-8 pb-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-3">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Student Verification Required</h2>
            <p className="text-slate-500 mb-6 max-w-sm text-xs">
              You must verify your student profile before applying to join the campus runner network.
            </p>
            <Button onClick={() => router.push('/dashboard/verify')} variant="primary" className="w-full">
              Complete Student Verification
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
      <div className="text-center mb-8">
        <RunnerLogo className="w-12 h-12 mx-auto mb-2" animate={false} />
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Runner Verification</h1>
        <p className="text-slate-500 text-xs max-w-md mx-auto">
          We verify each runner's student ID and face match to maintain campus safety and trust.
        </p>
      </div>

      <Card className="shadow-md">
        <CardContent className="p-6 md:p-8">
          
          {/* Step Indicator */}
          <div className="flex justify-between mb-8 relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -z-10 -translate-y-1/2" />
            {['ID Card', 'Face Match', 'Submit'].map((label, index) => {
              const i = index + 1;
              const isActive = step === i;
              const isCompleted = step > i;
              return (
                <div key={i} className="flex flex-col items-center gap-1.5 bg-white px-2">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isActive ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-100' : 
                      isCompleted ? 'bg-green-600 text-white' : 
                      'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="w-4 h-4" /> : i}
                  </div>
                  <Badge variant={isActive ? 'info' : isCompleted ? 'success' : 'outline'} className="uppercase tracking-wider text-[9px]">
                    {label}
                  </Badge>
                </div>
              );
            })}
          </div>

          {/* Step 1: ID Card Upload */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="text-lg font-bold text-slate-900 mb-1">1. Upload Student ID</h3>
              <p className="text-xs text-slate-500 mb-4">Please upload a clear photo of your official University ID card.</p>
              
              <div 
                onClick={() => idInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-500 hover:bg-blue-50/20 transition-all bg-slate-50"
              >
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <FileImage className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-800">
                    {idPhoto ? idPhoto.name : 'Tap to upload ID photo'}
                  </p>
                  <p className="text-[11px] text-slate-400">JPEG or PNG up to 5MB</p>
                </div>
                <div className="hidden">
                  <Input 
                    ref={idInputRef}
                    type="file" 
                    accept="image/*" 
                    onChange={handleIdUpload}
                  />
                </div>
              </div>

              <Button onClick={handleNextStep} variant="primary" size="lg" className="w-full mt-6 font-bold">
                Continue to Face Match <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Live Selfie / Face Verification */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="text-lg font-bold text-slate-900 mb-1">2. Face Verification</h3>
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800">
                  Take a clear selfie. Our admin team will verify that your face matches the photo on your student ID.
                </p>
              </div>

              <div 
                onClick={() => selfieInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-green-500 hover:bg-green-50/20 transition-all bg-slate-50"
              >
                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center text-green-600 relative overflow-hidden">
                  {selfiePhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={URL.createObjectURL(selfiePhoto)} alt="Selfie preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-7 h-7" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-800">
                    {selfiePhoto ? 'Photo captured! Tap to retake' : 'Open Camera to take a selfie'}
                  </p>
                  <p className="text-[11px] text-slate-400">Ensure your face is well-lit</p>
                </div>
                <div className="hidden">
                  <Input 
                    ref={selfieInputRef}
                    type="file" 
                    accept="image/*" 
                    capture="user"
                    onChange={handleSelfieUpload}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button onClick={() => setStep(1)} variant="secondary" className="flex-1">Back</Button>
                <Button onClick={handleNextStep} variant="primary" className="flex-1 font-bold">
                  Continue <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="text-lg font-bold text-slate-900 mb-4">3. Submit Application</h3>
              
              <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                <input 
                  type="checkbox" 
                  id="agree_rules" 
                  required 
                  className="mt-0.5 h-4 w-4 rounded border-amber-400 text-blue-600 focus:ring-blue-500"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
                <label htmlFor="agree_rules" className="text-xs text-amber-900 leading-relaxed cursor-pointer">
                  <strong>Code of Conduct:</strong> I agree to execute accepted tasks honestly and respectfully. Any fraudulent behavior will lead to an immediate ban and reporting to university authorities.
                </label>
              </div>

              <div className="space-y-2.5 mb-6">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center gap-2.5">
                    <FileImage className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-slate-800">Student ID Card</span>
                  </div>
                  <span className="text-green-700 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Attached
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center gap-2.5">
                    <Camera className="w-4 h-4 text-green-600" />
                    <span className="font-bold text-slate-800">Face Match Photo</span>
                  </div>
                  <span className="text-green-700 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Attached
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setStep(2)} variant="secondary" className="flex-1">Back</Button>
                <Button 
                  onClick={handleSubmitApplication} 
                  variant="primary" 
                  className="flex-1 font-bold bg-green-600 hover:bg-green-700"
                  disabled={isLoading || !agreedToTerms}
                  isLoading={isLoading}
                >
                  Submit Application
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
              <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">Application Under Review</h3>
              <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
                Your runner application and KYC verification photos have been submitted. Our team will review and activate your account within 24 hours.
              </p>
              <Button onClick={() => router.push('/dashboard/user')} variant="primary" className="w-full">
                Return to Dashboard
              </Button>
            </motion.div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
