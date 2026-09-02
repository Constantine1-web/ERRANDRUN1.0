'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { User, Phone, BookOpen, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const { user, updateUserProfile, logout } = useAppStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfile(data);
        setFormData(data);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user?.id);

      if (error) throw error;

      setProfile(formData);
      updateUserProfile(formData);
      setEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      logout();
      router.push('/');
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-white mb-8">Profile Settings</h1>

      {loading ? (
        <div className="glass-card rounded-3xl p-8 animate-pulse">
          <div className="h-40 bg-white/10 rounded-lg mb-6" />
        </div>
      ) : (
        <motion.div
          className="glass-card rounded-3xl p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Profile Header */}
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{profile?.full_name}</h2>
              <p className="text-white/60">{profile?.role === 'runner' ? 'Runner' : 'Student'}</p>
            </div>
          </div>

          {/* Verification Status */}
          <div className="mb-6 pb-6 border-b border-white/10">
            <p className="text-white/60 text-sm mb-2">Verification Status</p>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  profile?.verification_status === 'verified' ? 'bg-green-500' : 'bg-yellow-500'
                }`}
              />
              <span className="text-white font-medium capitalize">{profile?.verification_status}</span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
              <User className="w-5 h-5 text-white/60" />
              <div className="flex-1 min-w-0">
                <p className="text-white/60 text-sm">Name</p>
                <p className="text-white font-medium truncate">{profile?.full_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
              <BookOpen className="w-5 h-5 text-white/60" />
              <div className="flex-1 min-w-0">
                <p className="text-white/60 text-sm">Student ID</p>
                <p className="text-white font-medium font-mono truncate">{profile?.student_id}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
              <Phone className="w-5 h-5 text-white/60" />
              <div className="flex-1 min-w-0">
                <p className="text-white/60 text-sm">Phone</p>
                <p className="text-white font-medium truncate">{profile?.phone_number}</p>
              </div>
            </div>

            {profile?.rating && (
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-yellow-500/20">
                <div className="text-2xl">⭐</div>
                <div className="flex-1">
                  <p className="text-white/60 text-sm">Rating</p>
                  <p className="text-white font-bold text-lg text-yellow-400">{profile.rating.toFixed(1)} <span className="text-white/40 text-sm font-normal">/ 5.0</span></p>
                </div>
              </div>
            )}

            <button onClick={() => setEditing(true)} className="btn-secondary w-full sm:w-auto mt-4 px-8">
              Edit Profile
            </button>
          </div>

          {editing && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto"
              >
                <button 
                  onClick={() => {
                    setEditing(false);
                    setFormData(profile);
                  }}
                  className="absolute top-6 right-6 text-white/40 hover:text-white"
                >
                  ✕
                </button>
                <h3 className="text-2xl font-bold text-white mb-6">Edit Profile</h3>
                
                <div className="space-y-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Student ID</label>
                    <input
                      type="text"
                      value={formData.student_id}
                      disabled
                      className="input w-full opacity-50 cursor-not-allowed font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Bio</label>
                    <textarea
                      value={formData.bio || ''}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      className="textarea w-full resize-none h-24"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
                    <button onClick={handleSave} className="btn-primary w-full sm:flex-1 justify-center">
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setFormData(profile);
                      }}
                      className="btn-secondary w-full sm:flex-1 justify-center"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-all border border-red-500/20"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </motion.div>
      )}
    </div>
  );
}

