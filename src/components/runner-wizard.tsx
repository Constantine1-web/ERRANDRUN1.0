'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';
import type { TransportMethod, RunnerAppStatus } from '@/types';
import { ChevronRight, Upload, CheckCircle } from 'lucide-react';

interface RunnerWizardProps {
  userId: string;
  onComplete?: () => void;
}

export function RunnerWizard({ userId, onComplete }: RunnerWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Academic Verification
  const [studentId, setStudentId] = useState('');
  const [regNumber, setRegNumber] = useState('');

  // Step 2: Logistics
  const [transportMethod, setTransportMethod] = useState<TransportMethod>('foot');
  const [availabilitySchedule, setAvailabilitySchedule] = useState<Record<string, string[]>>({
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
  });

  // Step 3: Document Upload
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentUrl, setDocumentUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const timeSlots = ['9AM', '12PM', '3PM', '6PM', '9PM'];
  const transportOptions: { value: TransportMethod; label: string; icon: string }[] = [
    { value: 'foot', label: 'On Foot', icon: '🚶' },
    { value: 'bicycle', label: 'Bicycle', icon: '🚴' },
    { value: 'shuttle', label: 'Campus Shuttle', icon: '🚐' },
    { value: 'motorcycle', label: 'Motorcycle', icon: '🏍️' },
  ];

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setDocumentFile(file);

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('verification_docs')
        .upload(fileName, file);

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from('verification_docs').getPublicUrl(fileName);

      setDocumentUrl(publicUrl);
      toast.success('Document uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (!studentId || !regNumber) {
        toast.error('Please fill in all academic verification fields');
        return;
      }

      if (!documentUrl) {
        toast.error('Please upload a verification document');
        return;
      }

      const { error } = await supabase.from('runner_apps').insert([
        {
          user_id: userId,
          reg_number: regNumber,
          campus_record_checked: false,
          transport_method: transportMethod,
          availability_schedule: availabilitySchedule,
          document_proof_url: documentUrl,
          status: 'pending' as RunnerAppStatus,
        },
      ]);

      if (error) throw error;

      toast.success('Application submitted! Awaiting admin review.');
      onComplete?.();
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  const toggleTimeSlot = (day: string, time: string) => {
    setAvailabilitySchedule((prev) => ({
      ...prev,
      [day]: prev[day].includes(time) ? prev[day].filter((t) => t !== time) : [...prev[day], time],
    }));
  };

  return (
    <div className="min-h-screen bg-dark-base pt-6 pb-32 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Become a Runner</h1>
          <p className="text-white/60">Complete these steps to join our network of campus runners</p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8 flex gap-2">
          {[1, 2, 3].map((s) => (
            <motion.div
              key={s}
              className={`h-2 flex-1 rounded-full ${
                s <= step ? 'bg-gradient-to-r from-primary-500 to-accent-purple' : 'bg-white/10'
              }`}
              layoutId={`progress-${s}`}
            />
          ))}
        </div>

        {/* Steps Container */}
        <AnimatePresence mode="wait">
          {/* Step 1: Academic Verification */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card rounded-3xl p-8 mb-6"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Academic Verification</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Student ID</label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g., UI/2023/001234"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Registration Number</label>
                  <input
                    type="text"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    placeholder="e.g., REG12345"
                    className="input-field"
                  />
                </div>

                <p className="text-sm text-white/60 pt-4">
                  🔒 Your academic information is verified with your institution's database and kept confidential.
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 2: Logistics & Capabilities */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card rounded-3xl p-8 mb-6"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Your Logistics</h2>

              {/* Transport Method */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-white/80 mb-4">How do you move around campus?</label>
                <div className="grid grid-cols-2 gap-3">
                  {transportOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTransportMethod(option.value)}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 text-center ${
                        transportMethod === option.value
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <span className="text-2xl block mb-2">{option.icon}</span>
                      <span className="text-sm font-medium text-white">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability Schedule */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-4">When are you available?</label>
                <div className="space-y-3">
                  {days.map((day) => (
                    <div key={day} className="bg-white/5 rounded-lg p-4">
                      <p className="text-sm font-medium text-white mb-3 capitalize">{day}</p>
                      <div className="flex flex-wrap gap-2">
                        {timeSlots.map((time) => (
                          <button
                            key={`${day}-${time}`}
                            onClick={() => toggleTimeSlot(day, time)}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                              availabilitySchedule[day]?.includes(time)
                                ? 'bg-primary-500 text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Document Upload */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card rounded-3xl p-8 mb-6"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Verification Document</h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-white/80 mb-4">
                  Upload Your Student ID or School Verification Document
                </label>

                {documentUrl ? (
                  <div className="p-6 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                    <div>
                      <p className="text-white font-medium">Document uploaded successfully</p>
                      <p className="text-sm text-white/60">{documentFile?.name}</p>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-primary-500/50 transition-colors cursor-pointer relative">
                    <input
                      type="file"
                      onChange={handleDocumentUpload}
                      disabled={uploading}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept="image/*,.pdf"
                    />
                    <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
                    <p className="text-white font-medium mb-1">
                      {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-sm text-white/60">PNG, JPG, or PDF (Max 5MB)</p>
                  </div>
                )}
              </div>

              <p className="text-sm text-white/60">
                ✅ We verify your documents to ensure safety and trust. Your information remains confidential.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-4 rounded-xl border border-white/10 text-white font-medium transition-all duration-200 hover:bg-white/5 active:scale-95"
            >
              Back
            </button>
          )}

          <button
            onClick={() => {
              if (step === 1 && (!studentId || !regNumber)) {
                toast.error('Please fill in all fields');
                return;
              }
              if (step < 3) {
                setStep(step + 1);
              } else {
                handleSubmit();
              }
            }}
            disabled={loading || uploading}
            className="flex-1 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-accent-purple text-white font-medium transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Submitting...' : step === 3 ? 'Submit Application' : 'Continue'}
            {!loading && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
