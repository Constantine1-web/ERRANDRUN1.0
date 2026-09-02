'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import { User, Phone, BookOpen, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
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
    } catch {
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account Profile</h1>
        <p className="text-slate-500 text-xs mt-0.5">Manage your student credentials and personal settings.</p>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-slate-400 text-xs">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-2" />
          Loading profile...
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card className="shadow-sm">
            <CardContent className="p-6 sm:p-8">
              {/* Profile Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-2xl shadow-sm">
                  {profile?.full_name?.charAt(0) || <User className="w-8 h-8" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{profile?.full_name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={profile?.role === 'runner' ? 'success' : 'default'} className="text-[10px]">
                      {profile?.role === 'runner' ? 'Campus Runner' : 'Student Requester'}
                    </Badge>
                    <Badge variant={profile?.verification_status === 'verified' ? 'success' : 'warning'} className="text-[10px]">
                      {profile?.verification_status === 'verified' ? 'Verified Student' : 'Pending Verification'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Form Info Fields */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <User className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-400 text-[10px] font-semibold uppercase">Full Name</p>
                    <p className="text-slate-900 font-medium text-xs truncate">{profile?.full_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-400 text-[10px] font-semibold uppercase">Student Reg Number</p>
                    <p className="text-slate-900 font-medium font-mono text-xs truncate">{profile?.student_id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-400 text-[10px] font-semibold uppercase">Phone Number</p>
                    <p className="text-slate-900 font-medium text-xs truncate">{profile?.phone_number}</p>
                  </div>
                </div>

                {profile?.rating && (
                  <div className="flex items-center gap-3 p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-amber-500 text-lg">⭐</span>
                    <div className="flex-1">
                      <p className="text-amber-800 text-[10px] font-semibold uppercase">Campus Reputation</p>
                      <p className="text-amber-950 font-bold text-sm">{profile.rating.toFixed(1)} / 5.0 Rating</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={() => setEditing(true)} variant="primary" className="flex-1 font-bold text-xs">
                  Edit Details
                </Button>
                
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" /> Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Edit Modal */}
      {editing && (
        <Modal isOpen={editing} onClose={() => { setEditing(false); setFormData(profile); }} title="Edit Profile">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Full Name</label>
              <Input
                type="text"
                value={formData.full_name || ''}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Student ID</label>
              <Input
                type="text"
                value={formData.student_id || ''}
                disabled
                className="opacity-60 cursor-not-allowed font-mono bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Phone Number</label>
              <Input
                type="tel"
                value={formData.phone_number || ''}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Bio</label>
              <textarea
                value={formData.bio || ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Share your hostel, faculty, or course..."
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="flex gap-2.5 pt-4 border-t border-slate-100">
              <Button onClick={handleSave} variant="primary" className="flex-1 font-bold text-xs" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                onClick={() => {
                  setEditing(false);
                  setFormData(profile);
                }}
                variant="secondary"
                className="flex-1 text-xs"
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
