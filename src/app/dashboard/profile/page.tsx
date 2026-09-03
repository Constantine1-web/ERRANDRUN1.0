'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAppStore } from '@/lib/store';
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
    } catch {
      toast.error('Failed to sign out');
    }
  };

  // ── STRIPPED: Awaiting redesign ──
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Account Profile</h1>
      {loading ? <p>Loading profile...</p> : (
        <div>
          <h2>{profile?.full_name}</h2>
          <p>Role: {profile?.role}</p>
          <p>Status: {profile?.verification_status}</p>
          
          <p>Full Name: {profile?.full_name}</p>
          <p>Student Reg Number: {profile?.student_id}</p>
          <p>Phone Number: {profile?.phone_number}</p>
          
          {profile?.rating && (
            <p>Rating: {profile.rating.toFixed(1)} / 5.0</p>
          )}

          <button onClick={() => setEditing(true)}>Edit Details</button>
          <button onClick={handleLogout}>Sign Out</button>
        </div>
      )}

      {editing && (
        <div style={{ border: '1px solid black', padding: '20px', marginTop: '20px' }}>
          <h2>Edit Profile</h2>
          <div>
            <label>Full Name</label>
            <input value={formData.full_name || ''} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
          </div>
          <div>
            <label>Student ID</label>
            <input value={formData.student_id || ''} disabled />
          </div>
          <div>
            <label>Phone Number</label>
            <input value={formData.phone_number || ''} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} />
          </div>
          <div>
            <label>Bio</label>
            <textarea value={formData.bio || ''} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} />
          </div>
          <button onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
          <button onClick={() => { setEditing(false); setFormData(profile); }}>Cancel</button>
        </div>
      )}
    </div>
  );
}
