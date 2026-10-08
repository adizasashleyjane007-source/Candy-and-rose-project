'use client';

import { useEffect, useState } from 'react';
import { 
  User, Mail, Phone, Lock, Eye, EyeOff,
  CheckCircle2, AlertCircle, Plus, 
  ArrowRight, Camera, X
} from 'lucide-react';
import bcrypt from 'bcryptjs';
import SalonLayout from '@/components/salon-layout';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, profile, customer, refreshProfile } = useAuth();

  // Edit profile states
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [successMessage, setSuccessMessage] = useState('Profile updated successfully!');
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setEditName(profile?.full_name || profile?.name || user.email?.split('@')[0] || '');
      setEditPhone(profile?.phone || customer?.phone || '');
      setEditPhotoUrl(profile?.image_url || profile?.avatar_url || '');
    }
  }, [user, profile, customer]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaveBusy(true);
    setSaveSuccess(false);
    setSaveError('');

    try {
      if (editPassword && editPassword.length < 6) {
        setSaveError('Password must be at least 6 characters long.');
        setSaveBusy(false);
        return;
      }
      // Update profiles table
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: editName.trim(),
          phone: editPhone.trim() || null,
          image_url: editPhotoUrl.trim() || null,
          avatar_url: editPhotoUrl.trim() || null,
          updated_at: new Date().toISOString()
        });

      if (profileErr) throw new Error(profileErr.message);

      // Update customers table if exists
      let custId = customer?.id;
      if (!custId && user.email) {
        const { data: cust } = await supabase
          .from('customers')
          .select('id')
          .or(`user_id.eq.${user.id},email.ilike.${user.email.trim().toLowerCase()}`)
          .maybeSingle();
        custId = cust?.id;
      }

      if (custId) {
        let updatePayload: any = {
          name: editName.trim(),
          full_name: editName.trim(),
          phone: editPhone.trim() || null,
          user_id: user.id
        };

        if (editPassword) {
          updatePayload.password = bcrypt.hashSync(editPassword, 10);
        }

        await supabase
          .from('customers')
          .update(updatePayload)
          .eq('id', custId);
      }

      await refreshProfile();
      setSuccessMessage(editPassword ? 'Password updated successfully.' : 'Profile updated successfully!');
      if (editPassword) setPasswordUpdated(true);
      setSaveSuccess(true);
      setEditPassword('');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update profile details.');
    } finally {
      setSaveBusy(false);
    }
  };

  if (!user) {
    return (
      <SalonLayout>
        <main className="bg-zinc-50 min-h-[75vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl border border-zinc-200/80 p-8 text-center shadow-xl">
            <AlertCircle className="mx-auto text-pink-600 mb-4 animate-bounce" size={40} />
            <h2 className="font-serif text-2xl text-zinc-900 mb-2">Access Restrained</h2>
            <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
              Please sign in to your Candy & Rose account to review your profile, view appointment logs, or schedule new rituals.
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-auth'))}
              className="inline-flex items-center gap-2 rounded-full bg-pink-600 px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-pink-700 transition-colors shadow-md shadow-pink-600/20 active:scale-95"
            >
              Sign In Now <ArrowRight size={14} />
            </button>
          </div>
        </main>
      </SalonLayout>
    );
  }

  return (
    <SalonLayout>
      <main className="bg-zinc-50/50 min-h-screen py-16 px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          {/* HEADER SECTION */}
          <div className="mb-12 border-b border-zinc-200/60 pb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="font-serif text-[32px] font-normal text-zinc-950 leading-tight">
                Customer Profile
              </h1>
            </div>
            
            <div className="flex items-center gap-3 self-start md:self-center">
              <Link href="/history" className="inline-flex items-center gap-2.5 rounded-full bg-pink-600 hover:bg-pink-700 text-white px-7 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-md shadow-pink-600/20">
                 View History
              </Link>
            </div>
          </div>

          <div className="max-w-2xl mx-auto">
            {/* COLUMN 1: PROFILE EDIT */}
            <section className="bg-white rounded-3xl border border-zinc-200/80 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3.5 border-b border-zinc-100 pb-5 mb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-pink-50 text-pink-600 border border-pink-200/50 overflow-hidden shrink-0 shadow-sm">
                  {editPhotoUrl ? (
                    <img src={editPhotoUrl} alt="Profile Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <User size={22} />
                  )}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-zinc-900 leading-tight">
                    {profile?.full_name || profile?.name || 'Candy & Rose Guest'}
                    {passwordUpdated && (
                      <span className="ml-2 text-[10px] font-sans font-bold uppercase tracking-widest text-green-600">
                        • Password Updated
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium">Customer Member</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Profile Photo</label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <label className="flex items-center justify-center gap-2 cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-700 hover:bg-zinc-100 transition-colors font-medium shrink-0 w-max">
                      <Camera size={14} className="text-pink-600" />
                      <span>Choose File</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEditPhotoUrl(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Full Name *</label>
                  <div className="relative">
                    <input
                      required
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 py-3 text-xs text-zinc-800 outline-none focus:border-pink-500 transition-colors"
                    />
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <input
                      type="tel"
                      pattern="[0-9]{11}"
                      maxLength={11}
                      title="Must be exactly 11 digits"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 09123456789"
                      className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 py-3 text-xs text-zinc-800 outline-none focus:border-pink-500 transition-colors"
                    />
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Email (Permanent)</label>
                  <div className="flex items-center gap-2.5 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
                    <Mail size={14} />
                    <span>{user.email}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Update Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-10 py-3 text-xs text-zinc-800 outline-none focus:border-pink-500 transition-colors"
                    />
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {saveSuccess && (
                  <p className="rounded-lg bg-green-50 text-green-700 px-3 py-2 text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 size={13} /> {successMessage}
                  </p>
                )}

                {saveError && (
                  <p className="rounded-lg bg-red-50 text-red-700 px-3 py-2 text-xs font-semibold flex items-center gap-1.5">
                    <AlertCircle size={13} /> {saveError}
                  </p>
                )}

                <button
                  disabled={saveBusy}
                  type="submit"
                  className="w-full rounded-full bg-pink-600 text-white hover:bg-pink-700 py-3 text-xs font-bold uppercase tracking-widest transition-colors shadow disabled:opacity-60"
                >
                  {saveBusy ? 'Saving Changes...' : 'Save Profile Details'}
                </button>
              </form>
            </section>
          </div>
        </div>
      </main>
    </SalonLayout>
  );
}
