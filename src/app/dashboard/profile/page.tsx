'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { User, Phone, BookOpen, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

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
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-4xl font-bold text-white mb-2">Profile Settings</h1>

      {loading ? (
        <Card className="animate-pulse">
          <CardContent className="p-8">
            <div className="h-40 bg-white/10 rounded-lg mb-6" />
          </CardContent>
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card>
            <CardContent className="p-8">
              {/* Profile Header */}
              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center shadow-lg">
                  <User className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{profile?.full_name}</h2>
                  <Badge variant={profile?.role === 'runner' ? 'default' : 'secondary'} className="text-sm">
                    {profile?.role === 'runner' ? 'Runner' : 'Student'}
                  </Badge>
                </div>
              </div>

              {/* Verification Status */}
              <div className="mb-6 pb-6 border-b border-white/10">
                <p className="text-white/60 text-sm mb-3">Verification Status</p>
                <div className="flex items-center gap-3">
                  {profile?.verification_status === 'verified' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  )}
                  <span className="text-white font-medium capitalize text-lg">{profile?.verification_status}</span>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  <User className="w-5 h-5 text-brand-blue" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/60 text-sm mb-1">Name</p>
                    <p className="text-white font-medium truncate">{profile?.full_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  <BookOpen className="w-5 h-5 text-brand-blue" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/60 text-sm mb-1">Student ID</p>
                    <p className="text-white font-medium font-mono truncate">{profile?.student_id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  <Phone className="w-5 h-5 text-brand-blue" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/60 text-sm mb-1">Phone</p>
                    <p className="text-white font-medium truncate">{profile?.phone_number}</p>
                  </div>
                </div>

                {profile?.rating && (
                  <div className="flex items-center gap-4 p-4 bg-brand-yellow/10 rounded-xl border border-brand-yellow/20">
                    <div className="text-2xl">⭐</div>
                    <div className="flex-1">
                      <p className="text-white/60 text-sm mb-1">Rating</p>
                      <p className="text-white font-bold text-lg text-brand-yellow">{profile.rating.toFixed(1)} <span className="text-white/40 text-sm font-normal">/ 5.0</span></p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button onClick={() => setEditing(true)} variant="secondary" className="w-full sm:w-auto px-8">
                  Edit Profile
                </Button>
                
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full sm:w-auto px-8 text-red-400 border-red-500/20 hover:bg-red-500/10"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {editing && (
        <Modal isOpen={editing} onClose={() => { setEditing(false); setFormData(profile); }} title="Edit Profile">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Full Name</label>
              <Input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Student ID</label>
              <Input
                type="text"
                value={formData.student_id}
                disabled
                className="w-full opacity-50 cursor-not-allowed font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Phone Number</label>
              <Input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Bio</label>
              <textarea
                value={formData.bio || ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                className="textarea w-full resize-none h-24 bg-dark-surface border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-white/10">
              <Button onClick={handleSave} className="w-full sm:flex-1 justify-center" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                onClick={() => {
                  setEditing(false);
                  setFormData(profile);
                }}
                variant="secondary"
                className="w-full sm:flex-1 justify-center"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
