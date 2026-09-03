'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import {
  User,
  ShieldCheck,
  Star,
  Phone,
  Mail,
  GraduationCap,
  Edit3,
  LogOut,
  CheckCircle2,
  AlertCircle,
  X,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

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
        .update({
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          bio: formData.bio,
        })
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

  const isVerified = profile?.verification_status === 'verified';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-8 animate-fadeIn">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Student Identity
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Campus Student Passport
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Your university identity, matric credentials, and campus trust score.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => setEditing(true)}
            className="text-xs font-bold gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
            Edit Profile
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={handleLogout}
            className="text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" />
            Sign Out
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-xs text-slate-400 animate-pulse">
          Retrieving student passport…
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── DIGITAL PASSPORT CARD ── */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/80 relative overflow-hidden space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-blue-400" />
                <span className="text-xs font-mono font-bold tracking-widest text-blue-300 uppercase">
                  University Student Passport
                </span>
              </div>
              <Badge
                variant={isVerified ? 'success' : 'warning'}
                className="text-[10px] font-black uppercase tracking-wider"
              >
                {isVerified ? 'Verified Student' : 'Unverified / Pending'}
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-6 pt-2">
              <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md text-white font-black text-2xl flex items-center justify-center border-2 border-white/20 shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  profile?.full_name?.charAt(0) || <User className="w-8 h-8" />
                )}
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <h2 className="text-2xl font-black text-white truncate">
                  {profile?.full_name || 'Campus Student'}
                </h2>
                <div className="flex items-center gap-2 text-xs font-mono text-blue-200">
                  <span>Matric: {profile?.student_id || 'Not Set'}</span>
                  <span>•</span>
                  <span className="capitalize">{profile?.role || 'user'} Account</span>
                </div>
                {profile?.rating ? (
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold pt-1">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{profile.rating.toFixed(1)}</span>
                    <span className="text-slate-400 font-normal">
                      ({profile.total_errands || 0} errands executed)
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {profile?.bio && (
              <p className="text-xs text-slate-300 bg-white/5 p-4 rounded-2xl border border-white/10 leading-relaxed">
                "{profile.bio}"
              </p>
            )}
          </div>

          {/* ── CREDENTIALS & ACCOUNT INFO ── */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Verified Contact & Matric Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" /> Email Address
                </span>
                <p className="font-semibold text-slate-900 text-sm">{user?.email || 'N/A'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" /> Phone Number
                </span>
                <p className="font-semibold text-slate-900 text-sm">{profile?.phone_number || 'Not provided'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-purple-600" /> University Reg Number
                </span>
                <p className="font-mono font-bold text-slate-900 text-sm">{profile?.student_id || 'N/A'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Verification Status
                </span>
                <p className="font-bold text-slate-900 text-sm capitalize">
                  {profile?.verification_status || 'unverified'}
                </p>
              </div>
            </div>

            {!isVerified && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-900">
                    Your student ID has not been verified yet. Complete verification to unlock runner mode and higher limits.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => router.push('/dashboard/verify')}
                  className="font-bold text-xs shrink-0"
                >
                  Verify Now
                </Button>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── EDIT PROFILE MODAL ── */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Edit Student Details</h3>
              <button onClick={() => setEditing(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name || ''}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider">Matriculation Number</label>
                <input
                  type="text"
                  value={formData.student_id || ''}
                  disabled
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed font-mono"
                />
                <span className="text-[10px] text-slate-400">Reg number cannot be altered once verified</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone_number || ''}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider">Campus Bio</label>
                <textarea
                  rows={3}
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell students which faculty you're in or what times you're active..."
                  className="w-full p-3.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditing(false)} className="flex-1 font-semibold text-xs">
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} isLoading={loading} className="flex-1 font-bold text-xs">
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
