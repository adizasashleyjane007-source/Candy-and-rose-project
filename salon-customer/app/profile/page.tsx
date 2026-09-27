'use client';

import { useEffect, useState } from 'react';
import { 
  User, Mail, Phone, Calendar, Clock, Scissors, 
  Sparkles, CheckCircle2, XCircle, AlertCircle, Plus, 
  ArrowRight, Trash2, ShieldCheck, Heart, Camera 
} from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { useAuth } from '@/lib/auth-context';
import { supabase, type Appointment } from '@/lib/supabase';

export default function ProfilePage() {
  const { user, profile, customer, refreshProfile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  // Edit profile states
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Cancel appointment states
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadAppointments = async () => {
    if (!user) return;
    setLoadingAppts(true);
    try {
      // Find customer record by email
      const { data: cust } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      let query = supabase.from('appointments').select('*');
      if (cust?.id) {
        query = query.or(`customer_id.eq.${cust.id},customer_name.eq.${profile?.full_name || user.email?.split('@')[0]}`);
      } else {
        query = query.eq('customer_name', profile?.full_name || user.email?.split('@')[0]);
      }

      const { data } = await query.order('created_at', { ascending: false });
      if (data) {
        setAppointments(data as Appointment[]);
      }
    } catch (e) {
      console.error('Failed to load appointments:', e);
    } finally {
      setLoadingAppts(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAppointments();
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
        await supabase
          .from('customers')
          .update({
            name: editName.trim(),
            full_name: editName.trim(),
            phone: editPhone.trim() || null,
            user_id: user.id
          })
          .eq('id', custId);
      }

      await refreshProfile();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update profile details.');
    } finally {
      setSaveBusy(false);
    }
  };

  const handleCancelAppointment = async (apptId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment? This action cannot be undone.')) return;
    setCancellingId(apptId);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'Cancelled' })
        .eq('id', apptId);

      if (error) throw new Error(error.message);
      
      // Update locally
      setAppointments((cur) =>
        cur.map((a) => (a.id === apptId ? { ...a, status: 'Cancelled' } : a))
      );
    } catch (err) {
      alert('Failed to cancel appointment. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  const upcomingAppts = appointments.filter(
    (a) => a.status === 'Pending' || a.status === 'Scheduled'
  );
  
  const pastAppts = appointments.filter(
    (a) => a.status === 'Completed' || a.status === 'Cancelled'
  );

  const shownAppts = activeTab === 'upcoming' ? upcomingAppts : pastAppts;

  const launchBooking = () => {
    window.location.href = '/services';
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
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-pink-700 border border-pink-200/40">
                <Sparkles size={11} className="text-pink-600" /> Welcome back
              </span>
              <h1 className="font-serif text-3xl sm:text-5xl font-medium text-zinc-950 mt-4 leading-tight">
                Your Sanctuary <span className="font-serif italic text-pink-600 font-normal">Dashboard</span>
              </h1>
            </div>
            
            <button
              onClick={launchBooking}
              className="inline-flex items-center gap-2.5 rounded-full bg-pink-600 hover:bg-pink-700 text-white px-7 py-4 text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-md shadow-pink-600/20 self-start md:self-center"
            >
              <Plus size={15} /> Select Services & Book
            </button>
          </div>

          <div className="grid gap-10 lg:grid-cols-[1fr_2fr] items-start">
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
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium">Customer Member</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Email (Permanent)</label>
                  <div className="flex items-center gap-2.5 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
                    <Mail size={14} />
                    <span>{user.email}</span>
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
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Profile Photo</label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <label className="flex items-center justify-center gap-2 cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-700 hover:bg-zinc-100 transition-colors font-medium shrink-0">
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
                    <input
                      type="url"
                      value={editPhotoUrl}
                      onChange={(e) => setEditPhotoUrl(e.target.value)}
                      placeholder="Or paste photo URL..."
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-800 outline-none focus:border-pink-500 transition-colors"
                    />
                  </div>
                </div>

                {saveSuccess && (
                  <p className="rounded-lg bg-green-50 text-green-700 px-3 py-2 text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 size={13} /> Profile updated successfully!
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

            {/* COLUMN 2: APPOINTMENT LOGS */}
            <section className="bg-white rounded-3xl border border-zinc-200/80 p-6 sm:p-8 shadow-sm flex flex-col justify-between min-h-[500px]">
              <div>
                {/* Tabs Switcher */}
                <div className="flex gap-4 border-b border-zinc-100 pb-4 mb-6">
                  <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-colors relative ${
                      activeTab === 'upcoming' ? 'text-pink-600' : 'text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    Upcoming Bookings ({upcomingAppts.length})
                    {activeTab === 'upcoming' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-600 rounded-full" />
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab('past')}
                    className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-colors relative ${
                      activeTab === 'past' ? 'text-pink-600' : 'text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    Past Appointments ({pastAppts.length})
                    {activeTab === 'past' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-600 rounded-full" />
                    )}
                  </button>
                </div>

                {/* List container */}
                {loadingAppts ? (
                  <div className="py-20 text-center text-zinc-400 text-xs">
                    <Sparkles className="animate-spin mx-auto text-pink-500 mb-3" size={24} />
                    Loading appointment records...
                  </div>
                ) : shownAppts.length > 0 ? (
                  <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
                    {shownAppts.map((appt) => (
                      <div 
                        key={appt.id}
                        className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:border-pink-100 transition-colors"
                      >
                        <div className="space-y-2">
                          {/* Badge Status */}
                          <div className="flex items-center gap-2.5">
                            <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                              appt.status === 'Scheduled' || appt.status === 'Completed'
                                ? 'bg-green-50 text-green-700 border border-green-200/50'
                                : appt.status === 'Cancelled'
                                ? 'bg-red-50 text-red-700 border border-red-200/50'
                                : 'bg-amber-50 text-amber-700 border border-amber-200/50'
                            }`}>
                              {appt.status}
                            </span>
                            {appt.payment_method && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-zinc-200 text-zinc-500 uppercase">
                                {appt.payment_method}
                              </span>
                            )}
                          </div>

                          <h4 className="font-serif text-lg font-semibold text-zinc-900 leading-tight">
                            {appt.service_name || 'Signature Ritual'}
                          </h4>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Calendar size={13} className="text-pink-500" />
                              {appt.appointment_date || appt.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={13} className="text-pink-500" />
                              {appt.appointment_time || appt.time}
                            </span>
                            {appt.staff_name && (
                              <span className="flex items-center gap-1">
                                <Scissors size={13} className="text-pink-500" />
                                Stylist: {appt.staff_name}
                              </span>
                            )}
                          </div>

                          {appt.notes && (
                            <p className="text-[11px] leading-relaxed text-zinc-400 italic mt-2">
                              Note: &ldquo;{appt.notes}&rdquo;
                            </p>
                          )}
                        </div>

                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 border-t sm:border-t-0 border-zinc-100 pt-3 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Price Paid</span>
                            <span className="font-serif text-xl font-bold text-zinc-950">₱{Number(appt.price || 0).toLocaleString()}</span>
                          </div>

                          {/* Cancellation Button */}
                          {activeTab === 'upcoming' && appt.status !== 'Cancelled' && (
                            <button
                              disabled={cancellingId === appt.id}
                              onClick={() => handleCancelAppointment(appt.id!)}
                              className="inline-flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-red-600 transition-colors border border-zinc-200 hover:border-red-200 bg-white px-4 py-2 rounded-full shadow-sm hover:shadow-red-50/50"
                            >
                              <Trash2 size={12} /> {cancellingId === appt.id ? 'Cancelling...' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-zinc-400">
                    <Calendar size={32} className="mx-auto text-zinc-300 mb-3" />
                    <p className="text-xs">No {activeTab} appointments found.</p>
                  </div>
                )}
              </div>

              {/* Quick Book Callout */}
              <div className="mt-8 rounded-2xl bg-pink-50/40 border border-pink-100/30 p-5 text-center">
                <h4 className="font-serif text-base font-semibold text-zinc-900">Schedule your next visit</h4>
                <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed max-w-sm mx-auto">
                  Browse our packages or separate services menus and book appointments with your favorite styling specialists.
                </p>
                <button
                  onClick={launchBooking}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-zinc-950 text-white hover:bg-pink-600 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors shadow active:scale-95"
                >
                  Book New Appointment <ArrowRight size={13} />
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </SalonLayout>
  );
}
